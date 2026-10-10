import { db } from '../db';
import { rooms, roomMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateRoomCode } from '../utils/room-code';
import { Server } from 'socket.io';
import { 
  RoomState, TableState, RoomMember, PlayerPosition, 
  ROOM_EMPTY_TIMEOUT_MS, MAX_ROOM_MEMBERS, 
  TABLES_PER_ROOM, SEAT_RESERVATION_MS, ServerToClientEvents,
  ClientToServerEvents, AvatarPreset
} from '@connecta-focus/shared';
import { getTableState, cleanUpSeat } from '../tables/manager';
import { endSessionForUser, getActiveSession, onUserLeaveRoom } from '../sessions/manager';
import { getChatHistory } from '../chat/manager';

export interface ActiveMember {
  userId: string;
  socketId: string | null;
  nickname: string;
  avatarPreset: AvatarPreset;
  position: PlayerPosition;
  isRoomOwner: boolean;
  joinedAt: Date;
  disconnectTimer?: NodeJS.Timeout;
}

export interface ActiveRoom {
  roomId: string;
  roomCode: string;
  ownerId: string;
  members: Map<string, ActiveMember>;
  bannedUsers: Set<string>;
  emptyTimer?: NodeJS.Timeout;
}

export const activeRooms = new Map<string, ActiveRoom>();
export const userRoomMap = new Map<string, string>();

export class RoomManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  async createRoom(ownerId: string): Promise<string> {
    const roomCode = generateRoomCode();
    const [inserted] = await db.insert(rooms).values({
      code: roomCode,
      ownerId
    }).returning({ id: rooms.id });
    
    activeRooms.set(roomCode, {
      roomId: inserted.id,
      roomCode,
      ownerId,
      members: new Map(),
      bannedUsers: new Set()
    });
    
    return roomCode;
  }

  async joinRoom(userId: string, socketId: string, roomCode: string, user: { nickname: string; avatarPreset: AvatarPreset }) {
    const room = activeRooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.bannedUsers.has(userId)) throw new Error('You are banned from this room');
    
    const existing = room.members.get(userId);
    if (!existing && room.members.size >= MAX_ROOM_MEMBERS) {
      throw new Error('Room is full');
    }

    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer);
      room.emptyTimer = undefined;
    }

    if (existing) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = undefined;
      }
      existing.socketId = socketId;
      existing.nickname = user.nickname;
      existing.avatarPreset = user.avatarPreset;
    } else {
      room.members.set(userId, {
        userId,
        socketId,
        nickname: user.nickname,
        avatarPreset: user.avatarPreset,
        position: { x: 0, y: 0, direction: 'down', isMoving: false },
        isRoomOwner: room.members.size === 0 ? true : (room.ownerId === userId),
        joinedAt: new Date()
      });
      await db.insert(roomMembers).values({ roomId: room.roomId, userId });
    }

    userRoomMap.set(userId, roomCode);
    
    if (!existing) {
       this.io.to(roomCode).emit('room:member_joined', this.buildRoomMember(room.members.get(userId)!, roomCode));
    }
  }

  async leaveRoom(userId: string) {
    const roomCode = userRoomMap.get(userId);
    if (!roomCode) return;
    const room = activeRooms.get(roomCode);
    if (!room) return;

    const member = room.members.get(userId);
    if (!member) return;

    if (member.disconnectTimer) clearTimeout(member.disconnectTimer);
    
    await db.update(roomMembers)
      .set({ leftAt: new Date(), leaveReason: 'left' })
      .where(and(eq(roomMembers.roomId, room.roomId), eq(roomMembers.userId, userId)));

    cleanUpSeat(roomCode, userId, this.io);
    await onUserLeaveRoom(userId, roomCode, this.io, 'left_room');

    room.members.delete(userId);
    userRoomMap.delete(userId);
    
    this.io.to(roomCode).emit('room:member_left', { userId, reason: 'left' });
    
    if (room.members.size === 0) {
      this.startEmptyTimer(room);
    } else if (member.isRoomOwner) {
      this.transferOwner(room);
    }
  }

  async kickMember(roomCode: string, ownerId: string, targetId: string) {
    const room = activeRooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    const owner = room.members.get(ownerId);
    if (!owner || !owner.isRoomOwner) throw new Error('Not room owner');
    
    room.bannedUsers.add(targetId);
    
    await db.update(roomMembers)
      .set({ leftAt: new Date(), leaveReason: 'kicked', isBanned: true })
      .where(and(eq(roomMembers.roomId, room.roomId), eq(roomMembers.userId, targetId)));

    cleanUpSeat(roomCode, targetId, this.io);
    await onUserLeaveRoom(targetId, roomCode, this.io, 'kicked');

    room.members.delete(targetId);
    userRoomMap.delete(targetId);
    
    this.io.to(roomCode).emit('room:member_left', { userId: targetId, reason: 'kicked' });
  }

  async closeRoom(roomCode: string, reason: 'owner_closed' | 'empty_timeout') {
    const room = activeRooms.get(roomCode);
    if (!room) return;

    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    
    for (const userId of room.members.keys()) {
      await onUserLeaveRoom(userId, roomCode, this.io, 'room_closed');
      userRoomMap.delete(userId);
      await db.update(roomMembers)
        .set({ leftAt: new Date(), leaveReason: reason })
        .where(and(eq(roomMembers.roomId, room.roomId), eq(roomMembers.userId, userId)));
    }
    
    await db.update(rooms).set({ closedAt: new Date(), closeReason: reason }).where(eq(rooms.id, room.roomId));
    
    this.io.to(roomCode).emit('room:closed', { reason });
    this.io.in(roomCode).socketsLeave(roomCode);
    activeRooms.delete(roomCode);
  }
  
  handleDisconnect(userId: string) {
    const roomCode = userRoomMap.get(userId);
    if (!roomCode) return;
    const room = activeRooms.get(roomCode);
    if (!room) return;
    const member = room.members.get(userId);
    if (!member) return;

    member.socketId = null;
    member.disconnectTimer = setTimeout(() => {
      cleanUpSeat(roomCode, userId, this.io);
      member.position = { x: 0, y: 0, direction: 'down', isMoving: false };
      this.io.to(roomCode).emit('room:member_moved', { userId, position: member.position });
    }, SEAT_RESERVATION_MS);
  }

  handleReconnect(userId: string, socketId: string, roomCode: string, user: { nickname: string; avatarPreset: AvatarPreset }) {
    const room = activeRooms.get(roomCode);
    if (!room) return;
    const existing = room.members.get(userId);
    if (existing) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = undefined;
      }
      existing.socketId = socketId;
      existing.nickname = user.nickname;
      existing.avatarPreset = user.avatarPreset;
    }
  }

  private transferOwner(room: ActiveRoom) {
    let longest: ActiveMember | null = null;
    for (const m of room.members.values()) {
      if (!longest || m.joinedAt < longest.joinedAt) longest = m;
    }
    if (longest) {
      longest.isRoomOwner = true;
      room.ownerId = longest.userId;
      this.io.to(room.roomCode).emit('room:owner_changed', { newOwnerId: longest.userId });
    }
  }

  private startEmptyTimer(room: ActiveRoom) {
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    room.emptyTimer = setTimeout(() => {
      this.closeRoom(room.roomCode, 'empty_timeout').catch(console.error);
    }, ROOM_EMPTY_TIMEOUT_MS);
  }

  getRoomState(roomCode: string, requestingUserId: string): RoomState {
    const room = activeRooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    
    const tables: TableState[] = [];
    for (let i = 0; i < TABLES_PER_ROOM; i++) {
      tables.push(getTableState(roomCode, i, requestingUserId));
    }
    
    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      ownerId: room.ownerId,
      members: Array.from(room.members.values()).map(m => this.buildRoomMember(m, roomCode)),
      tables,
      chatMessages: getChatHistory(room.roomId)
    };
  }

  private buildRoomMember(m: ActiveMember, roomCode: string): RoomMember {
    const activeSession = getActiveSession(m.userId);
    let seatInfo = null;
    for (let i = 0; i < TABLES_PER_ROOM; i++) {
      const ts = getTableState(roomCode, i, m.userId);
      const seat = ts.seats.find(s => s.userId === m.userId);
      if (seat) {
        seatInfo = { tableIndex: i, seatIndex: seat.seatIndex };
        break;
      }
    }

    return {
      userId: m.userId,
      nickname: m.nickname,
      avatarPreset: m.avatarPreset,
      position: m.position,
      seatInfo,
      sessionStatus: activeSession ? activeSession.status : null,
      isRoomOwner: m.isRoomOwner,
      joinedAt: m.joinedAt
    };
  }
}

export let roomManagerInstance: RoomManager;

export function initRoomManager(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  roomManagerInstance = new RoomManager(io);
  return roomManagerInstance;
}

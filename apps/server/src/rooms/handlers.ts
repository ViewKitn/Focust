import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, MOVEMENT_THROTTLE_MS } from '@connecta-focus/shared';
import { roomManagerInstance, userRoomMap, activeRooms } from './manager';

const movementThrottle = new Map<string, number>();

export function registerRoomHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on('room:create', async (cb) => {
    try {
      const roomCode = await roomManagerInstance.createRoom(socket.data.userId);
      cb({ ok: true, roomCode });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('room:join', async (data, cb) => {
    try {
      if (typeof data === 'string') {
        data = { roomCode: data };
      }
      
      const prevRoom = userRoomMap.get(socket.data.userId);
      if (prevRoom && prevRoom !== data.roomCode) {
        await roomManagerInstance.leaveRoom(socket.data.userId);
        socket.leave(prevRoom);
      }

      await roomManagerInstance.joinRoom(
        socket.data.userId,
        socket.id,
        data.roomCode,
        { nickname: socket.data.nickname, avatarPreset: socket.data.avatarPreset }
      );
      
      socket.join(data.roomCode);
      const state = roomManagerInstance.getRoomState(data.roomCode, socket.data.userId);
      cb({ ok: true, room: state });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('room:leave', async () => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (roomCode) {
        await roomManagerInstance.leaveRoom(socket.data.userId);
        socket.leave(roomCode);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('room:kick', async (data, cb) => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (!roomCode) throw new Error('Not in a room');
      await roomManagerInstance.kickMember(roomCode, socket.data.userId, data.userId);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('room:close', async (cb) => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (!roomCode) throw new Error('Not in a room');
      const room = activeRooms.get(roomCode);
      if (!room || room.ownerId !== socket.data.userId) throw new Error('Not room owner');
      
      await roomManagerInstance.closeRoom(roomCode, 'owner_closed');
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('player:move', (position) => {
    const userId = socket.data.userId;
    const roomCode = userRoomMap.get(userId);
    if (!roomCode) return;
    
    const now = Date.now();
    const lastMove = movementThrottle.get(userId) || 0;
    if (now - lastMove < MOVEMENT_THROTTLE_MS) return;
    movementThrottle.set(userId, now);

    const room = activeRooms.get(roomCode);
    if (!room) return;
    const member = room.members.get(userId);
    if (!member) return;

    member.position = position;
    socket.to(roomCode).emit('room:member_moved', { userId, position });
  });
}

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { handleConnection } from './connection';
import { userRoomMap, roomManagerInstance } from '../rooms/manager';

const userSocketMap = new Map<string, string>(); // userId -> socketId

export function setupSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
      
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
      if (!user) return next(new Error('User not found'));

      socket.data.userId = user.id;
      socket.data.nickname = user.nickname;
      socket.data.avatarPreset = user.avatarPreset;
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const userId = socket.data.userId;
    
    // Multi-tab handling
    const existingSocketId = userSocketMap.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        oldSocket.emit('auth:tab_replaced', { reason: 'Logged in from another tab' });
        oldSocket.disconnect(true);
      }
    }
    userSocketMap.set(userId, socket.id);
    
    // Room reconnection on new tab
    const existingRoom = userRoomMap.get(userId);
    if (existingRoom) {
      // Re-join socket room
      socket.join(existingRoom);
      
      // Update socket id in room manager if possible
      if (roomManagerInstance) {
        roomManagerInstance.handleReconnect(userId, socket.id, existingRoom, {
          nickname: socket.data.nickname,
          avatarPreset: socket.data.avatarPreset
        });
      }
    }

    handleConnection(io, socket);

    socket.on('disconnect', () => {
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId);
        if (roomManagerInstance) {
          roomManagerInstance.handleDisconnect(userId);
        }
      }
    });
  });
}

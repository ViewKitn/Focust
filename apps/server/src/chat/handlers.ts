import { Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { addMessage } from './manager';
import { userRoomMap, activeRooms } from '../rooms/manager';

export function registerChatHandlers(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  socket.on('chat:send', (data, cb) => {
    try {
      const userId = socket.data.userId;
      const roomCode = userRoomMap.get(userId);
      if (!roomCode) {
        return cb({ ok: false, error: 'Not in a room' });
      }

      const room = activeRooms.get(roomCode);
      if (!room) {
        return cb({ ok: false, error: 'Room not found' });
      }
      
      const member = room.members.get(userId);
      if (!member) {
        return cb({ ok: false, error: 'Not a room member' });
      }

      const msg = addMessage(room.roomId, userId, member.nickname, data.text);
      
      socket.to(roomCode).emit('chat:message', msg);
      
      // Also send back to sender if they want to append locally, or just rely on cb.
      // Usually, broadcast involves emitting to everyone including sender via io.to(roomCode) or just letting client add it from cb.
      socket.emit('chat:message', msg);

      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });
}

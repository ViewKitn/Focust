import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { sitDown, standUp } from './manager';
import { userRoomMap } from '../rooms/manager';

export function registerTableHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on('table:sit', (data, cb) => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (!roomCode) throw new Error('Not in a room');
      
      sitDown(roomCode, data.tableIndex, data.seatIndex, socket.data.userId, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('table:stand', async (cb) => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (!roomCode) throw new Error('Not in a room');
      
      await standUp(roomCode, socket.data.userId, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });
}

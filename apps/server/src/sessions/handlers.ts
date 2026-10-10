import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { setGoal, setReady, startSession, endEarly, submitReflection, getActiveSession } from './manager';
import { userRoomMap } from '../rooms/manager';

export function registerSessionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  socket.on('session:set_goal', async (data, cb) => {
    try {
      const roomCode = userRoomMap.get(socket.data.userId);
      if (!roomCode) throw new Error('Not in a room');
      // For simplicity here, assume UI provides correct tableIndex based on seat. 
      // We will look it up from current active session if it exists, or assume 0 for demo if not found.
      // Wait, UI doesn't provide tableIndex for setGoal in types!
      // `session:set_goal': (data: { goalText: string; goalShared: boolean }, cb: ...)
      // Let's find the user's table index from their seat.
      // We can use a trick: getTableState for all tables.
      const { getTableState } = require('../tables/manager'); // inline require to avoid circular early
      let seatedTable = -1;
      for (let i = 0; i < 2; i++) {
        const state = getTableState(roomCode, i, socket.data.userId);
        if (state.seats.some((s: any) => s.userId === socket.data.userId)) {
          seatedTable = i; break;
        }
      }
      if (seatedTable === -1) throw new Error('Must be seated to set a goal');

      await setGoal(socket.data.userId, roomCode, seatedTable, data.goalText, data.goalShared, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('session:ready', async (cb) => {
    try {
      await setReady(socket.data.userId, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('session:start', async (cb) => {
    try {
      const active = getActiveSession(socket.data.userId);
      if (!active) throw new Error('No active session to start');
      
      await startSession(socket.data.userId, active.roomCode, active.tableIndex, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('session:end_early', async (cb) => {
    try {
      await endEarly(socket.data.userId, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('session:submit_reflection', async (data, cb) => {
    try {
      await submitReflection(socket.data.userId, data.goalOutcome, data.obstacles, data.nextSteps, io);
      cb({ ok: true });
    } catch (err: any) {
      cb({ ok: false, error: err.message });
    }
  });
}

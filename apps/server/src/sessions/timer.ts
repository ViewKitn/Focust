import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@connecta-focus/shared';
import { getTableSession } from '../tables/manager';
import { onFocusEnd, onBreakEnd } from './manager';

const activeTimers = new Map<string, NodeJS.Timeout>();

function getTimerKey(roomCode: string, tableIndex: number) {
  return `${roomCode}:${tableIndex}`;
}

export function startTableTimer(roomCode: string, tableIndex: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const key = getTimerKey(roomCode, tableIndex);
  cancelTableTimer(roomCode, tableIndex);

  const timer = setInterval(async () => {
    const session = getTableSession(roomCode, tableIndex);
    if (!session) {
      cancelTableTimer(roomCode, tableIndex);
      return;
    }

    const now = Date.now();
    const endsAtMs = session.endsAt.getTime();
    const remainingMs = Math.max(0, endsAtMs - now);

    io.to(roomCode).emit('session:tick', {
      tableIndex,
      remainingMs,
      phase: session.phase
    });

    if (remainingMs <= 0) {
      cancelTableTimer(roomCode, tableIndex);
      if (session.phase === 'focus') {
        await onFocusEnd(roomCode, tableIndex, io);
        // Start break timer
        startTableTimer(roomCode, tableIndex, io);
      } else if (session.phase === 'break') {
        await onBreakEnd(roomCode, tableIndex, io);
      }
    }
  }, 1000);

  activeTimers.set(key, timer);
}

export function cancelTableTimer(roomCode: string, tableIndex: number) {
  const key = getTimerKey(roomCode, tableIndex);
  const timer = activeTimers.get(key);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(key);
  }
}

export function tickTimers(io: Server) {
  // We use setInterval for each table instead of a global tick loop
  // This is just a stub for backwards compatibility with index.ts
}

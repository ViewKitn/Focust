import { Server } from 'socket.io';
import { 
  TableState, SeatState, ClientToServerEvents, ServerToClientEvents,
  SEATS_PER_TABLE, TABLES_PER_ROOM 
} from '@connecta-focus/shared';
import { getActiveSession, onUserLeaveTable, getActiveSessionParticipantsForTable } from '../sessions/manager';
import { activeRooms } from '../rooms/manager';

interface SeatData {
  userId: string | null;
  reservedUntil: Date | null;
}

interface TableData {
  ownerId: string | null;
  seats: SeatData[];
  session: {
    startedAt: Date;
    endsAt: Date;
    phase: 'focus' | 'break';
  } | null;
}

const tableMap = new Map<string, TableData[]>();

function ensureTables(roomCode: string) {
  if (!tableMap.has(roomCode)) {
    const tables: TableData[] = [];
    for (let i = 0; i < TABLES_PER_ROOM; i++) {
      tables.push({
        ownerId: null,
        seats: Array.from({ length: SEATS_PER_TABLE }, () => ({ userId: null, reservedUntil: null })),
        session: null
      });
    }
    tableMap.set(roomCode, tables);
  }
  return tableMap.get(roomCode)!;
}

export function getTableState(roomCode: string, tableIndex: number, requestingUserId: string): TableState {
  const tables = ensureTables(roomCode);
  const table = tables[tableIndex];

  return {
    tableIndex,
    ownerId: table.ownerId,
    seats: table.seats.map((s, idx) => ({
      seatIndex: idx,
      userId: s.userId,
      isReserved: s.reservedUntil !== null && s.reservedUntil > new Date()
    })),
    activeSession: table.session ? {
      startedAt: table.session.startedAt.toISOString(),
      endsAt: table.session.endsAt.toISOString(),
      phase: table.session.phase,
      remainingMs: Math.max(0, table.session.endsAt.getTime() - Date.now()),
      participants: getActiveSessionParticipantsForTable(roomCode, tableIndex, requestingUserId)
    } : null
  };
}

export function setTableSession(roomCode: string, tableIndex: number, session: TableData['session']) {
  const tables = ensureTables(roomCode);
  tables[tableIndex].session = session;
}

export function getTableSession(roomCode: string, tableIndex: number) {
  const tables = ensureTables(roomCode);
  return tables[tableIndex].session;
}

export function sitDown(roomCode: string, tableIndex: number, seatIndex: number, userId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const tables = ensureTables(roomCode);
  const table = tables[tableIndex];

  // Atomic check-and-set in JS single thread
  // Check if user is already seated
  for (let tIdx = 0; tIdx < TABLES_PER_ROOM; tIdx++) {
    for (let sIdx = 0; sIdx < SEATS_PER_TABLE; sIdx++) {
      if (tables[tIdx].seats[sIdx].userId === userId) {
        throw new Error('Already seated');
      }
    }
  }

  const seat = table.seats[seatIndex];
  if (seat.userId !== null && seat.userId !== userId) {
    if (!seat.reservedUntil || seat.reservedUntil < new Date()) {
      seat.userId = null;
      seat.reservedUntil = null;
    } else {
      throw new Error('Seat is taken');
    }
  }

  seat.userId = userId;
  seat.reservedUntil = null;
  if (table.ownerId === null) {
    table.ownerId = userId;
    io.to(roomCode).emit('table:owner_changed', { tableIndex, newOwnerId: userId });
  }

  io.to(roomCode).emit('room:member_seated', { userId, tableIndex, seatIndex });
  io.to(roomCode).emit('table:state_changed', { tableIndex, table: getTableState(roomCode, tableIndex, userId) });
}

export async function standUp(roomCode: string, userId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const tables = ensureTables(roomCode);
  let seatedTable = -1;
  let seatedSeat = -1;

  for (let tIdx = 0; tIdx < TABLES_PER_ROOM; tIdx++) {
    for (let sIdx = 0; sIdx < SEATS_PER_TABLE; sIdx++) {
      if (tables[tIdx].seats[sIdx].userId === userId) {
        seatedTable = tIdx;
        seatedSeat = sIdx;
      }
    }
  }

  if (seatedTable === -1) throw new Error('Not seated');
  const table = tables[seatedTable];

  // Prevent standing during focus phase unless session ended early
  if (table.session && table.session.phase === 'focus') {
    const as = getActiveSession(userId);
    if (as && as.status === 'focusing') {
      throw new Error('Cannot stand during focus phase. End session early first.');
    }
  }

  table.seats[seatedSeat].userId = null;
  table.seats[seatedSeat].reservedUntil = null;

  await onUserLeaveTable(userId, roomCode, seatedTable, io);

  if (table.ownerId === userId) {
    // transfer owner
    const nextSeated = table.seats.find(s => s.userId !== null);
    table.ownerId = nextSeated ? nextSeated.userId : null;
    if (table.ownerId) {
      io.to(roomCode).emit('table:owner_changed', { tableIndex: seatedTable, newOwnerId: table.ownerId });
    }
  }

  io.to(roomCode).emit('room:member_stood', { userId });
  io.to(roomCode).emit('table:state_changed', { tableIndex: seatedTable, table: getTableState(roomCode, seatedTable, userId) });
}

export function cleanUpSeat(roomCode: string, userId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const tables = ensureTables(roomCode);
  for (let tIdx = 0; tIdx < TABLES_PER_ROOM; tIdx++) {
    for (let sIdx = 0; sIdx < SEATS_PER_TABLE; sIdx++) {
      if (tables[tIdx].seats[sIdx].userId === userId) {
        tables[tIdx].seats[sIdx].userId = null;
        tables[tIdx].seats[sIdx].reservedUntil = null;
        
        if (tables[tIdx].ownerId === userId) {
          const nextSeated = tables[tIdx].seats.find(s => s.userId !== null);
          const nextOwnerId = nextSeated ? nextSeated.userId : null;
          tables[tIdx].ownerId = nextOwnerId;
          if (nextOwnerId) {
            io.to(roomCode).emit('table:owner_changed', { tableIndex: tIdx, newOwnerId: nextOwnerId });
          }
        }
        
        io.to(roomCode).emit('room:member_stood', { userId });
        io.to(roomCode).emit('table:state_changed', { tableIndex: tIdx, table: getTableState(roomCode, tIdx, userId) });
      }
    }
  }
}

export function getTableOwner(roomCode: string, tableIndex: number): string | null {
  const tables = ensureTables(roomCode);
  return tables[tableIndex].ownerId;
}

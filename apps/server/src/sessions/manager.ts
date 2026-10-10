import { Server } from 'socket.io';
import { db } from '../db';
import { focusSessions } from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { 
  SessionStatus, ClientToServerEvents, ServerToClientEvents,
  GoalOutcome, SessionEndReason, FOCUS_DURATION_MS, BREAK_DURATION_MS,
  SessionParticipant
} from '@connecta-focus/shared';
import { getTableSession, setTableSession, getTableState, getTableOwner } from '../tables/manager';
import { startTableTimer, cancelTableTimer } from './timer';

export interface ActiveSession {
  sessionId: string;
  userId: string;
  roomCode: string;
  tableIndex: number;
  goalText: string;
  goalShared: boolean;
  status: SessionStatus;
  startedAt: Date | null;
}

const userSessions = new Map<string, ActiveSession>();

export function getActiveSession(userId: string): ActiveSession | undefined {
  return userSessions.get(userId);
}

export function getActiveSessionParticipantsForTable(roomCode: string, tableIndex: number, requestingUserId: string): SessionParticipant[] {
  const participants: SessionParticipant[] = [];
  for (const session of userSessions.values()) {
    if (session.roomCode === roomCode && session.tableIndex === tableIndex && session.status !== 'ended') {
      const isSelf = session.userId === requestingUserId;
      participants.push({
        userId: session.userId,
        status: session.status,
        goalShared: session.goalShared,
        goalText: (session.goalShared || isSelf) ? session.goalText : null,
        goalOutcome: null // would be fetched if we needed it during reflection, but usually null while active
      });
    }
  }
  return participants;
}

export async function hasPendingReflection(userId: string): Promise<boolean> {
  const pending = await db.select().from(focusSessions)
    .where(and(
      eq(focusSessions.userId, userId),
      eq(focusSessions.status, 'ended'),
      isNull(focusSessions.reflectionSubmittedAt)
    ))
    .limit(1);
  return pending.length > 0;
}

export async function setGoal(userId: string, roomCode: string, tableIndex: number, goalText: string, goalShared: boolean, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  let active = userSessions.get(userId);
  if (active) {
    if (active.status !== 'waiting') {
      throw new Error('Already in an active session');
    }
    active.goalText = goalText;
    active.goalShared = goalShared;
    await db.update(focusSessions).set({ goalText, goalShared }).where(eq(focusSessions.id, active.sessionId));
  } else {
    // DB insert new session
    const [inserted] = await db.insert(focusSessions).values({
      userId,
      goalText,
      goalShared,
      status: 'waiting',
      tableIndex
    }).returning({ id: focusSessions.id });
    
    active = {
      sessionId: inserted.id,
      userId,
      roomCode,
      tableIndex,
      goalText,
      goalShared,
      status: 'waiting',
      startedAt: null
    };
    userSessions.set(userId, active);
  }

  io.to(roomCode).emit('table:state_changed', { tableIndex, table: getTableState(roomCode, tableIndex, userId) });
}

export async function setReady(userId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const active = userSessions.get(userId);
  if (!active || active.status !== 'waiting') throw new Error('No waiting session found');
  
  if (await hasPendingReflection(userId)) {
    throw new Error('You have a pending reflection to submit');
  }

  active.status = 'ready';
  await db.update(focusSessions).set({ status: 'ready' }).where(eq(focusSessions.id, active.sessionId));
  
  io.to(active.roomCode).emit('session:member_ready', { tableIndex: active.tableIndex, userId });
  io.to(active.roomCode).emit('table:state_changed', { tableIndex: active.tableIndex, table: getTableState(active.roomCode, active.tableIndex, userId) });
}

export async function startSession(userId: string, roomCode: string, tableIndex: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const owner = getTableOwner(roomCode, tableIndex);
  if (owner !== userId) throw new Error('Only table owner can start the session');

  const participants = getActiveSessionParticipantsForTable(roomCode, tableIndex, userId);
  if (participants.length === 0) throw new Error('No participants');

  for (const p of participants) {
    if (p.status !== 'ready') {
      throw new Error('All seated members with goals must be ready');
    }
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + FOCUS_DURATION_MS);
  
  setTableSession(roomCode, tableIndex, {
    startedAt: now,
    endsAt: endsAt,
    phase: 'focus'
  });

  for (const p of participants) {
    const s = userSessions.get(p.userId);
    if (s) {
      s.status = 'focusing';
      s.startedAt = now;
      await db.update(focusSessions).set({ status: 'focusing', startedAt: now }).where(eq(focusSessions.id, s.sessionId));
    }
  }

  io.to(roomCode).emit('session:started', { tableIndex, startedAt: now.toISOString(), endsAt: endsAt.toISOString() });
  io.to(roomCode).emit('table:state_changed', { tableIndex, table: getTableState(roomCode, tableIndex, userId) });

  startTableTimer(roomCode, tableIndex, io);
}

export async function endEarly(userId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const active = userSessions.get(userId);
  if (!active) throw new Error('No active session');
  if (active.status === 'ended') throw new Error('Session already ended');

  await endSessionForUser(userId, 'ended_early', io);
  
  io.to(active.roomCode).emit('session:member_ended', { tableIndex: active.tableIndex, userId, endReason: 'ended_early' });
  io.to(active.roomCode).emit('table:state_changed', { tableIndex: active.tableIndex, table: getTableState(active.roomCode, active.tableIndex, userId) });
}

export async function endSessionForUser(userId: string, reason: SessionEndReason, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const active = userSessions.get(userId);
  if (!active) return;
  
  const now = new Date();
  let focusMs = 0;
  if (active.startedAt) {
    focusMs = now.getTime() - active.startedAt.getTime();
    if (focusMs > FOCUS_DURATION_MS) focusMs = FOCUS_DURATION_MS; // cap if went into break
  }

  await db.update(focusSessions).set({ 
    status: 'ended', 
    endedAt: now, 
    endReason: reason,
    focusDurationMs: focusMs
  }).where(eq(focusSessions.id, active.sessionId));

  userSessions.delete(userId);
}

export async function submitReflection(userId: string, goalOutcome: GoalOutcome, obstacles: string | undefined, nextSteps: string | undefined, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const [latest] = await db.select().from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), eq(focusSessions.status, 'ended'), isNull(focusSessions.reflectionSubmittedAt)))
    .orderBy(desc(focusSessions.createdAt))
    .limit(1);

  if (!latest) throw new Error('No pending reflection');

  await db.update(focusSessions).set({
    goalOutcome,
    reflectionObstacles: obstacles,
    reflectionNextSteps: nextSteps,
    reflectionSubmittedAt: new Date()
  }).where(eq(focusSessions.id, latest.id));

  io.to(userId).emit('session:reflection_submitted', { userId, goalOutcome });
}

export async function onFocusEnd(roomCode: string, tableIndex: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const tSession = getTableSession(roomCode, tableIndex);
  if (!tSession) return;
  
  const now = new Date();
  const endsAt = new Date(now.getTime() + BREAK_DURATION_MS);
  tSession.phase = 'break';
  tSession.endsAt = endsAt;

  for (const session of userSessions.values()) {
    if (session.roomCode === roomCode && session.tableIndex === tableIndex && session.status === 'focusing') {
      session.status = 'break';
      await db.update(focusSessions).set({ status: 'break' }).where(eq(focusSessions.id, session.sessionId));
    }
  }
  
  io.to(roomCode).emit('table:state_changed', { tableIndex, table: getTableState(roomCode, tableIndex, 'system') });
}

export async function onBreakEnd(roomCode: string, tableIndex: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const tSession = getTableSession(roomCode, tableIndex);
  if (!tSession) return;

  setTableSession(roomCode, tableIndex, null);
  cancelTableTimer(roomCode, tableIndex);

  const participants = [];
  for (const session of userSessions.values()) {
    if (session.roomCode === roomCode && session.tableIndex === tableIndex) {
      participants.push(session.userId);
    }
  }

  for (const userId of participants) {
    await endSessionForUser(userId, 'completed', io);
  }

  io.to(roomCode).emit('session:ended', { tableIndex });
  io.to(roomCode).emit('table:state_changed', { tableIndex, table: getTableState(roomCode, tableIndex, 'system') });
}

export async function onUserLeaveTable(userId: string, roomCode: string, tableIndex: number, io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const active = userSessions.get(userId);
  if (active && active.roomCode === roomCode && active.tableIndex === tableIndex) {
    await endSessionForUser(userId, 'left_room', io);
  }
}

export async function onUserLeaveRoom(userId: string, roomCode: string, io: Server<ClientToServerEvents, ServerToClientEvents>, reason: SessionEndReason) {
  const active = userSessions.get(userId);
  if (active && active.roomCode === roomCode) {
    await endSessionForUser(userId, reason, io);
  }
}

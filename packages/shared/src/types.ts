// User & Auth
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarPreset: AvatarPreset;
  createdAt: Date;
}

export type AvatarPreset = 'preset-1' | 'preset-2' | 'preset-3' | 'preset-4';

export interface AuthPayload {
  userId: string;
  email: string;
}

// Room
export interface Room {
  id: string;
  code: string;
  ownerId: string;
  createdAt: Date;
  closedAt: Date | null;
  closeReason: RoomCloseReason | null;
}

export type RoomCloseReason = 'owner_closed' | 'empty_timeout';

// Table & Seat
export interface StudyTable {
  id: string;
  roomId: string;
  tableIndex: number; // 0 or 1
  ownerId: string | null;
}

export interface Seat {
  tableId: string;
  seatIndex: number; // 0-3
  userId: string | null;
  reservedUntil: Date | null;
}

// Focus Cycle
export type SessionStatus = 'waiting' | 'ready' | 'focusing' | 'break' | 'ended';
export type GoalOutcome = 'achieved' | 'partial' | 'not_achieved';
export type SessionEndReason = 'completed' | 'ended_early' | 'left_room' | 'kicked' | 'room_closed';

export interface FocusSession {
  id: string;
  userId: string;
  tableId: string | null; // null for solo
  roomId: string | null;
  goalText: string;
  goalShared: boolean;
  status: SessionStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  endReason: SessionEndReason | null;
  focusDurationMs: number; // actual connected focus time
  breakDurationMs: number;
  goalOutcome: GoalOutcome | null;
  reflectionObstacles: string | null;
  reflectionNextSteps: string | null;
  reflectionSubmittedAt: Date | null;
  createdAt: Date;
}

// Presence & Movement
export interface PlayerPosition {
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface RoomMember {
  userId: string;
  nickname: string;
  avatarPreset: AvatarPreset;
  position: PlayerPosition;
  seatInfo: { tableIndex: number; seatIndex: number } | null;
  sessionStatus: SessionStatus | null;
  isRoomOwner: boolean;
  joinedAt: Date;
}

// Chat
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  text: string;
  sentAt: Date;
}

// History & Summary
export interface SessionSummary {
  totalFocusTimeMs: number;
  completedSessions: number;
  endedEarlySessions: number;
  goalAchieved: number;
  goalPartial: number;
  goalNotAchieved: number;
  pendingReflections: number;
}

// Socket Events
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:member_joined': (member: RoomMember) => void;
  'room:member_left': (data: { userId: string; reason: string }) => void;
  'room:member_moved': (data: { userId: string; position: PlayerPosition }) => void;
  'room:member_seated': (data: { userId: string; tableIndex: number; seatIndex: number }) => void;
  'room:member_stood': (data: { userId: string }) => void;
  'room:owner_changed': (data: { newOwnerId: string }) => void;
  'room:closed': (data: { reason: RoomCloseReason }) => void;
  'table:state_changed': (data: { tableIndex: number; table: TableState }) => void;
  'table:owner_changed': (data: { tableIndex: number; newOwnerId: string }) => void;
  'session:started': (data: { tableIndex: number; startedAt: string; endsAt: string }) => void;
  'session:ended': (data: { tableIndex: number }) => void;
  'session:tick': (data: { tableIndex: number; remainingMs: number; phase: 'focus' | 'break' }) => void;
  'session:member_ready': (data: { tableIndex: number; userId: string }) => void;
  'session:member_ended': (data: { tableIndex: number; userId: string; endReason: SessionEndReason }) => void;
  'session:reflection_submitted': (data: { userId: string; goalOutcome: GoalOutcome }) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (messages: ChatMessage[]) => void;
  'auth:tab_replaced': (data: { reason: string }) => void;
  'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string }, cb: (res: { ok: boolean; error?: string; room?: RoomState }) => void) => void;
  'room:create': (cb: (res: { ok: boolean; error?: string; roomCode?: string }) => void) => void;
  'room:leave': () => void;
  'room:kick': (data: { userId: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'room:close': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'player:move': (position: PlayerPosition) => void;
  'table:sit': (data: { tableIndex: number; seatIndex: number }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'table:stand': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'session:set_goal': (data: { goalText: string; goalShared: boolean }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'session:ready': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'session:start': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'session:end_early': (cb: (res: { ok: boolean; error?: string }) => void) => void;
  'session:submit_reflection': (data: { goalOutcome: GoalOutcome; obstacles?: string; nextSteps?: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'chat:send': (data: { text: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
}

// Room State (sent on join)
export interface RoomState {
  roomId: string;
  roomCode: string;
  ownerId: string;
  members: RoomMember[];
  tables: TableState[];
  chatMessages: ChatMessage[];
}

export interface TableState {
  tableIndex: number;
  ownerId: string | null;
  seats: SeatState[];
  activeSession: ActiveSessionState | null;
}

export interface SeatState {
  seatIndex: number;
  userId: string | null;
  isReserved: boolean;
}

export interface ActiveSessionState {
  startedAt: string;
  endsAt: string;
  phase: 'focus' | 'break';
  remainingMs: number;
  participants: SessionParticipant[];
}

export interface SessionParticipant {
  userId: string;
  status: SessionStatus;
  goalShared: boolean;
  goalText: string | null; // null if not shared
  goalOutcome: GoalOutcome | null;
}

// Constants
export const FOCUS_DURATION_MS = 25 * 60 * 1000;
export const BREAK_DURATION_MS = 5 * 60 * 1000;
export const MAX_ROOM_MEMBERS = 8;
export const TABLES_PER_ROOM = 2;
export const SEATS_PER_TABLE = 4;
export const SEAT_RESERVATION_MS = 60 * 1000;
export const ROOM_EMPTY_TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_CHAT_MESSAGE_LENGTH = 200;
export const MAX_CHAT_MESSAGES = 100;
export const MOVEMENT_THROTTLE_MS = 100;

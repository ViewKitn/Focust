import type { AvatarPreset, Direction, GoalOutcome } from './types';
export interface Profile { id: string; email: string; nickname: string; avatarPreset: AvatarPreset }
export interface Position { x: number; y: number; direction: Direction; isMoving: boolean }
export interface Person { id: string; nickname: string; avatar: AvatarPreset; position: Position; connected: boolean; seat: { table: number; index: number } | null; status: string; goal?: string; outcome?: GoalOutcome | null }
export interface Cycle { id: string; startedAt: number; focusEnd: number; breakEnd: number }
export interface TableView { index: number; owner: string | null; seats: (string | null)[]; cycle: Cycle | null }
export interface Chat { id: string; userId: string; nickname: string; text: string; at: number }
export interface SessionRecord { id: string; userId: string; roomId: string | null; tableIndex: number | null; goalText: string; goalShared: boolean; status: string; startedAt: string | null; endedAt: string | null; endReason: string | null; focusDurationMs: number; goalOutcome: GoalOutcome | null; reflectionObstacles: string | null; reflectionNextSteps: string | null; reflectionSubmittedAt: string | null; createdAt: string }
export interface Personal { active: (Cycle & { sessionId: string; goal: string; table: number | null; roomCode: string | null }) | null; draft: { text: string; shared: boolean; ready: boolean } | null; pending: SessionRecord[] }
export interface RoomView { id: string; code: string; owner: string; members: Person[]; tables: TableView[]; chat: Chat[] }
export interface Snapshot { now: number; room: RoomView | null; personal: Personal }
export interface Reply { ok: boolean; error?: string; code?: string }
export type Action = 'room:create' | 'room:join' | 'room:leave' | 'room:close' | 'room:kick' | 'table:sit' | 'table:stand' | 'session:goal' | 'session:ready' | 'session:start' | 'session:solo' | 'session:end' | 'session:reflect' | 'chat:send' | 'sync';

import { pgTable, uuid, varchar, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 30 }).notNull(),
  avatarPreset: varchar('avatar_preset', { length: 20 }).notNull().default('preset-1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).unique().notNull(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  closeReason: varchar('close_reason', { length: 20 }),
});

export const roomMembers = pgTable('room_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  leaveReason: varchar('leave_reason', { length: 20 }),
  isBanned: boolean('is_banned').default(false).notNull(),
});

export const focusSessions = pgTable('focus_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  roomId: uuid('room_id').references(() => rooms.id),
  tableIndex: integer('table_index'),
  goalText: varchar('goal_text', { length: 500 }).notNull(),
  goalShared: boolean('goal_shared').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('waiting').notNull(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  endReason: varchar('end_reason', { length: 20 }),
  focusDurationMs: integer('focus_duration_ms').default(0).notNull(),
  breakDurationMs: integer('break_duration_ms').default(0).notNull(),
  goalOutcome: varchar('goal_outcome', { length: 20 }),
  reflectionObstacles: text('reflection_obstacles'),
  reflectionNextSteps: text('reflection_next_steps'),
  reflectionSubmittedAt: timestamp('reflection_submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  nickname: varchar('nickname', { length: 30 }).notNull(),
  text: varchar('text', { length: 200 }).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});

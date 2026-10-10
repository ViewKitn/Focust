import { config } from 'dotenv';
import path from 'node:path';
config({ path: path.resolve(__dirname, '../../../.env') });
const testMode = process.env.NODE_ENV === 'test';
const duration = (name: string, normal: number) => testMode ? Number(process.env[name] || normal) : normal;

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/connecta_focus',
  JWT_SECRET: process.env.JWT_SECRET || '',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  FOCUS_MS: duration('TEST_FOCUS_MS', 25 * 60_000),
  BREAK_MS: duration('TEST_BREAK_MS', 5 * 60_000),
  SEAT_MS: duration('TEST_SEAT_MS', 60_000),
  EMPTY_MS: duration('TEST_EMPTY_MS', 5 * 60_000),
};
if (env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET (at least 32 characters) in the root .env file');

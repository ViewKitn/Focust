import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { env } from '../config';

export class AuthService {
  static async register(data: any) {
    const { password, avatarPreset } = data;
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const nickname = typeof data.nickname === 'string' ? data.nickname.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new Error('อีเมลไม่ถูกต้อง');
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 bytes');
    if (!nickname || nickname.length > 30) throw new Error('ชื่อเล่นต้องมี 1–30 ตัวอักษร');
    if (avatarPreset && !['preset-1','preset-2','preset-3','preset-4'].includes(avatarPreset)) throw new Error('อวาตาร์ไม่ถูกต้อง');

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      nickname,
      avatarPreset: avatarPreset || 'preset-1',
    }).returning();

    const token = this.generateToken(user.id, user.email);
    const { passwordHash: _, ...userData } = user;
    return { token, user: userData };
  }

  static async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string') throw new Error('Invalid credentials');
    email = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new Error('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new Error('Invalid credentials');

    const token = this.generateToken(user.id, user.email);
    const { passwordHash: _, ...userData } = user;
    return { token, user: userData };
  }

  static async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found');
    const { passwordHash: _, ...userData } = user;
    return userData;
  }

  private static generateToken(userId: string, email: string) {
    return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '7d' });
  }
}

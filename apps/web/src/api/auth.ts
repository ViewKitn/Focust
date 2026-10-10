import api from './client';
import type { User } from '../stores/authStore';

export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const register = async (email: string, password: string, nickname: string, avatarPreset: string): Promise<{ user: User; token: string }> => {
  const res = await api.post('/auth/register', { email, password, nickname, avatarPreset });
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await api.get('/auth/me');
  return res.data;
};
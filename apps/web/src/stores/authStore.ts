import { create } from 'zustand';
import type { AvatarPreset } from '@connecta-focus/shared';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarPreset: AvatarPreset;
}

interface AuthStoreState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));

export default useAuthStore;
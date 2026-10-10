import { create } from 'zustand';

interface GameState {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  ready: false,
  setReady: (ready: boolean) => set({ ready }),
}));
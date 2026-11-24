// store/Store.ts
import { create } from 'zustand';
import type { IUser } from '@/interfaces/IUser';

interface UserState {
  user: IUser | null;
  authReady: boolean; // false hasta que Supabase Auth responda por primera vez
  setUser: (user: IUser | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
}));
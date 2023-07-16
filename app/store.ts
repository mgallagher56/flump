import type { SupabaseClient, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  user: User;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user: User) => set(() => ({ user }))
      }),
      {
        name: 'user-storage'
      }
    )
  )
);

interface SupabaseState {
  supabase: SupabaseClient;
  setSupabase: (supabase: SupabaseClient) => void;
}

export const useSupabaseStore = create<SupabaseState>()(
  devtools(
    persist(
      (set) => ({
        supabase: null,
        setSupabase: (supabase: SupabaseClient) => set(() => ({ supabase }))
      }),
      {
        name: 'supabase-storage'
      }
    )
  )
);

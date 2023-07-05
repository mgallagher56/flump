import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface State {
  user: User;
  setUser: (user: User) => void;
}

const useUserStore = create<State>()(
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

export default useUserStore;

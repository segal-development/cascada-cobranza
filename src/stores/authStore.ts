import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Perfil } from '@/types'

interface AuthState {
  user: User | null
  perfil: Perfil | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setPerfil: (perfil: Perfil | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  reset: () => void
}

const initialState = {
  user: null,
  perfil: null,
  isLoading: true,
  error: null,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (_email: string, _password: string) => {
    set({ isLoading: true, error: null })
    // TODO: Wire to Supabase auth in Phase 1
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    set({ isLoading: false })
  },

  logout: async () => {
    set({ isLoading: true })
    // TODO: Wire to Supabase auth in Phase 1
    // await supabase.auth.signOut()
    set({ ...initialState, isLoading: false })
  },

  reset: () => set(initialState),
}))

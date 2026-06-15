import { create } from 'zustand'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Perfil } from '@/types'
import { supabase } from '@/lib/supabase'

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
  initialize: () => () => void
  reset: () => void
}

const initialState = {
  user: null,
  perfil: null,
  isLoading: true,
  error: null,
}

async function fetchPerfil(): Promise<Perfil | null> {
  const { data, error } = await supabase.rpc('cascada_mi_perfil')
  if (error) {
    console.error('Error fetching perfil:', error)
    return null
  }
  return data as Perfil | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }
    
    if (data.user) {
      const perfil = await fetchPerfil()
      set({ user: data.user, perfil, isLoading: false, error: null })
    } else {
      set({ isLoading: false, error: 'No se pudo iniciar sesión' })
    }
  },

  logout: async () => {
    set({ isLoading: true })
    await supabase.auth.signOut()
    set({ ...initialState, isLoading: false })
  },

  initialize: () => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const { isLoading } = get()
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only fetch perfil if not already loading (avoid duplicate calls during login)
          if (!isLoading) {
            set({ isLoading: true })
          }
          const perfil = await fetchPerfil()
          set({ user: session.user, perfil, isLoading: false, error: null })
        } else if (event === 'SIGNED_OUT') {
          set({ ...initialState, isLoading: false })
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session check
          if (session?.user) {
            const perfil = await fetchPerfil()
            set({ user: session.user, perfil, isLoading: false, error: null })
          } else {
            set({ isLoading: false })
          }
        }
      }
    )
    
    // Return cleanup function
    return () => {
      subscription.unsubscribe()
    }
  },

  reset: () => set(initialState),
}))

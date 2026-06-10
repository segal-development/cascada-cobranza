import { create } from 'zustand'
import type { AuthUser, AuthEventKind } from '@/lib/ports'
import type { Perfil } from '@/types'
import { repositories } from '@/lib/repositories'

interface AuthState {
  user: AuthUser | null
  perfil: Perfil | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: AuthUser | null) => void
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

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const authSession = await repositories.auth.signIn(email, password)
      const perfil = await repositories.auth.getPerfil()
      set({ user: authSession.user, perfil, isLoading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ isLoading: false, error: message })
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await repositories.auth.signOut()
    } catch {
      // Ignore signOut errors — always reset state
    }
    set({ ...initialState, isLoading: false })
  },

  initialize: () => {
    const unsubscribe = repositories.auth.onAuthChange(
      async (eventKind: AuthEventKind, userId: string | null) => {
        if ((eventKind === 'SIGNED_IN' || eventKind === 'INITIAL_SESSION') && userId) {
          set({ isLoading: true })
          try {
            const perfil = await repositories.auth.getPerfil()
            set({ user: { id: userId }, perfil, isLoading: false, error: null })
          } catch {
            // Mirror original fetchPerfil() resilience: never freeze on a
            // perfil RPC failure during session restore.
            set({ isLoading: false })
          }
        } else if (eventKind === 'SIGNED_OUT') {
          set({ ...initialState, isLoading: false })
        } else if (eventKind === 'INITIAL_SESSION' && !userId) {
          set({ isLoading: false })
        }
      },
    )

    return unsubscribe
  },

  reset: () => set(initialState),
}))

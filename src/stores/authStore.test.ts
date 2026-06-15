import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from './authStore'

// Mock Supabase
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('authStore', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@segal.cl',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
  }

  const mockPerfil = {
    id: 'perfil-123',
    nombre: 'María González',
    rol: 'cobradora' as const,
    meta_diaria: 18,
    es_pool: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()
    
    // Default mock for onAuthStateChange
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login successfully and fetch perfil', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: {} },
        error: null,
      })
      mockRpc.mockResolvedValueOnce({
        data: mockPerfil,
        error: null,
      })

      const store = useAuthStore.getState()
      await store.login('test@segal.cl', 'password123')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.perfil).toEqual(mockPerfil)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set error on login failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const store = useAuthStore.getState()
      await store.login('wrong@email.cl', 'wrongpass')

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.perfil).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Invalid login credentials')
    })

    it('should set loading state during login', async () => {
      let resolveSignIn: (value: unknown) => void
      mockSignInWithPassword.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSignIn = resolve
        })
      )

      const store = useAuthStore.getState()
      const loginPromise = store.login('test@segal.cl', 'password')

      // Check loading state is true during login
      expect(useAuthStore.getState().isLoading).toBe(true)

      // Resolve the sign in
      resolveSignIn!({
        data: { user: null, session: null },
        error: { message: 'test' },
      })
      await loginPromise

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout and reset state', async () => {
      // Set up initial state
      useAuthStore.setState({
        user: mockUser as never,
        perfil: mockPerfil,
        isLoading: false,
        error: null,
      })

      mockSignOut.mockResolvedValueOnce({ error: null })

      const store = useAuthStore.getState()
      await store.logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.perfil).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('initialize', () => {
    it('should set up auth state listener and return cleanup function', () => {
      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValueOnce({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      })

      const store = useAuthStore.getState()
      const cleanup = store.initialize()

      expect(mockOnAuthStateChange).toHaveBeenCalled()
      expect(typeof cleanup).toBe('function')

      // Test cleanup
      cleanup()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should handle INITIAL_SESSION event with user', async () => {
      let authCallback: (event: string, session: unknown) => void

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      mockRpc.mockResolvedValueOnce({
        data: mockPerfil,
        error: null,
      })

      const store = useAuthStore.getState()
      store.initialize()

      // Simulate INITIAL_SESSION event
      await authCallback!('INITIAL_SESSION', { user: mockUser })

      // Wait for async operations
      await vi.waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.user).toEqual(mockUser)
        expect(state.perfil).toEqual(mockPerfil)
        expect(state.isLoading).toBe(false)
      })
    })

    it('should handle INITIAL_SESSION event without user', async () => {
      let authCallback: (event: string, session: unknown) => void

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      const store = useAuthStore.getState()
      store.initialize()

      // Simulate INITIAL_SESSION event without user
      await authCallback!('INITIAL_SESSION', null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('should handle SIGNED_OUT event', async () => {
      let authCallback: (event: string, session: unknown) => void

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      // Set up initial logged-in state
      useAuthStore.setState({
        user: mockUser as never,
        perfil: mockPerfil,
        isLoading: false,
        error: null,
      })

      const store = useAuthStore.getState()
      store.initialize()

      // Simulate SIGNED_OUT event
      await authCallback!('SIGNED_OUT', null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.perfil).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      useAuthStore.setState({
        user: mockUser as never,
        perfil: mockPerfil,
        isLoading: false,
        error: 'some error',
      })

      const store = useAuthStore.getState()
      store.reset()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.perfil).toBeNull()
      expect(state.isLoading).toBe(true) // initial state has isLoading: true
      expect(state.error).toBeNull()
    })
  })
})

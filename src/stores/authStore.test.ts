import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from './authStore'
import { AUTH_EVENT } from '@/lib/ports'
import type { AuthEventKind } from '@/lib/ports'
import { RepositoryError } from '@/lib/errors'

// Mock repositories module — store uses repositories.auth.* instead of supabase directly
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthChange = vi.fn()
const mockGetPerfil = vi.fn()

vi.mock('@/lib/repositories', () => ({
  repositories: {
    auth: {
      signIn: (...args: unknown[]) => mockSignIn(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthChange: (...args: unknown[]) => mockOnAuthChange(...args),
      getPerfil: (...args: unknown[]) => mockGetPerfil(...args),
    },
    cartera: { listClientes: vi.fn() },
    resumen: {
      getResumenDia: vi.fn(),
      getKpiGestionados: vi.fn(),
      getDesgloseSegmento: vi.fn(),
      getResumenGestiones: vi.fn(),
      setearMeta: vi.fn(),
    },
    cola: { siguienteCliente: vi.fn(), countPendientes: vi.fn() },
    gestion: { registrarGestion: vi.fn(), gestionesRango: vi.fn() },
    carga: {
      cargaMensual: vi.fn(),
      listCargasHist: vi.fn(),
      cargaPagos: vi.fn(),
      aplicarSayorana: vi.fn(),
    },
    recaudacion: {
      recaudacionCobradora: vi.fn(),
      historialPagos: vi.fn(),
      cuotasPagadas: vi.fn(),
    },
  },
}))

describe('authStore', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@segal.cl',
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

    // Default mock for onAuthChange — returns an unsubscribe function
    mockOnAuthChange.mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login successfully and fetch perfil', async () => {
      mockSignIn.mockResolvedValueOnce({ user: mockUser })
      mockGetPerfil.mockResolvedValueOnce(mockPerfil)

      const store = useAuthStore.getState()
      await store.login('test@segal.cl', 'password123')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.perfil).toEqual(mockPerfil)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set error on login failure', async () => {
      const { RepositoryError } = await import('@/lib/errors')
      mockSignIn.mockRejectedValueOnce(new RepositoryError('Invalid login credentials'))

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
      mockSignIn.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSignIn = resolve
        }),
      )

      const store = useAuthStore.getState()
      const loginPromise = store.login('test@segal.cl', 'password')

      // Loading is true during the async operation
      expect(useAuthStore.getState().isLoading).toBe(true)

      // Resolve with a valid session, getPerfil will be called next
      resolveSignIn!({ user: mockUser })
      mockGetPerfil.mockResolvedValueOnce(null)
      await loginPromise

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout and reset state', async () => {
      // Set up initial state
      useAuthStore.setState({
        user: mockUser,
        perfil: mockPerfil,
        isLoading: false,
        error: null,
      })

      mockSignOut.mockResolvedValueOnce(undefined)

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
      const mockUnsub = vi.fn()
      mockOnAuthChange.mockReturnValueOnce(mockUnsub)

      const store = useAuthStore.getState()
      const cleanup = store.initialize()

      expect(mockOnAuthChange).toHaveBeenCalled()
      expect(typeof cleanup).toBe('function')

      cleanup()
      expect(mockUnsub).toHaveBeenCalled()
    })

    it('should handle INITIAL_SESSION event with user', async () => {
      let authCallback: (event: AuthEventKind, userId: string | null) => void

      mockOnAuthChange.mockImplementationOnce((cb) => {
        authCallback = cb
        return () => {}
      })

      mockGetPerfil.mockResolvedValueOnce(mockPerfil)

      const store = useAuthStore.getState()
      store.initialize()

      // Simulate INITIAL_SESSION event with a userId
      await authCallback!(AUTH_EVENT.INITIAL_SESSION, 'user-123')

      await vi.waitFor(() => {
        const state = useAuthStore.getState()
        expect(state.user).toEqual({ id: 'user-123' })
        expect(state.perfil).toEqual(mockPerfil)
        expect(state.isLoading).toBe(false)
      })
    })

    it('does not freeze isLoading when getPerfil fails during INITIAL_SESSION', async () => {
      let authCallback: (event: AuthEventKind, userId: string | null) => void

      mockOnAuthChange.mockImplementationOnce((cb) => {
        authCallback = cb
        return () => {}
      })

      mockGetPerfil.mockRejectedValueOnce(new RepositoryError('cascada_mi_perfil failed'))

      const store = useAuthStore.getState()
      store.initialize()

      // Cold-start session restore with a failing perfil RPC must not hang.
      await authCallback!(AUTH_EVENT.INITIAL_SESSION, 'user-123')

      await vi.waitFor(() => {
        expect(useAuthStore.getState().isLoading).toBe(false)
      })
    })

    it('should handle INITIAL_SESSION event without user', async () => {
      let authCallback: (event: AuthEventKind, userId: string | null) => void

      mockOnAuthChange.mockImplementationOnce((cb) => {
        authCallback = cb
        return () => {}
      })

      const store = useAuthStore.getState()
      store.initialize()

      await authCallback!(AUTH_EVENT.INITIAL_SESSION, null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('should handle SIGNED_OUT event', async () => {
      let authCallback: (event: AuthEventKind, userId: string | null) => void

      mockOnAuthChange.mockImplementationOnce((cb) => {
        authCallback = cb
        return () => {}
      })

      // Set up initial logged-in state
      useAuthStore.setState({
        user: mockUser,
        perfil: mockPerfil,
        isLoading: false,
        error: null,
      })

      const store = useAuthStore.getState()
      store.initialize()

      await authCallback!(AUTH_EVENT.SIGNED_OUT, null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.perfil).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset to initial state', () => {
      useAuthStore.setState({
        user: mockUser,
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

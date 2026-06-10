import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import { AUTH_EVENT } from '@/lib/ports'

// Mock supabase client before importing the adapter
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

import { SupabaseAuthRepository } from './supabaseAuthRepository'

describe('SupabaseAuthRepository', () => {
  let repo: SupabaseAuthRepository

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
    repo = new SupabaseAuthRepository()
  })

  describe('signIn', () => {
    it('returns AuthSession with mapped user on success', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: {} },
        error: null,
      })

      const session = await repo.signIn('test@segal.cl', 'password')

      expect(session.user.id).toBe('user-123')
      expect(session.user.email).toBe('test@segal.cl')
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@segal.cl',
        password: 'password',
      })
    })

    it('throws RepositoryError on supabase error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', code: 'invalid_grant' },
      })

      await expect(repo.signIn('bad@email.cl', 'wrong')).rejects.toThrow(RepositoryError)
      await expect(repo.signIn('bad@email.cl', 'wrong')).rejects.toThrow('Invalid credentials')
    })

    it('throws RepositoryError when user is null with no error', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      await expect(repo.signIn('test@segal.cl', 'pass')).rejects.toThrow(RepositoryError)
    })
  })

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null })

      await repo.signOut()

      expect(mockSignOut).toHaveBeenCalledOnce()
    })

    it('throws RepositoryError on signOut error', async () => {
      mockSignOut.mockResolvedValueOnce({ error: { message: 'Network error' } })

      await expect(repo.signOut()).rejects.toThrow(RepositoryError)
    })
  })

  describe('getPerfil', () => {
    it('returns Perfil on success', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockPerfil, error: null })

      const perfil = await repo.getPerfil()

      expect(perfil).toEqual(mockPerfil)
      expect(mockRpc).toHaveBeenCalledWith('cascada_mi_perfil')
    })

    it('returns null when data is null', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null })

      const perfil = await repo.getPerfil()

      expect(perfil).toBeNull()
    })

    it('throws RepositoryError on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } })

      await expect(repo.getPerfil()).rejects.toThrow(RepositoryError)
    })
  })

  describe('onAuthChange', () => {
    it('returns unsubscribe function', () => {
      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const unsub = repo.onAuthChange(vi.fn())

      expect(typeof unsub).toBe('function')
      unsub()
      expect(mockUnsubscribe).toHaveBeenCalledOnce()
    })

    it('maps SIGNED_IN event and passes userId', async () => {
      let sdkCallback: (event: string, session: unknown) => void
      mockOnAuthStateChange.mockImplementationOnce((cb) => {
        sdkCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const domainCallback = vi.fn()
      repo.onAuthChange(domainCallback)

      sdkCallback!('SIGNED_IN', { user: { id: 'user-456' } })

      expect(domainCallback).toHaveBeenCalledWith(AUTH_EVENT.SIGNED_IN, 'user-456')
    })

    it('maps SIGNED_OUT event with null userId', async () => {
      let sdkCallback: (event: string, session: unknown) => void
      mockOnAuthStateChange.mockImplementationOnce((cb) => {
        sdkCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const domainCallback = vi.fn()
      repo.onAuthChange(domainCallback)

      sdkCallback!('SIGNED_OUT', null)

      expect(domainCallback).toHaveBeenCalledWith(AUTH_EVENT.SIGNED_OUT, null)
    })

    it('maps INITIAL_SESSION event', async () => {
      let sdkCallback: (event: string, session: unknown) => void
      mockOnAuthStateChange.mockImplementationOnce((cb) => {
        sdkCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const domainCallback = vi.fn()
      repo.onAuthChange(domainCallback)

      sdkCallback!('INITIAL_SESSION', { user: { id: 'user-789' } })

      expect(domainCallback).toHaveBeenCalledWith(AUTH_EVENT.INITIAL_SESSION, 'user-789')
    })

    it('ignores unmapped SDK events', () => {
      let sdkCallback: (event: string, session: unknown) => void
      mockOnAuthStateChange.mockImplementationOnce((cb) => {
        sdkCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const domainCallback = vi.fn()
      repo.onAuthChange(domainCallback)

      sdkCallback!('TOKEN_REFRESHED', { user: { id: 'user-123' } })

      expect(domainCallback).not.toHaveBeenCalled()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import type { RegistrarGestionInput } from '@/lib/ports'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { SupabaseGestionRepository } from './supabaseGestionRepository'

describe('SupabaseGestionRepository', () => {
  let repo: SupabaseGestionRepository

  const input: RegistrarGestionInput = {
    rut: '12345678-9',
    cuotaId: 'cuota-abc',
    tipo: 'llamada',
    efecto: 'no_contesta',
    nota: 'Test note',
    fecProxima: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseGestionRepository()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  describe('registrarGestion', () => {
    it('calls rpc(cascada_registrar_gestion) with all mapped params including p_rut', async () => {
      await repo.registrarGestion(input)

      expect(mockRpc).toHaveBeenCalledWith('cascada_registrar_gestion', {
        p_rut: '12345678-9',
        p_cuota_id: 'cuota-abc',
        p_tipo: 'llamada',
        p_efecto: 'no_contesta',
        p_nota: 'Test note',
        p_fec_proxima: null,
      })
    })

    it('maps input.rut to p_rut in the RPC payload', async () => {
      await repo.registrarGestion({ ...input, rut: 'different-rut' })

      expect(mockRpc).toHaveBeenCalledWith(
        'cascada_registrar_gestion',
        expect.objectContaining({ p_rut: 'different-rut' }),
      )
    })

    it('resolves without returning a value on success', async () => {
      const result = await repo.registrarGestion(input)

      expect(result).toBeUndefined()
    })

    it('passes null nota and fecProxima when both are null', async () => {
      await repo.registrarGestion({ ...input, nota: null, fecProxima: null })

      expect(mockRpc).toHaveBeenCalledWith(
        'cascada_registrar_gestion',
        expect.objectContaining({ p_nota: null, p_fec_proxima: null }),
      )
    })

    it('throws RepositoryError on RPC error', async () => {
      // Persistent mock so both assertions can fire
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed', code: 'P0002' },
      })

      await expect(repo.registrarGestion(input)).rejects.toThrow(RepositoryError)
      await expect(repo.registrarGestion(input)).rejects.toThrow('RPC failed')
    })

    it('includes the error code in RepositoryError when available', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Constraint violation', code: '23503' },
      })

      try {
        await repo.registrarGestion(input)
        expect.fail('Expected RepositoryError')
      } catch (err) {
        expect(err).toBeInstanceOf(RepositoryError)
        expect((err as RepositoryError).code).toBe('23503')
      }
    })
  })

  describe('gestionesRango (deferred Slice F)', () => {
    it('throws RepositoryError with "not implemented"', async () => {
      await expect(repo.gestionesRango('2026-01-01', '2026-06-01')).rejects.toThrow(RepositoryError)
      await expect(repo.gestionesRango('2026-01-01', '2026-06-01')).rejects.toThrow('not implemented')
    })
  })
})

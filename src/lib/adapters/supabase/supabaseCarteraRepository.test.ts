import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import type { Cliente } from '@/types'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockLimit = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { SupabaseCarteraRepository } from './supabaseCarteraRepository'

describe('SupabaseCarteraRepository', () => {
  let repo: SupabaseCarteraRepository

  const mockClientes: Partial<Cliente>[] = [
    { rut: '12345678-9', nombre: 'Juan Perez', regla: 'R5', dias_mora: 30 },
    { rut: '98765432-1', nombre: 'Maria Lopez', regla: 'R1', dias_mora: 5 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseCarteraRepository()

    // Chain: from → select → [eq →] limit
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq, limit: mockLimit })
    mockEq.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue({ data: mockClientes, error: null })
  })

  describe('listClientes', () => {
    it('calls from(cascada_clientes).select(*) with the legacy 10000 row limit', async () => {
      const result = await repo.listClientes()

      expect(mockFrom).toHaveBeenCalledWith('cascada_clientes')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockLimit).toHaveBeenCalledWith(10000)
      expect(result).toEqual(mockClientes)
    })

    it('does not filter by cobradoraId when params is undefined', async () => {
      await repo.listClientes()

      expect(mockEq).not.toHaveBeenCalled()
    })

    it('does not filter by cobradoraId when cobradoraId is undefined', async () => {
      await repo.listClientes({})

      expect(mockEq).not.toHaveBeenCalled()
    })

    it('filters by cobradoraId when provided', async () => {
      await repo.listClientes({ cobradoraId: 'cob-123' })

      expect(mockEq).toHaveBeenCalledWith('cobradora_id', 'cob-123')
    })

    it('throws RepositoryError on supabase error', async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: 'DB error', code: 'P0001' } })

      await expect(repo.listClientes()).rejects.toThrow(RepositoryError)
      await expect(repo.listClientes()).rejects.toThrow('DB error')
    })

    it('returns empty array when data is null without error', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.listClientes()

      expect(result).toEqual([])
    })
  })
})

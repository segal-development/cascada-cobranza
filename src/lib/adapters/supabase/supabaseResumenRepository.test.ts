import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import type { SetearMetaParams } from '@/lib/ports'

const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { SupabaseResumenRepository } from './supabaseResumenRepository'

describe('SupabaseResumenRepository', () => {
  let repo: SupabaseResumenRepository

  const mockRawRows = [
    {
      cobradora_id: 'cob-1',
      cobradora_nombre: 'Ana López',
      gestiones_hoy: '5',
      gestiones_mes: '80',
      meta_diaria: '20',
      meta_mes_acumulada: '80',
      meta_mes_total: '440',
      cartera_total: '150',
      monto_cartera: '5000000',
      es_pool: false,
    },
    {
      cobradora_id: 'cob-2',
      cobradora_nombre: 'Beatriz Gómez',
      gestiones_hoy: 3,
      gestiones_mes: 60,
      meta_diaria: 18,
      meta_mes_acumulada: 60,
      meta_mes_total: 396,
      cartera_total: 120,
      monto_cartera: 4000000,
      es_pool: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseResumenRepository()

    // Chain: from → select (directly awaitable)
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockResolvedValue({ data: mockRawRows, error: null })
  })

  describe('getResumenDia', () => {
    it('calls from(cascada_resumen_dia).select(*)', async () => {
      await repo.getResumenDia()

      expect(mockFrom).toHaveBeenCalledWith('cascada_resumen_dia')
      expect(mockSelect).toHaveBeenCalledWith('*')
    })

    it('maps raw DB rows to ResumenCobradora domain objects with numeric coercions', async () => {
      const result = await repo.getResumenDia()

      expect(result[0]).toEqual({
        cobradora_id: 'cob-1',
        cobradora_nombre: 'Ana López',
        gestiones_hoy: 5,
        gestiones_mes: 80,
        meta_diaria: 20,
        meta_mes_acumulada: 80,
        meta_mes_total: 440,
        cartera_total: 150,
        monto_cartera: 5000000,
        es_pool: false,
      })
    })

    it('maps numeric fields that are already numbers correctly', async () => {
      const result = await repo.getResumenDia()

      expect(result[1]).toEqual({
        cobradora_id: 'cob-2',
        cobradora_nombre: 'Beatriz Gómez',
        gestiones_hoy: 3,
        gestiones_mes: 60,
        meta_diaria: 18,
        meta_mes_acumulada: 60,
        meta_mes_total: 396,
        cartera_total: 120,
        monto_cartera: 4000000,
        es_pool: true,
      })
    })

    it('returns empty array when data is null without error', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.getResumenDia()

      expect(result).toEqual([])
    })

    it('throws RepositoryError on supabase error', async () => {
      // Use persistent mock so both assertions make a real call
      mockSelect.mockResolvedValue({
        data: null,
        error: { message: 'DB error', code: 'P0001' },
      })

      await expect(repo.getResumenDia()).rejects.toThrow(RepositoryError)
      await expect(repo.getResumenDia()).rejects.toThrow('DB error')
    })
  })

  describe('deferred methods (Slice C/D)', () => {
    it('getKpiGestionados throws RepositoryError with "not implemented"', async () => {
      await expect(repo.getKpiGestionados()).rejects.toThrow(RepositoryError)
      await expect(repo.getKpiGestionados()).rejects.toThrow('not implemented')
    })

    it('getDesgloseSegmento throws RepositoryError with "not implemented"', async () => {
      await expect(
        repo.getDesgloseSegmento('criticas', '2026-06-01'),
      ).rejects.toThrow(RepositoryError)
      await expect(
        repo.getDesgloseSegmento('criticas', '2026-06-01'),
      ).rejects.toThrow('not implemented')
    })

    it('getResumenGestiones throws RepositoryError with "not implemented"', async () => {
      await expect(
        repo.getResumenGestiones('cob-1', '2026-06-01'),
      ).rejects.toThrow(RepositoryError)
    })

    it('setearMeta throws RepositoryError with "not implemented"', async () => {
      const params: SetearMetaParams = {
        cobradoraId: 'cob-1',
        meta: 20,
        fecha: '2026-06-01',
        aplicarPermanente: false,
        motivo: null,
      }
      await expect(repo.setearMeta(params)).rejects.toThrow(RepositoryError)
    })
  })
})

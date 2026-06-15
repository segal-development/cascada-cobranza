import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import type { CargaRow } from '@/lib/ports'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { SupabaseCargaRepository } from './supabaseCargaRepository'

describe('SupabaseCargaRepository', () => {
  let repo: SupabaseCargaRepository

  const mockRows: CargaRow[] = [
    { rut: '12345678-9', nombre: 'Juan Perez', monto: 150000 },
    { rut: '98765432-1', nombre: 'Ana Lopez', monto: 80000 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseCargaRepository()

    // Default chain: from → select → order → limit (for listCargasHist)
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue({ data: [], error: null })
  })

  describe('cargaMensual', () => {
    const mockResult = { nuevos: 10, actualizados: 5, gestiones_migradas: 3 }

    it('calls rpc(cascada_carga_mensual) with p_registros and p_nombre_archivo', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockResult, error: null })

      await repo.cargaMensual(mockRows, 'cartera-2026-06.xlsx')

      expect(mockRpc).toHaveBeenCalledWith('cascada_carga_mensual', {
        p_registros: mockRows,
        p_nombre_archivo: 'cartera-2026-06.xlsx',
      })
    })

    it('returns CargaResult on success', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockResult, error: null })

      const result = await repo.cargaMensual(mockRows, 'cartera-2026-06.xlsx')

      expect(result).toEqual({ nuevos: 10, actualizados: 5, gestiones_migradas: 3 })
    })

    it('throws RepositoryError on RPC error', async () => {
      // Persistent mock so both assertions can fire
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Carga failed', code: 'P0002' },
      })

      await expect(repo.cargaMensual(mockRows, 'test.xlsx')).rejects.toThrow(RepositoryError)
      await expect(repo.cargaMensual(mockRows, 'test.xlsx')).rejects.toThrow('Carga failed')
    })
  })

  describe('listCargasHist', () => {
    const mockHist = [
      {
        created_at: '2026-05-01T10:00:00Z',
        registros_procesados: 1500,
        registros_nuevos: 50,
      },
    ]

    it('calls from(cascada_cargas_hist).select(*).order(created_at desc).limit(1)', async () => {
      mockLimit.mockResolvedValueOnce({ data: mockHist, error: null })

      await repo.listCargasHist()

      expect(mockFrom).toHaveBeenCalledWith('cascada_cargas_hist')
      expect(mockSelect).toHaveBeenCalledWith('*')
      // Most-recent carga requires explicit ordering — Postgres does not guarantee
      // row order without ORDER BY, so .limit(1) alone could return the oldest row.
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(1)
    })

    it('returns the CargaHist array on success', async () => {
      mockLimit.mockResolvedValueOnce({ data: mockHist, error: null })

      const result = await repo.listCargasHist()

      expect(result).toEqual(mockHist)
    })

    it('returns empty array when data is null', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.listCargasHist()

      expect(result).toEqual([])
    })

    it('throws RepositoryError on query error', async () => {
      // Persistent mock so both assertions can fire
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Query failed', code: 'P0001' },
      })

      await expect(repo.listCargasHist()).rejects.toThrow(RepositoryError)
      await expect(repo.listCargasHist()).rejects.toThrow('Query failed')
    })
  })

  describe('deferred stubs', () => {
    it('cargaPagos throws RepositoryError with "not implemented"', async () => {
      await expect(repo.cargaPagos([], 'test.xlsx')).rejects.toThrow(RepositoryError)
      await expect(repo.cargaPagos([], 'test.xlsx')).rejects.toThrow('not implemented')
    })

    it('aplicarSayorana throws RepositoryError with "not implemented"', async () => {
      await expect(repo.aplicarSayorana()).rejects.toThrow(RepositoryError)
      await expect(repo.aplicarSayorana()).rejects.toThrow('not implemented')
    })
  })
})

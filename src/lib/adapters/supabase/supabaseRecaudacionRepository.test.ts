import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { SupabaseRecaudacionRepository } from './supabaseRecaudacionRepository'

describe('SupabaseRecaudacionRepository', () => {
  let repo: SupabaseRecaudacionRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseRecaudacionRepository()
  })

  describe('recaudacionCobradora', () => {
    const mockData = [
      {
        cobradora: 'Ana Lopez',
        cuotas_pagadas: 15,
        clientes_pagaron: 10,
        monto_pagado: 5000000,
      },
      {
        cobradora: 'Beatriz Gomez',
        cuotas_pagadas: 8,
        clientes_pagaron: 6,
        monto_pagado: 2400000,
      },
    ]

    beforeEach(() => {
      mockFrom.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ order: mockOrder })
      mockOrder.mockResolvedValue({ data: mockData, error: null })
    })

    it('calls from(cascada_recaudacion_cobradora).select(*).order(monto_pagado, ascending:false)', async () => {
      await repo.recaudacionCobradora()

      expect(mockFrom).toHaveBeenCalledWith('cascada_recaudacion_cobradora')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('monto_pagado', { ascending: false })
    })

    it('returns RecaudacionRow[] on success', async () => {
      const result = await repo.recaudacionCobradora()

      expect(result).toEqual(mockData)
    })

    it('returns empty array when data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.recaudacionCobradora()

      expect(result).toEqual([])
    })

    it('throws RepositoryError on query error', async () => {
      // Persistent mock so both assertions can fire
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'View error', code: 'P0001' },
      })

      await expect(repo.recaudacionCobradora()).rejects.toThrow(RepositoryError)
      await expect(repo.recaudacionCobradora()).rejects.toThrow('View error')
    })
  })

  describe('historialPagos', () => {
    const mockData = [
      {
        created_at: '2026-05-01T10:00:00Z',
        nombre_archivo: 'pagos-mayo.xlsx',
        registros_archivo: 100,
        cuotas_marcadas: 85,
        subido_por: 'Ana',
      },
    ]

    beforeEach(() => {
      mockFrom.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ limit: mockLimit })
      mockLimit.mockResolvedValue({ data: mockData, error: null })
    })

    it('calls from(cascada_historial_pagos).select(*).limit(20)', async () => {
      await repo.historialPagos()

      expect(mockFrom).toHaveBeenCalledWith('cascada_historial_pagos')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockLimit).toHaveBeenCalledWith(20)
    })

    it('returns HistorialPagoRow[] on success', async () => {
      const result = await repo.historialPagos()

      expect(result).toEqual(mockData)
    })

    it('returns empty array when data is null', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.historialPagos()

      expect(result).toEqual([])
    })

    it('throws RepositoryError on query error', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Historial error', code: 'P0001' },
      })

      await expect(repo.historialPagos()).rejects.toThrow(RepositoryError)
      await expect(repo.historialPagos()).rejects.toThrow('Historial error')
    })
  })

  describe('cuotasPagadas', () => {
    const mockData = [
      {
        nombre: 'Juan Perez',
        rut: '12345678-9',
        nro_cuota: '3',
        nro_total_cuotas: 12,
        monto: 150000,
        cobradora: 'Ana',
        fec_vencimiento: '2026-05-01',
      },
    ]

    beforeEach(() => {
      mockFrom.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ limit: mockLimit })
      mockLimit.mockResolvedValue({ data: mockData, error: null })
    })

    it('calls from(cascada_cuotas_pagadas).select(*).limit(200)', async () => {
      await repo.cuotasPagadas()

      expect(mockFrom).toHaveBeenCalledWith('cascada_cuotas_pagadas')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockLimit).toHaveBeenCalledWith(200)
    })

    it('returns CuotaPagadaRow[] on success', async () => {
      const result = await repo.cuotasPagadas()

      expect(result).toEqual(mockData)
    })

    it('returns empty array when data is null', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null })

      const result = await repo.cuotasPagadas()

      expect(result).toEqual([])
    })

    it('throws RepositoryError on query error', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Cuotas error', code: 'P0001' },
      })

      await expect(repo.cuotasPagadas()).rejects.toThrow(RepositoryError)
      await expect(repo.cuotasPagadas()).rejects.toThrow('Cuotas error')
    })
  })
})

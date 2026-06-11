import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryError } from '@/lib/errors'
import type { Cliente } from '@/types'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockNot = vi.fn()
const mockNot2 = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { SupabaseColaRepository } from './supabaseColaRepository'

describe('SupabaseColaRepository', () => {
  let repo: SupabaseColaRepository

  const mockClienteRow: Cliente = {
    rut: '12345678-9',
    cuota_id: 'cuota-1',
    nombre: 'Juan Perez',
    regla: 'R5',
    dias_mora: 30,
    monto: 150000,
    nro_cuota: 3,
    nro_total_cuotas: 12,
    zona_critica: null,
    estado_gestion: 'sin_gestion',
    cobradora_id: 'cob-1',
    celular: '912345678',
    telefono: null,
    email: null,
    fec_vencimiento: '2026-05-01',
    accion_sugerida: 'Llamar urgente',
    ultima_gestion_fecha: null,
    ultimo_efecto: null,
    ultima_gestion_nota: null,
    fec_proxima: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseColaRepository()

    // Chain for countPendientes: from → select → eq → not → not (returns count)
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ not: mockNot })
    mockNot.mockReturnValue({ not: mockNot2 })
    mockNot2.mockResolvedValue({ count: 42, error: null })
  })

  describe('siguienteCliente', () => {
    it('calls rpc(cascada_siguiente_cliente)', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { ...mockClienteRow, fin_cola: false },
        error: null,
      })

      await repo.siguienteCliente()

      expect(mockRpc).toHaveBeenCalledWith('cascada_siguiente_cliente')
    })

    it('returns ColaAgotada discriminated union when fin_cola is true', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { fin_cola: true, mensaje: 'No hay más clientes en la cola' },
        error: null,
      })

      const result = await repo.siguienteCliente()

      expect(result).toEqual({ fin_cola: true, mensaje: 'No hay más clientes en la cola' })
    })

    it('returns full client row when fin_cola is false', async () => {
      const clienteRow = { ...mockClienteRow, fin_cola: false }
      mockRpc.mockResolvedValueOnce({ data: clienteRow, error: null })

      const result = await repo.siguienteCliente()

      expect(result).toEqual(clienteRow)
      // Verify it is not the ColaAgotada branch
      expect('fin_cola' in result && result.fin_cola).not.toBe(true)
    })

    it('returns full client row when fin_cola field is absent', async () => {
      mockRpc.mockResolvedValueOnce({ data: mockClienteRow, error: null })

      const result = await repo.siguienteCliente()

      expect((result as Cliente).rut).toBe('12345678-9')
    })

    it('throws RepositoryError on RPC error', async () => {
      // Use persistent mock so both assertions make a real call
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed', code: 'P0002' },
      })

      await expect(repo.siguienteCliente()).rejects.toThrow(RepositoryError)
      await expect(repo.siguienteCliente()).rejects.toThrow('RPC failed')
    })

    it('throws RepositoryError when the RPC returns null data without error', async () => {
      // A Postgres function returning NULL yields { data: null, error: null }.
      mockRpc.mockResolvedValue({ data: null, error: null })

      await expect(repo.siguienteCliente()).rejects.toThrow(RepositoryError)
      await expect(repo.siguienteCliente()).rejects.toThrow('empty result')
    })
  })

  describe('countPendientes', () => {
    it('calls from(cascada_clientes).select(rut count exact head) with all filter predicates', async () => {
      await repo.countPendientes()

      expect(mockFrom).toHaveBeenCalledWith('cascada_clientes')
      expect(mockSelect).toHaveBeenCalledWith('rut', { count: 'exact', head: true })
      expect(mockEq).toHaveBeenCalledWith('estado_cuota', 'vigente')
      expect(mockNot).toHaveBeenCalledWith('regla', 'in', '(SAYORANA,PAGADO,R6)')
      expect(mockNot2).toHaveBeenCalledWith(
        'estado_gestion',
        'in',
        '(gestionado_hoy,compromiso_vigente,verificacion_pendiente)',
      )
    })

    it('returns the count from the query', async () => {
      mockNot2.mockResolvedValueOnce({ count: 42, error: null })

      const result = await repo.countPendientes()

      expect(result).toBe(42)
    })

    it('returns 0 when count is null', async () => {
      mockNot2.mockResolvedValueOnce({ count: null, error: null })

      const result = await repo.countPendientes()

      expect(result).toBe(0)
    })

    it('throws RepositoryError on query error', async () => {
      // Use persistent mock so both assertions make a real call
      mockNot2.mockResolvedValue({
        count: null,
        error: { message: 'Count failed', code: 'P0003' },
      })

      await expect(repo.countPendientes()).rejects.toThrow(RepositoryError)
      await expect(repo.countPendientes()).rejects.toThrow('Count failed')
    })
  })
})

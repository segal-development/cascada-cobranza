import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useColaStore } from './colaStore'
import type { Cliente } from '@/types'

const mockSiguienteCliente = vi.fn()
const mockCountPendientes = vi.fn()

vi.mock('@/lib/repositories', () => ({
  repositories: {
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthChange: vi.fn(),
      getPerfil: vi.fn(),
    },
    cartera: { listClientes: vi.fn() },
    resumen: {
      getResumenDia: vi.fn(),
      getKpiGestionados: vi.fn(),
      getDesgloseSegmento: vi.fn(),
      getResumenGestiones: vi.fn(),
      setearMeta: vi.fn(),
    },
    cola: {
      siguienteCliente: (...args: unknown[]) => mockSiguienteCliente(...args),
      countPendientes: (...args: unknown[]) => mockCountPendientes(...args),
    },
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

describe('colaStore', () => {
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
    useColaStore.getState().reset()
    mockCountPendientes.mockResolvedValue(10)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchSiguiente', () => {
    it('calls repositories.cola.siguienteCliente()', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockClienteRow)

      await useColaStore.getState().fetchSiguiente()

      expect(mockSiguienteCliente).toHaveBeenCalledOnce()
    })

    it('sets isActive: true and returns the result on success', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockClienteRow)

      const result = await useColaStore.getState().fetchSiguiente()

      expect(result).toEqual(mockClienteRow)
      expect(useColaStore.getState().isActive).toBe(true)
    })

    it('returns ColaAgotada result when the queue is exhausted', async () => {
      const agotada = { fin_cola: true as const, mensaje: 'No hay más clientes' }
      mockSiguienteCliente.mockResolvedValueOnce(agotada)

      const result = await useColaStore.getState().fetchSiguiente()

      expect(result).toEqual(agotada)
      expect(useColaStore.getState().isActive).toBe(true)
    })

    it('sets isLoading: true during fetch and false after', async () => {
      let loadingDuringFetch = false
      mockSiguienteCliente.mockImplementationOnce(() => {
        loadingDuringFetch = useColaStore.getState().isLoading
        return Promise.resolve(mockClienteRow)
      })

      await useColaStore.getState().fetchSiguiente()

      expect(loadingDuringFetch).toBe(true)
      expect(useColaStore.getState().isLoading).toBe(false)
    })

    it('sets error state and returns null on failure', async () => {
      mockSiguienteCliente.mockRejectedValueOnce(new Error('RPC failed'))

      const result = await useColaStore.getState().fetchSiguiente()

      expect(result).toBeNull()
      expect(useColaStore.getState().error).toBe('RPC failed')
      expect(useColaStore.getState().isLoading).toBe(false)
    })
  })

  describe('countPendientes action', () => {
    it('calls repositories.cola.countPendientes() and updates state.pendientes', async () => {
      mockCountPendientes.mockResolvedValueOnce(25)

      await useColaStore.getState().countPendientes()

      expect(mockCountPendientes).toHaveBeenCalledOnce()
      expect(useColaStore.getState().pendientes).toBe(25)
    })

    it('sets pendientes to 0 on failure (silent fail)', async () => {
      mockCountPendientes.mockRejectedValueOnce(new Error('Count failed'))

      await useColaStore.getState().countPendientes()

      expect(useColaStore.getState().pendientes).toBe(0)
    })
  })

  describe('non-RPC actions (preserved behavior)', () => {
    it('activar sets cola and isActive: true', () => {
      const clientes = [mockClienteRow]
      useColaStore.getState().activar(clientes)

      expect(useColaStore.getState().isActive).toBe(true)
      expect(useColaStore.getState().cola).toEqual(clientes)
      expect(useColaStore.getState().indiceActual).toBe(0)
    })

    it('desactivar sets isActive: false', () => {
      useColaStore.setState({ isActive: true })
      useColaStore.getState().desactivar()

      expect(useColaStore.getState().isActive).toBe(false)
    })

    it('siguiente advances indiceActual cyclically', () => {
      const clientes = [mockClienteRow, { ...mockClienteRow, rut: '99999999-9', cuota_id: 'c2' }]
      useColaStore.getState().activar(clientes)

      useColaStore.getState().siguiente()
      expect(useColaStore.getState().indiceActual).toBe(1)
    })

    it('reset clears all state to initial values', () => {
      useColaStore.setState({ pendientes: 10, isActive: true, error: 'some error' })
      useColaStore.getState().reset()

      const state = useColaStore.getState()
      expect(state.pendientes).toBe(0)
      expect(state.isActive).toBe(false)
      expect(state.error).toBeNull()
      expect(state.cola).toEqual([])
    })
  })
})

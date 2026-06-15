import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useColaStore } from './colaStore'
import { useUIStore } from './uiStore'
import type { Cliente } from '@/types'

const mockSiguienteCliente = vi.fn()
const mockCountPendientes = vi.fn()
const mockRegistrarGestion = vi.fn()

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
    gestion: {
      registrarGestion: (...args: unknown[]) => mockRegistrarGestion(...args),
      gestionesRango: vi.fn(),
    },
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
    estado_cuota: 'vigente',
    cobradora_id: 'cob-1',
    celular: '912345678',
    telefono: null,
    movil_efectivo: null,
    email: null,
    fec_vencimiento: '2026-05-01',
    accion_sugerida: 'Llamar urgente',
    ultima_gestion_fecha: null,
    ultimo_efecto: null,
    ultima_gestion_nota: null,
    fec_proxima: null,
  }

  const mockNextCliente: Cliente = {
    ...mockClienteRow,
    rut: '99999999-9',
    cuota_id: 'cuota-2',
    nombre: 'María López',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useColaStore.getState().reset()
    useUIStore.setState({ activeModal: null, clienteActual: null, toast: null })
    mockCountPendientes.mockResolvedValue(10)
    mockRegistrarGestion.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Existing actions (preserved)
  // ---------------------------------------------------------------------------

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

    it('reset clears all state to initial values including colaModeActive', () => {
      useColaStore.setState({ pendientes: 10, isActive: true, error: 'some error', colaModeActive: true })
      useColaStore.getState().reset()

      const state = useColaStore.getState()
      expect(state.pendientes).toBe(0)
      expect(state.isActive).toBe(false)
      expect(state.error).toBeNull()
      expect(state.cola).toEqual([])
      expect(state.colaModeActive).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // New: colaModeActive flag (PR-04)
  // ---------------------------------------------------------------------------

  describe('colaModeActive initial state', () => {
    it('starts as false', () => {
      expect(useColaStore.getState().colaModeActive).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // New: enterColaMode (PR-04)
  // ---------------------------------------------------------------------------

  describe('enterColaMode', () => {
    it('calls repositories.cola.siguienteCliente()', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockClienteRow)

      await useColaStore.getState().enterColaMode()

      expect(mockSiguienteCliente).toHaveBeenCalledOnce()
    })

    it('sets colaModeActive: true when next client is returned', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockClienteRow)

      await useColaStore.getState().enterColaMode()

      expect(useColaStore.getState().colaModeActive).toBe(true)
    })

    it('opens ClienteModal via uiStore when next client is returned', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockClienteRow)

      await useColaStore.getState().enterColaMode()

      expect(useUIStore.getState().activeModal).toBe('cliente')
      expect(useUIStore.getState().clienteActual).toMatchObject({ rut: '12345678-9' })
    })

    it('does NOT set colaModeActive when fin_cola', async () => {
      const agotada = { fin_cola: true as const, mensaje: 'Cola vacía' }
      mockSiguienteCliente.mockResolvedValueOnce(agotada)

      await useColaStore.getState().enterColaMode()

      expect(useColaStore.getState().colaModeActive).toBe(false)
    })

    it('shows a toast when fin_cola', async () => {
      const agotada = { fin_cola: true as const, mensaje: 'Cola vacía' }
      mockSiguienteCliente.mockResolvedValueOnce(agotada)

      await useColaStore.getState().enterColaMode()

      expect(useUIStore.getState().toast).not.toBeNull()
      expect(useUIStore.getState().toast?.message).toBe('Cola vacía')
    })

    it('does NOT open modal when fin_cola', async () => {
      const agotada = { fin_cola: true as const, mensaje: 'Cola vacía' }
      mockSiguienteCliente.mockResolvedValueOnce(agotada)

      await useColaStore.getState().enterColaMode()

      expect(useUIStore.getState().activeModal).toBeNull()
    })

    it('sets error state on failure without throwing', async () => {
      mockSiguienteCliente.mockRejectedValueOnce(new Error('Network error'))

      await useColaStore.getState().enterColaMode()

      expect(useColaStore.getState().error).toBe('Network error')
      expect(useColaStore.getState().colaModeActive).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // New: exitColaMode (PR-04)
  // ---------------------------------------------------------------------------

  describe('exitColaMode', () => {
    it('sets colaModeActive: false', () => {
      useColaStore.setState({ colaModeActive: true })
      useUIStore.setState({ activeModal: 'cliente', clienteActual: mockClienteRow })

      useColaStore.getState().exitColaMode()

      expect(useColaStore.getState().colaModeActive).toBe(false)
    })

    it('closes the modal via uiStore', () => {
      useColaStore.setState({ colaModeActive: true })
      useUIStore.setState({ activeModal: 'cliente', clienteActual: mockClienteRow })

      useColaStore.getState().exitColaMode()

      expect(useUIStore.getState().activeModal).toBeNull()
      expect(useUIStore.getState().clienteActual).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // New: submitGestion (PR-04)
  // ---------------------------------------------------------------------------

  describe('submitGestion', () => {
    const gestionInput = {
      rut: '12345678-9',
      cuotaId: 'cuota-1',
      tipo: 'llamada',
      efecto: 'no_contesta',
      nota: null,
      fecProxima: null,
    }

    it('calls registrarGestion with the provided input', async () => {
      useColaStore.setState({ colaModeActive: false })

      await useColaStore.getState().submitGestion(gestionInput)

      expect(mockRegistrarGestion).toHaveBeenCalledWith(gestionInput)
    })

    describe('when NOT in cola mode', () => {
      it('closes the modal via uiStore after registering', async () => {
        useColaStore.setState({ colaModeActive: false })
        useUIStore.setState({ activeModal: 'cliente', clienteActual: mockClienteRow })

        await useColaStore.getState().submitGestion(gestionInput)

        expect(useUIStore.getState().activeModal).toBeNull()
      })

      it('does NOT call siguienteCliente', async () => {
        useColaStore.setState({ colaModeActive: false })

        await useColaStore.getState().submitGestion(gestionInput)

        expect(mockSiguienteCliente).not.toHaveBeenCalled()
      })
    })

    describe('when in cola mode and next client is returned', () => {
      it('calls siguienteCliente after registering gestión', async () => {
        useColaStore.setState({ colaModeActive: true })
        mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)

        await useColaStore.getState().submitGestion(gestionInput)

        expect(mockSiguienteCliente).toHaveBeenCalledOnce()
      })

      it('opens modal with the next client via uiStore', async () => {
        useColaStore.setState({ colaModeActive: true })
        mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)

        await useColaStore.getState().submitGestion(gestionInput)

        expect(useUIStore.getState().activeModal).toBe('cliente')
        expect(useUIStore.getState().clienteActual).toMatchObject({ rut: '99999999-9' })
      })
    })

    describe('when in cola mode and queue is exhausted (fin_cola)', () => {
      it('closes the modal via uiStore', async () => {
        useColaStore.setState({ colaModeActive: true })
        useUIStore.setState({ activeModal: 'cliente', clienteActual: mockClienteRow })
        mockSiguienteCliente.mockResolvedValueOnce({ fin_cola: true as const, mensaje: 'Fin de cola' })

        await useColaStore.getState().submitGestion(gestionInput)

        expect(useUIStore.getState().activeModal).toBeNull()
      })

      it('sets colaModeActive: false', async () => {
        useColaStore.setState({ colaModeActive: true })
        mockSiguienteCliente.mockResolvedValueOnce({ fin_cola: true as const, mensaje: 'Fin de cola' })

        await useColaStore.getState().submitGestion(gestionInput)

        expect(useColaStore.getState().colaModeActive).toBe(false)
      })
    })

    describe('on registrarGestion error', () => {
      it('sets error state and rethrows', async () => {
        useColaStore.setState({ colaModeActive: false })
        mockRegistrarGestion.mockRejectedValueOnce(new Error('RPC error'))

        await expect(useColaStore.getState().submitGestion(gestionInput)).rejects.toThrow('RPC error')
        expect(useColaStore.getState().error).toBe('RPC error')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // New: saltar (PR-04)
  // ---------------------------------------------------------------------------

  describe('saltar', () => {
    it('calls siguienteCliente WITHOUT calling registrarGestion', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)

      await useColaStore.getState().saltar()

      expect(mockSiguienteCliente).toHaveBeenCalledOnce()
      expect(mockRegistrarGestion).not.toHaveBeenCalled()
    })

    it('opens modal with the next client via uiStore', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)

      await useColaStore.getState().saltar()

      expect(useUIStore.getState().activeModal).toBe('cliente')
      expect(useUIStore.getState().clienteActual).toMatchObject({ rut: '99999999-9' })
    })

    describe('when queue is exhausted (fin_cola)', () => {
      it('closes the modal via uiStore', async () => {
        useUIStore.setState({ activeModal: 'cliente', clienteActual: mockClienteRow })
        mockSiguienteCliente.mockResolvedValueOnce({ fin_cola: true as const, mensaje: 'Fin de cola' })

        await useColaStore.getState().saltar()

        expect(useUIStore.getState().activeModal).toBeNull()
      })

      it('sets colaModeActive: false', async () => {
        useColaStore.setState({ colaModeActive: true })
        mockSiguienteCliente.mockResolvedValueOnce({ fin_cola: true as const, mensaje: 'Fin de cola' })

        await useColaStore.getState().saltar()

        expect(useColaStore.getState().colaModeActive).toBe(false)
      })
    })

    it('sets error state on failure without throwing', async () => {
      mockSiguienteCliente.mockRejectedValueOnce(new Error('Network error'))

      await useColaStore.getState().saltar()

      expect(useColaStore.getState().error).toBe('Network error')
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useResumenStore } from './resumenStore'
import type { ResumenCobradora } from '@/lib/ports'

const mockGetResumenDia = vi.fn()

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
      getResumenDia: (...args: unknown[]) => mockGetResumenDia(...args),
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

describe('resumenStore', () => {
  const mockRows: ResumenCobradora[] = [
    {
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
      es_pool: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useResumenStore.getState().reset()
    mockGetResumenDia.mockResolvedValue(mockRows)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls repositories.resumen.getResumenDia()', async () => {
    await useResumenStore.getState().loadResumen('cob-1', 'cobradora', 'todos')

    expect(mockGetResumenDia).toHaveBeenCalledOnce()
  })

  it('sets resumenTodas with all rows returned by the repository', async () => {
    await useResumenStore.getState().loadResumen('cob-1', 'cobradora', 'todos')

    const state = useResumenStore.getState()
    expect(state.resumenTodas).toEqual(mockRows)
  })

  it('aggregates all cobradoras when jefatura filtroAmbito is "todos"', async () => {
    await useResumenStore.getState().loadResumen('jef-1', 'jefatura', 'todos')

    const state = useResumenStore.getState()
    expect(state.resumen?.gestiones_hoy).toBe(8) // 5 + 3
    expect(state.resumen?.gestiones_mes).toBe(140) // 80 + 60
    expect(state.resumen?.meta).toBe(38) // 20 + 18
    expect(state.resumen?.cartera).toBe(270) // 150 + 120
  })

  it('filters to specific cobradora when jefatura filtroAmbito is a cobradoraId', async () => {
    await useResumenStore.getState().loadResumen('jef-1', 'jefatura', 'cob-1')

    const state = useResumenStore.getState()
    expect(state.resumen?.gestiones_hoy).toBe(5)
    expect(state.resumen?.meta).toBe(20)
    expect(state.resumen?.cartera).toBe(150)
  })

  it('returns zeroed resumen for jefatura when filtroAmbito cobradoraId not found', async () => {
    await useResumenStore.getState().loadResumen('jef-1', 'jefatura', 'cob-nonexistent')

    const state = useResumenStore.getState()
    expect(state.resumen?.gestiones_hoy).toBe(0)
    expect(state.resumen?.meta).toBe(0)
  })

  it('returns own data when role is cobradora', async () => {
    await useResumenStore.getState().loadResumen('cob-2', 'cobradora', 'todos')

    const state = useResumenStore.getState()
    expect(state.resumen?.gestiones_hoy).toBe(3)
    expect(state.resumen?.meta).toBe(18)
  })

  it('sets isLoading: true during fetch and false after', async () => {
    let loadingDuringFetch = false
    mockGetResumenDia.mockImplementationOnce(() => {
      loadingDuringFetch = useResumenStore.getState().isLoading
      return Promise.resolve(mockRows)
    })

    await useResumenStore.getState().loadResumen('cob-1', 'cobradora', 'todos')

    expect(loadingDuringFetch).toBe(true)
    expect(useResumenStore.getState().isLoading).toBe(false)
  })

  it('sets error state on repository failure', async () => {
    mockGetResumenDia.mockRejectedValueOnce(new Error('DB connection failed'))

    await useResumenStore.getState().loadResumen('cob-1', 'cobradora', 'todos')

    const state = useResumenStore.getState()
    expect(state.error).toBe('DB connection failed')
    expect(state.isLoading).toBe(false)
  })

  it('reset clears all state to initial values', () => {
    useResumenStore.setState({ isLoading: true, error: 'some error' })
    useResumenStore.getState().reset()

    const state = useResumenStore.getState()
    expect(state.resumen).toBeNull()
    expect(state.resumenTodas).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})

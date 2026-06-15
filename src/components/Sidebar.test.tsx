import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Perfil } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useColaStore } from '@/stores/colaStore'
import { useCarteraStore } from '@/stores/carteraStore'
import { useResumenStore } from '@/stores/resumenStore'
import type { ResumenCobradora } from '@/lib/ports'

const mockEnterColaMode = vi.fn()
const mockSiguienteCliente = vi.fn()
const mockListCargasHist = vi.fn()

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
      countPendientes: vi.fn(),
    },
    gestion: { registrarGestion: vi.fn(), gestionesRango: vi.fn() },
    carga: {
      cargaMensual: vi.fn(),
      listCargasHist: (...args: unknown[]) => mockListCargasHist(...args),
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

const mockPerfilCobradora: Perfil = {
  id: 'user-cob',
  nombre: 'Ana Test',
  rol: 'cobradora',
  meta_diaria: 15,
  es_pool: false,
}

const mockPerfilJefatura: Perfil = {
  id: 'user-jef',
  nombre: 'Jefa Test',
  rol: 'jefatura',
  meta_diaria: 0,
  es_pool: false,
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnterColaMode.mockResolvedValue(undefined)
    mockSiguienteCliente.mockResolvedValue({ fin_cola: true as const, mensaje: 'Cola vacía' })
    // Default: resolve with empty array so ÚLTIMA CARGA section renders without hanging
    mockListCargasHist.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useColaStore.getState().reset()
    useCarteraStore.getState().reset()
    useResumenStore.getState().reset()
  })

  async function getSidebar() {
    const { Sidebar } = await import('./Sidebar')
    return Sidebar
  }

  describe('Siguiente cliente button — visible to all authenticated users', () => {
    it('renders "Siguiente cliente" button for cobradora role', async () => {
      useAuthStore.setState({ perfil: mockPerfilCobradora, user: { id: 'user-cob' }, isLoading: false })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByRole('button', { name: /siguiente cliente/i })).toBeDefined()
    })

    it('renders "Siguiente cliente" button for jefatura role', async () => {
      useAuthStore.setState({ perfil: mockPerfilJefatura, user: { id: 'user-jef' }, isLoading: false })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByRole('button', { name: /siguiente cliente/i })).toBeDefined()
    })

    it('calls colaStore.enterColaMode when "Siguiente cliente" is clicked', async () => {
      useAuthStore.setState({ perfil: mockPerfilCobradora, user: { id: 'user-cob' }, isLoading: false })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      fireEvent.click(screen.getByRole('button', { name: /siguiente cliente/i }))

      await waitFor(() => {
        // enterColaMode calls siguienteCliente internally
        expect(mockSiguienteCliente).toHaveBeenCalled()
      })
    })
  })

  describe('Jefatura-only sections', () => {
    it('renders Carga Mensual button for jefatura', async () => {
      useAuthStore.setState({ perfil: mockPerfilJefatura, user: { id: 'user-jef' }, isLoading: false })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText('Carga Mensual')).toBeDefined()
    })

    it('does NOT render Carga Mensual button for cobradora', async () => {
      useAuthStore.setState({ perfil: mockPerfilCobradora, user: { id: 'user-cob' }, isLoading: false })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.queryByText('Carga Mensual')).toBeNull()
    })
  })

  describe('Jefatura live data — CARTERAS, ATENCIÓN PRIORITARIA, ÚLTIMA CARGA', () => {
    const mockResumenTodas: ResumenCobradora[] = [
      {
        cobradora_id: 'c1',
        cobradora_nombre: 'María González',
        cartera_total: 48,
        es_pool: false,
        gestiones_hoy: 5,
        gestiones_mes: 100,
        meta_diaria: 15,
        meta_mes_acumulada: 300,
        meta_mes_total: 330,
        monto_cartera: 5000000,
      },
      {
        cobradora_id: 'c2',
        cobradora_nombre: 'Ana Silva',
        cartera_total: 52,
        es_pool: false,
        gestiones_hoy: 8,
        gestiones_mes: 120,
        meta_diaria: 15,
        meta_mes_acumulada: 350,
        meta_mes_total: 330,
        monto_cartera: 6000000,
      },
      {
        cobradora_id: 'pool',
        cobradora_nombre: 'Pool general',
        cartera_total: 141,
        es_pool: true,
        gestiones_hoy: 0,
        gestiones_mes: 0,
        meta_diaria: 0,
        meta_mes_acumulada: 0,
        meta_mes_total: 0,
        monto_cartera: 10000000,
      },
    ]

    beforeEach(() => {
      useAuthStore.setState({ perfil: mockPerfilJefatura, user: { id: 'user-jef' }, isLoading: false })
      useResumenStore.setState({ resumenTodas: mockResumenTodas, resumen: null, isLoading: false, error: null })
      useCarteraStore.getState().reset()
      mockListCargasHist.mockResolvedValue([])
    })

    // CARTERAS section
    it('renders CARTERAS section header', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)
      expect(screen.getByText('Cobradoras')).toBeDefined()
    })

    it('renders real cobradora names from resumenStore (not placeholder data)', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText('María González')).toBeDefined()
      expect(screen.getByText('Ana Silva')).toBeDefined()
      expect(screen.getByText('Pool general')).toBeDefined()
    })

    it('does NOT render placeholder cobradora name "Carmen Pérez"', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.queryByText('Carmen Pérez')).toBeNull()
    })

    it('renders cartera_total count for each cobradora', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText('48')).toBeDefined()
      expect(screen.getByText('52')).toBeDefined()
      expect(screen.getByText('141')).toBeDefined()
    })

    // ATENCIÓN PRIORITARIA section
    it('renders ATENCIÓN PRIORITARIA section header', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      // "Atención Prioritaria" — use .* to match accented ó
      expect(screen.getByText(/atenci.n prioritaria/i)).toBeDefined()
    })

    it('renders all 5 priority bucket labels', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText('Vence hoy')).toBeDefined()
      expect(screen.getByText(/al l.mite/i)).toBeDefined()
      expect(screen.getByText(/pre-bloqueo/i)).toBeDefined()
      expect(screen.getByText(/mora activa/i)).toBeDefined()
      expect(screen.getByText(/primer contacto/i)).toBeDefined()
    })

    it('renders bucket counts derived from carteraStore clientes', async () => {
      // Set clientes with known priority bucket membership
      useCarteraStore.setState({
        clientes: [
          {
            rut: '1-1', cuota_id: 'c1', nombre: 'A', regla: 'R5', dias_mora: 10,
            monto: 1000, nro_cuota: 1, nro_total_cuotas: 12, zona_critica: null,
            estado_gestion: 'sin_gestion', estado_cuota: 'vigente', cobradora_id: 'c1',
            celular: null, telefono: null, movil_efectivo: null, email: null,
            fec_vencimiento: '2026-05-01', accion_sugerida: '', ultima_gestion_fecha: null,
            ultimo_efecto: null, ultima_gestion_nota: null, fec_proxima: null,
          },
          {
            rut: '1-2', cuota_id: 'c2', nombre: 'B', regla: 'R1', dias_mora: 5,
            monto: 1000, nro_cuota: 1, nro_total_cuotas: 12, zona_critica: null,
            estado_gestion: 'sin_gestion', estado_cuota: 'vigente', cobradora_id: 'c1',
            celular: null, telefono: null, movil_efectivo: null, email: null,
            fec_vencimiento: '2026-05-01', accion_sugerida: '', ultima_gestion_fecha: null,
            ultimo_efecto: null, ultima_gestion_nota: null, fec_proxima: null,
          },
        ],
      })

      const Sidebar = await getSidebar()
      render(<Sidebar />)

      // R5 bucket = 1, R1 bucket = 1 — we just check the text exists in the rendered output
      // (counts are rendered as font-mono spans near the labels)
      const r5Buttons = screen.getAllByRole('button')
      const r5BucketExists = r5Buttons.some(
        (btn) => btn.textContent?.includes('R5') && btn.textContent?.includes('1'),
      )
      expect(r5BucketExists).toBe(true)
    })

    it('clicking a priority bucket calls setFiltroPrioritario', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      const venceHoyButton = screen.getByText('Vence hoy').closest('button')
      expect(venceHoyButton).toBeDefined()
      fireEvent.click(venceHoyButton!)

      expect(useCarteraStore.getState().filtroPrioritario).toBe('vence_hoy')
    })

    it('clicking an active priority bucket clears the filter (toggle)', async () => {
      useCarteraStore.setState({ filtroPrioritario: 'vence_hoy' })
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      const venceHoyButton = screen.getByText('Vence hoy').closest('button')
      fireEvent.click(venceHoyButton!)

      expect(useCarteraStore.getState().filtroPrioritario).toBeNull()
    })

    // ÚLTIMA CARGA section
    it('renders ÚLTIMA CARGA section header', async () => {
      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText(/ltima carga/i)).toBeDefined()
    })

    it('shows registros_procesados count from listCargasHist', async () => {
      mockListCargasHist.mockResolvedValueOnce([
        { created_at: '2026-06-15T10:00:00Z', registros_procesados: 500, registros_nuevos: 50 },
      ])

      const Sidebar = await getSidebar()
      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText(/500/)).toBeDefined()
      })
    })

    it('shows loading state before listCargasHist resolves', async () => {
      // Never resolves during this test
      mockListCargasHist.mockReturnValue(new Promise(() => {}))

      const Sidebar = await getSidebar()
      render(<Sidebar />)

      expect(screen.getByText(/cargando/i)).toBeDefined()
    })

    it('shows error state when listCargasHist rejects', async () => {
      mockListCargasHist.mockRejectedValueOnce(new Error('DB error'))

      const Sidebar = await getSidebar()
      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined()
      })
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import type { Cliente, Perfil } from '@/types'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useColaStore } from '@/stores/colaStore'

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------
const mockRegistrarGestion = vi.fn()
const mockSiguienteCliente = vi.fn()

vi.mock('@/lib/repositories', () => ({
  repositories: {
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthChange: vi.fn(),
      getPerfil: vi.fn(),
    },
    cartera: { listClientes: vi.fn().mockResolvedValue([]) },
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

// ---------------------------------------------------------------------------
// UI mocks — replace Base UI Select with native <select> for testability
// ---------------------------------------------------------------------------
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => (
    <select value={value ?? ''} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

// Replace portal-based Modal with a simple wrapper so the form is in the DOM
vi.mock('./Modal', () => ({
  Modal: ({
    isOpen,
    children,
  }: {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
  }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
  ModalHeader: ({
    children,
  }: {
    children: React.ReactNode
    onClose?: () => void
  }) => <div>{children}</div>,
  ModalBody: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
}))

vi.mock('./RuleChip', () => ({ RuleChip: () => null }))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const mockCliente: Cliente = {
  rut: '12345678-9',
  cuota_id: 'cuota-abc',
  nombre: 'Juan Perez',
  regla: 'R2',
  dias_mora: 20,
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
  fec_vencimiento: '2026-07-01',
  accion_sugerida: 'Llamar',
  ultima_gestion_fecha: null,
  ultimo_efecto: null,
  ultima_gestion_nota: null,
  fec_proxima: null,
}

const mockNextCliente: Cliente = {
  ...mockCliente,
  rut: '99999999-9',
  cuota_id: 'cuota-next',
  nombre: 'Siguiente Cliente',
}

const mockPerfil: Perfil = {
  id: 'user-1',
  nombre: 'Test User',
  rol: 'cobradora',
  meta_diaria: 15,
  es_pool: false,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmit(buttonText: string) {
  const selects = screen.getAllByRole('combobox')
  fireEvent.change(selects[0]!, { target: { value: 'llamada' } })
  fireEvent.change(selects[1]!, { target: { value: 'no_contesta' } })
  fireEvent.click(screen.getByText(buttonText))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ClienteModal — gestion dispatch', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRegistrarGestion.mockResolvedValue(undefined)
    mockSiguienteCliente.mockResolvedValue(mockNextCliente)

    // Set store state so the modal renders in open state with a client
    useUIStore.setState({ activeModal: 'cliente', clienteActual: mockCliente })
    useAuthStore.setState({ perfil: mockPerfil, user: { id: 'user-1' }, isLoading: false })
    useColaStore.setState({ colaModeActive: false })
  })

  afterEach(() => {
    useUIStore.setState({ activeModal: null, clienteActual: null })
    useColaStore.getState().reset()
  })

  // Lazy import inside tests so module mocks are applied first
  async function getClienteModal() {
    const { ClienteModal } = await import('./ClienteModal')
    return ClienteModal
  }

  // ---------------------------------------------------------------------------
  // Solo guardar
  // ---------------------------------------------------------------------------
  describe('Solo guardar button', () => {
    it('calls registrarGestion with rut from the current cliente', async () => {
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Solo guardar')

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalledWith({
          rut: '12345678-9',
          cuotaId: 'cuota-abc',
          tipo: 'llamada',
          efecto: 'no_contesta',
          nota: null,
          fecProxima: null,
        })
      })
    })

    it('does NOT pass undefined for nota — coerces empty string to null', async () => {
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      const selects = screen.getAllByRole('combobox')
      fireEvent.change(selects[0]!, { target: { value: 'sms' } })
      fireEvent.change(selects[1]!, { target: { value: 'ocupado' } })
      fireEvent.click(screen.getByText('Solo guardar'))

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalledWith(
          expect.objectContaining({
            rut: '12345678-9',
            nota: null,
            fecProxima: null,
          }),
        )
      })
    })

    it('closes the modal after saving', async () => {
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Solo guardar')

      await waitFor(() => {
        expect(useUIStore.getState().activeModal).toBeNull()
      })
    })

    it('does NOT call siguienteCliente (no queue advancement)', async () => {
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Solo guardar')

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalled()
      })
      expect(mockSiguienteCliente).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Guardar y siguiente — non-cola mode
  // ---------------------------------------------------------------------------
  describe('Guardar y siguiente → button — non-cola mode', () => {
    it('calls registrarGestion with rut', async () => {
      useColaStore.setState({ colaModeActive: false })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Guardar y siguiente →')

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalledWith(
          expect.objectContaining({ rut: '12345678-9' }),
        )
      })
    })

    it('closes the modal (same as Solo guardar when not in cola mode)', async () => {
      useColaStore.setState({ colaModeActive: false })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Guardar y siguiente →')

      await waitFor(() => {
        expect(useUIStore.getState().activeModal).toBeNull()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Guardar y siguiente — cola mode
  // ---------------------------------------------------------------------------
  describe('Guardar y siguiente → button — cola mode', () => {
    beforeEach(() => {
      useColaStore.setState({ colaModeActive: true })
    })

    it('calls registrarGestion then advances the queue via siguienteCliente', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Guardar y siguiente →')

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalled()
        expect(mockSiguienteCliente).toHaveBeenCalled()
      })
    })

    it('loads the next client in the modal after advancing', async () => {
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      await fillAndSubmit('Guardar y siguiente →')

      await waitFor(() => {
        expect(useUIStore.getState().clienteActual).toMatchObject({ rut: '99999999-9' })
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Saltar button (cola mode only)
  // ---------------------------------------------------------------------------
  describe('Saltar button (cola mode only)', () => {
    it('is NOT visible when not in cola mode', async () => {
      useColaStore.setState({ colaModeActive: false })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      expect(screen.queryByText('Saltar ⏩')).toBeNull()
    })

    it('is visible when in cola mode', async () => {
      useColaStore.setState({ colaModeActive: true })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      expect(screen.getByText('Saltar ⏩')).toBeDefined()
    })

    it('calls siguienteCliente WITHOUT calling registrarGestion', async () => {
      useColaStore.setState({ colaModeActive: true })
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      fireEvent.click(screen.getByText('Saltar ⏩'))

      await waitFor(() => {
        expect(mockSiguienteCliente).toHaveBeenCalled()
      })
      expect(mockRegistrarGestion).not.toHaveBeenCalled()
    })

    it('loads the next client after skipping', async () => {
      useColaStore.setState({ colaModeActive: true })
      mockSiguienteCliente.mockResolvedValueOnce(mockNextCliente)
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      fireEvent.click(screen.getByText('Saltar ⏩'))

      await waitFor(() => {
        expect(useUIStore.getState().clienteActual).toMatchObject({ rut: '99999999-9' })
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cola mode indicator badge
  // ---------------------------------------------------------------------------
  describe('Cola mode indicator badge', () => {
    it('is NOT visible when not in cola mode', async () => {
      useColaStore.setState({ colaModeActive: false })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      expect(screen.queryByText('⏭ Modo cola')).toBeNull()
    })

    it('is visible when in cola mode', async () => {
      useColaStore.setState({ colaModeActive: true })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      expect(screen.getByText('⏭ Modo cola')).toBeDefined()
    })

    it('× button exits cola mode and closes modal', async () => {
      useColaStore.setState({ colaModeActive: true })
      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      // Find the × button inside the cola mode badge (aria-label="Salir de modo cola")
      const exitBtn = screen.getByRole('button', { name: /salir de modo cola/i })
      fireEvent.click(exitBtn)

      await waitFor(() => {
        expect(useColaStore.getState().colaModeActive).toBe(false)
        expect(useUIStore.getState().activeModal).toBeNull()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // WSP path — registers fixed-payload gestión + opens wa.me
  // ---------------------------------------------------------------------------
  describe('WSP button — auto-registers gestión with fixed payload', () => {
    it('calls registrarGestion with tipo=whatsapp and p_rut when client has a WSP template', async () => {
      // R2 client has a WSP template
      const wspCliente: Cliente = {
        ...mockCliente,
        regla: 'R2',
        celular: '912345678',
      }
      useUIStore.setState({ activeModal: 'cliente', clienteActual: wspCliente })

      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      // Mock window.open
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Find the WSP button (contains "WhatsApp" or the template label)
      const wspBtn = screen.getByRole('button', { name: /whatsapp|wsp/i })
      fireEvent.click(wspBtn)

      await waitFor(() => {
        expect(mockRegistrarGestion).toHaveBeenCalledWith(
          expect.objectContaining({
            rut: '12345678-9',
            tipo: 'whatsapp',
            efecto: 'no_contesta',
            nota: expect.stringMatching(/^WSP enviado: /),
            fecProxima: null,
          }),
        )
      })

      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
      openSpy.mockRestore()
    })

    it('manual save after WSP registers a SECOND gestion independently — no dedup guard (FR-004 S5 parity)', async () => {
      const wspCliente: Cliente = { ...mockCliente, regla: 'R2', celular: '912345678' }
      useUIStore.setState({ activeModal: 'cliente', clienteActual: wspCliente })

      const ClienteModal = await getClienteModal()
      render(<ClienteModal />)

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      // 1) WSP click → first (contact-attempt) gestión
      fireEvent.click(screen.getByRole('button', { name: /whatsapp|wsp/i }))
      await waitFor(() => expect(mockRegistrarGestion).toHaveBeenCalledTimes(1))

      // 2) Manual save → second (outcome) gestión, no dedup guard suppressing it
      await fillAndSubmit('Solo guardar')
      await waitFor(() => expect(mockRegistrarGestion).toHaveBeenCalledTimes(2))

      // Both events distinct: a whatsapp contact attempt + the manual outcome
      expect(mockRegistrarGestion.mock.calls[0]![0]).toEqual(
        expect.objectContaining({ tipo: 'whatsapp', rut: '12345678-9' }),
      )
      expect(mockRegistrarGestion.mock.calls[1]![0]).toEqual(
        expect.objectContaining({ rut: '12345678-9' }),
      )
      openSpy.mockRestore()
    })
  })
})

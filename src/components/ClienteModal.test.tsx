import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import type { Cliente, Perfil } from '@/types'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------
const mockRegistrarGestion = vi.fn()

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
    cola: { siguienteCliente: vi.fn(), countPendientes: vi.fn() },
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
  cobradora_id: 'cob-1',
  celular: '912345678',
  telefono: null,
  email: null,
  fec_vencimiento: '2026-07-01',
  accion_sugerida: 'Llamar',
  ultima_gestion_fecha: null,
  ultimo_efecto: null,
  ultima_gestion_nota: null,
  fec_proxima: null,
}

const mockPerfil: Perfil = {
  id: 'user-1',
  nombre: 'Test User',
  rol: 'cobradora',
  meta_diaria: 15,
  es_pool: false,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ClienteModal — gestion dispatch', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockRegistrarGestion.mockResolvedValue(undefined)

    // Set store state so the modal renders in open state with a client
    useUIStore.setState({ activeModal: 'cliente', clienteActual: mockCliente })
    useAuthStore.setState({ perfil: mockPerfil, user: { id: 'user-1' }, isLoading: false })
  })

  afterEach(() => {
    useUIStore.setState({ activeModal: null, clienteActual: null })
  })

  // Lazy import inside tests so module mocks are applied first
  it('calls registrarGestion including rut from the current cliente', async () => {
    const { ClienteModal } = await import('./ClienteModal')
    render(<ClienteModal />)

    // The form renders two native selects (tipo, efecto) after the Select mock
    const selects = screen.getAllByRole('combobox')
    // selects[0] = tipo, selects[1] = efecto
    fireEvent.change(selects[0]!, { target: { value: 'llamada' } })
    fireEvent.change(selects[1]!, { target: { value: 'no_contesta' } })

    fireEvent.click(screen.getByText('Registrar gestion'))

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
    const { ClienteModal } = await import('./ClienteModal')
    render(<ClienteModal />)

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0]!, { target: { value: 'sms' } })
    fireEvent.change(selects[1]!, { target: { value: 'ocupado' } })

    fireEvent.click(screen.getByText('Registrar gestion'))

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
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import type { Perfil } from '@/types'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------
const mockCargaMensual = vi.fn()

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
    gestion: { registrarGestion: vi.fn(), gestionesRango: vi.fn() },
    carga: {
      cargaMensual: (...args: unknown[]) => mockCargaMensual(...args),
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
// Mock xlsx dynamic import so processFile works in jsdom without a real file
// ---------------------------------------------------------------------------
const mockXlsxRead = vi.fn()
const mockSheetToJson = vi.fn()

vi.mock('xlsx', () => ({
  read: (...args: unknown[]) => mockXlsxRead(...args),
  utils: {
    sheet_to_json: (...args: unknown[]) => mockSheetToJson(...args),
  },
}))

// Replace portal-based Modal so content renders in the DOM
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
  ModalFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-footer">{children}</div>
  ),
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const jefaturaPerfil: Perfil = {
  id: 'jefa-1',
  nombre: 'Jefa Test',
  rol: 'jefatura',
  meta_diaria: 20,
  es_pool: false,
}

/** One valid ERP row for the mock workbook. */
const mockErpRow = {
  rutcli_mov: '12345678-9',
  nomcli_mov: 'Juan Perez',
  fecven_mov: null,
  nrodoc_mov: '3',
  monto_mov: 150000,
  nombre_cobmov: 'ANA LOPEZ',
  descri_ubi: null,
  folcon_mov: 'C001',
  nrodoc_con: '12',
  cobrador_mov: null,
  telefono: null,
  celular: '912345678',
  email: null,
}

function setupXlsxMock() {
  mockXlsxRead.mockReturnValue({
    SheetNames: ['Hoja1'],
    Sheets: { Hoja1: {} },
  })
  // First call: header detection (header: 1 mode)
  mockSheetToJson.mockReturnValueOnce([
    ['rutcli_mov', 'nomcli_mov', 'fecven_mov', 'nrodoc_mov', 'monto_mov'],
  ])
  // Second call: full data
  mockSheetToJson.mockReturnValueOnce([mockErpRow])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CargaModal — cargaMensual dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCargaMensual.mockResolvedValue({ nuevos: 10, actualizados: 5, gestiones_migradas: 2 })

    // Open the modal as jefatura
    useUIStore.setState({ activeModal: 'carga', isLoading: false })
    useAuthStore.setState({ perfil: jefaturaPerfil, user: { id: 'jefa-1' }, isLoading: false })
  })

  afterEach(() => {
    useUIStore.setState({ activeModal: null })
  })

  it('calls cargaMensual with (registros, nombreArchivo) when confirm is clicked', async () => {
    setupXlsxMock()

    const { CargaModal } = await import('./CargaModal')
    const { container } = render(<CargaModal />)

    // Create file and polyfill arrayBuffer which jsdom may not implement.
    // The content doesn't matter because XLSX.read is mocked.
    const file = new File(['dummy-xlsx-bytes'], 'cartera-2026-06.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    // Assign as own property to shadow missing prototype method
    ;(file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = () =>
      Promise.resolve(new ArrayBuffer(0))

    // Simulate file selection through the hidden file input.
    // Using Object.defineProperty because `files` is read-only on HTMLInputElement.
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    })
    fireEvent.change(fileInput!)

    // Wait for processFile to complete and the preview footer to appear
    await waitFor(
      () => {
        expect(screen.getByTestId('modal-footer')).toBeTruthy()
      },
      { timeout: 5000 },
    )

    // Click the confirm button
    const confirmBtn = screen.getByRole('button', { name: /cargar/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockCargaMensual).toHaveBeenCalledOnce()
    })

    const [registros, nombre] = mockCargaMensual.mock.calls[0] as [unknown[], string]
    expect(nombre).toBe('cartera-2026-06.xlsx')
    // Should have one valid row (rutcli_mov present → maps to rut field)
    expect(Array.isArray(registros)).toBe(true)
    expect((registros as Array<{ rut: string }>)[0]?.rut).toBe('12345678-9')
  }, 10000)
})

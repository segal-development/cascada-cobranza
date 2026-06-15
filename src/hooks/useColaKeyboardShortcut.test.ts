import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useColaStore } from '@/stores/colaStore'
import { useUIStore } from '@/stores/uiStore'

const mockSiguienteCliente = vi.fn()

vi.mock('@/lib/repositories', () => ({
  repositories: {
    auth: { signIn: vi.fn(), signOut: vi.fn(), onAuthChange: vi.fn(), getPerfil: vi.fn() },
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

describe('useColaKeyboardShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useColaStore.getState().reset()
    useUIStore.setState({ activeModal: null, clienteActual: null, toast: null })
    mockSiguienteCliente.mockResolvedValue({ fin_cola: true as const, mensaje: 'Cola vacía' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function getHook() {
    const { useColaKeyboardShortcut } = await import('./useColaKeyboardShortcut')
    return useColaKeyboardShortcut
  }

  it('calls enterColaMode when N is pressed and colaModeActive=true and no modal open', async () => {
    useColaStore.setState({ colaModeActive: true })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    fireEvent.keyDown(document, { key: 'N' })

    // enterColaMode calls siguienteCliente internally
    expect(mockSiguienteCliente).toHaveBeenCalled()
  })

  it('does NOT call enterColaMode when N is pressed but colaModeActive=false', async () => {
    useColaStore.setState({ colaModeActive: false })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    fireEvent.keyDown(document, { key: 'N' })

    expect(mockSiguienteCliente).not.toHaveBeenCalled()
  })

  it('does NOT call enterColaMode when N is pressed but a modal is open', async () => {
    useColaStore.setState({ colaModeActive: true })
    useUIStore.setState({ activeModal: 'cliente' })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    fireEvent.keyDown(document, { key: 'N' })

    expect(mockSiguienteCliente).not.toHaveBeenCalled()
  })

  it('also triggers on lowercase n (impl handles both cases)', async () => {
    useColaStore.setState({ colaModeActive: true })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    fireEvent.keyDown(document, { key: 'n' })

    expect(mockSiguienteCliente).toHaveBeenCalled()
  })

  it('does NOT fire while typing in a textarea (input-focus guard)', async () => {
    useColaStore.setState({ colaModeActive: true })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    fireEvent.keyDown(textarea, { key: 'N' })

    expect(mockSiguienteCliente).not.toHaveBeenCalled()
    textarea.remove()
  })

  it('does NOT double-fire while a siguienteCliente call is already in flight (isLoading guard)', async () => {
    useColaStore.setState({ colaModeActive: true, isLoading: true })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    renderHook(() => useColaKeyboardShortcut())

    fireEvent.keyDown(document, { key: 'N' })

    expect(mockSiguienteCliente).not.toHaveBeenCalled()
  })

  it('removes keydown listener on unmount', async () => {
    useColaStore.setState({ colaModeActive: true })
    useUIStore.setState({ activeModal: null })

    const useColaKeyboardShortcut = await getHook()
    const { unmount } = renderHook(() => useColaKeyboardShortcut())
    unmount()

    // Reset mock call count after unmount
    mockSiguienteCliente.mockClear()
    fireEvent.keyDown(document, { key: 'N' })

    expect(mockSiguienteCliente).not.toHaveBeenCalled()
  })
})

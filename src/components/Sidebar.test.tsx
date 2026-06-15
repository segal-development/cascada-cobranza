import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Perfil } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useColaStore } from '@/stores/colaStore'

const mockEnterColaMode = vi.fn()
const mockSiguienteCliente = vi.fn()

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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useColaStore.getState().reset()
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
})

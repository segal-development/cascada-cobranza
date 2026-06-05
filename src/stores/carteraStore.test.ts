import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCarteraStore } from './carteraStore'
import type { Cliente } from '@/types'

// Mock Supabase
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

describe('carteraStore', () => {
  const mockClientes: Cliente[] = [
    {
      rut: '12345678-9',
      cuota_id: 'c1',
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
      email: 'juan@test.cl',
      fec_vencimiento: '2026-05-01',
      accion_sugerida: 'Llamar urgente',
      ultima_gestion_fecha: null,
      ultimo_efecto: null,
      ultima_gestion_nota: null,
      fec_proxima: null,
    },
    {
      rut: '98765432-1',
      cuota_id: 'c2',
      nombre: 'Maria Lopez',
      regla: 'R1',
      dias_mora: 5,
      monto: 80000,
      nro_cuota: 1,
      nro_total_cuotas: 6,
      zona_critica: null,
      estado_gestion: 'sin_gestion',
      cobradora_id: 'cob-1',
      celular: '987654321',
      telefono: null,
      email: 'maria@test.cl',
      fec_vencimiento: '2026-05-10',
      accion_sugerida: 'Primer contacto',
      ultima_gestion_fecha: null,
      ultimo_efecto: null,
      ultima_gestion_nota: null,
      fec_proxima: null,
    },
    {
      rut: '11111111-1',
      cuota_id: 'c3',
      nombre: 'Pedro Sanchez',
      regla: 'R3',
      dias_mora: 15,
      monto: 120000,
      nro_cuota: 5,
      nro_total_cuotas: 12,
      zona_critica: null,
      estado_gestion: 'compromiso_vigente',
      cobradora_id: 'cob-1',
      celular: '911111111',
      telefono: null,
      email: 'pedro@test.cl',
      fec_vencimiento: '2026-04-20',
      accion_sugerida: 'Seguimiento compromiso',
      ultima_gestion_fecha: '2026-05-01',
      ultimo_efecto: 'compromiso_pago',
      ultima_gestion_nota: 'Pagara el viernes',
      fec_proxima: '2026-05-07',
    },
    {
      rut: '22222222-2',
      cuota_id: 'c4',
      nombre: 'Ana Garcia',
      regla: 'PAGADO',
      dias_mora: 0,
      monto: 50000,
      nro_cuota: 6,
      nro_total_cuotas: 6,
      zona_critica: null,
      estado_gestion: 'sin_gestion',
      cobradora_id: 'cob-1',
      celular: '922222222',
      telefono: null,
      email: 'ana@test.cl',
      fec_vencimiento: '2026-04-15',
      accion_sugerida: 'N/A',
      ultima_gestion_fecha: null,
      ultimo_efecto: null,
      ultima_gestion_nota: null,
      fec_proxima: null,
    },
    {
      rut: '33333333-3',
      cuota_id: 'c5',
      nombre: 'Carlos Diaz',
      regla: 'R4',
      dias_mora: 10,
      monto: 90000,
      nro_cuota: 2,
      nro_total_cuotas: 12,
      zona_critica: null,
      estado_gestion: 'gestionado_hoy',
      cobradora_id: 'cob-1',
      celular: '933333333',
      telefono: null,
      email: 'carlos@test.cl',
      fec_vencimiento: '2026-05-05',
      accion_sugerida: 'Esperar respuesta',
      ultima_gestion_fecha: '2026-05-05',
      ultimo_efecto: 'agenda_llamado',
      ultima_gestion_nota: 'Llamar manana',
      fec_proxima: '2026-05-06',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useCarteraStore.getState().reset()
    
    // Set up mock chain
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq, limit: mockLimit })
    mockEq.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue({ data: mockClientes, error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getFiltered', () => {
    beforeEach(() => {
      useCarteraStore.setState({ clientes: mockClientes })
    })

    it('should filter by CRITICO - urgent cases', () => {
      useCarteraStore.setState({ filtroRegla: 'CRITICO' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      // Should include:
      // 1. sin_gestion with dias_mora >= 0 excluding SAYORANA, PAGADO, R6
      //    - Juan (R5, sin_gestion): INCLUDED
      //    - Maria (R1, sin_gestion): INCLUDED
      // 2. compromiso_vigente with fec_proxima <= today (if date is past)
      //    - Pedro (R3, compromiso_vigente, fec_proxima: 2026-05-07): may be included depending on date
      // Ana (PAGADO) should NOT be included
      // Carlos (gestionado_hoy) should NOT be included
      
      // At minimum, sin_gestion urgent cases should be included
      expect(filtered.map(c => c.nombre)).toContain('Juan Perez')
      expect(filtered.map(c => c.nombre)).toContain('Maria Lopez')
      expect(filtered.map(c => c.nombre)).not.toContain('Ana Garcia')
      // Carlos is gestionado_hoy, not sin_gestion
      expect(filtered.map(c => c.nombre)).not.toContain('Carlos Diaz')
    })

    it('should filter by specific rule R5', () => {
      useCarteraStore.setState({ filtroRegla: 'R5' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.nombre).toBe('Juan Perez')
    })

    it('should filter by R3 - compromiso vigente', () => {
      useCarteraStore.setState({ filtroRegla: 'R3' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.nombre).toBe('Pedro Sanchez')
      expect(filtered[0]!.estado_gestion).toBe('compromiso_vigente')
    })

    it('should filter by R4 - agendados', () => {
      useCarteraStore.setState({ filtroRegla: 'R4' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.nombre).toBe('Carlos Diaz')
      expect(filtered[0]!.ultimo_efecto).toBe('agenda_llamado')
    })

    it('should filter by search text - name', () => {
      useCarteraStore.setState({ filtroRegla: null, search: 'Juan' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.nombre).toBe('Juan Perez')
    })

    it('should filter by search text - RUT', () => {
      useCarteraStore.setState({ filtroRegla: null, search: '12345678' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.rut).toBe('12345678-9')
    })

    it('should combine filter and search', () => {
      useCarteraStore.setState({ filtroRegla: 'R1', search: 'maria' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.nombre).toBe('Maria Lopez')
    })

    it('should sort by mora ascending', () => {
      useCarteraStore.setState({ filtroRegla: null, sortMora: 'asc' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered[0]!.dias_mora).toBe(0) // Ana - PAGADO
      expect(filtered[filtered.length - 1]!.dias_mora).toBe(30) // Juan - R5
    })

    it('should sort by mora descending', () => {
      useCarteraStore.setState({ filtroRegla: null, sortMora: 'desc' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered[0]!.dias_mora).toBe(30) // Juan - R5
      expect(filtered[filtered.length - 1]!.dias_mora).toBe(0) // Ana - PAGADO
    })

    it('should return all clientes when no filter is set', () => {
      useCarteraStore.setState({ filtroRegla: null, search: '' })
      const filtered = useCarteraStore.getState().getFiltered()
      
      expect(filtered.length).toBe(5)
    })
  })

  describe('loadClientes', () => {
    it('should load clientes from Supabase', async () => {
      await useCarteraStore.getState().loadClientes('cobradora')
      
      expect(mockFrom).toHaveBeenCalledWith('cascada_clientes')
      expect(useCarteraStore.getState().clientes.length).toBe(5)
      expect(useCarteraStore.getState().isLoading).toBe(false)
    })

    it('should filter by cobradora when jefatura selects one', async () => {
      useCarteraStore.setState({ filtroAmbito: 'cob-123' })
      await useCarteraStore.getState().loadClientes('jefatura')
      
      expect(mockEq).toHaveBeenCalledWith('cobradora_id', 'cob-123')
    })

    it('should not filter when jefatura selects todos', async () => {
      useCarteraStore.setState({ filtroAmbito: 'todos' })
      await useCarteraStore.getState().loadClientes('jefatura')
      
      expect(mockEq).not.toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'Test error' } })
      
      await useCarteraStore.getState().loadClientes('cobradora')
      
      expect(useCarteraStore.getState().error).toBe('Test error')
      expect(useCarteraStore.getState().isLoading).toBe(false)
    })
  })

  describe('actions', () => {
    it('should set filtroRegla and reset page', () => {
      useCarteraStore.setState({ page: 5 })
      useCarteraStore.getState().setFiltroRegla('R5')
      
      expect(useCarteraStore.getState().filtroRegla).toBe('R5')
      expect(useCarteraStore.getState().page).toBe(0)
    })

    it('should set search and reset page', () => {
      useCarteraStore.setState({ page: 3 })
      useCarteraStore.getState().setSearch('test')
      
      expect(useCarteraStore.getState().search).toBe('test')
      expect(useCarteraStore.getState().page).toBe(0)
    })

    it('should reset to initial state', () => {
      useCarteraStore.setState({
        clientes: mockClientes,
        filtroRegla: 'R5',
        search: 'test',
        page: 5,
      })
      
      useCarteraStore.getState().reset()
      
      expect(useCarteraStore.getState().clientes).toEqual([])
      expect(useCarteraStore.getState().filtroRegla).toBe('CRITICO')
      expect(useCarteraStore.getState().search).toBe('')
      expect(useCarteraStore.getState().page).toBe(0)
    })
  })
})

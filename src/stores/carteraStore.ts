import { create } from 'zustand'
import type { Cliente, Regla, SortMora } from '@/types'

interface CarteraState {
  clientes: Cliente[]
  filtroRegla: Regla | 'CRITICO' | null
  filtroAmbito: 'mia' | 'todos' | string // 'mia', 'todos', or cobradora_id
  search: string
  sortMora: SortMora
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // Actions
  setClientes: (clientes: Cliente[]) => void
  setFiltroRegla: (regla: Regla | 'CRITICO' | null) => void
  setFiltroAmbito: (ambito: 'mia' | 'todos' | string) => void
  setSearch: (search: string) => void
  setSortMora: (sort: SortMora) => void
  setPage: (page: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadClientes: () => Promise<void>
  getFiltered: () => Cliente[]
  reset: () => void
}

const initialState = {
  clientes: [],
  filtroRegla: 'CRITICO' as const,
  filtroAmbito: 'mia' as const,
  search: '',
  sortMora: null,
  page: 0,
  pageSize: 50,
  isLoading: false,
  error: null,
}

export const useCarteraStore = create<CarteraState>((set, get) => ({
  ...initialState,

  setClientes: (clientes) => set({ clientes }),
  setFiltroRegla: (filtroRegla) => set({ filtroRegla, page: 0 }),
  setFiltroAmbito: (filtroAmbito) => set({ filtroAmbito, page: 0 }),
  setSearch: (search) => set({ search, page: 0 }),
  setSortMora: (sortMora) => set({ sortMora }),
  setPage: (page) => set({ page }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  loadClientes: async () => {
    set({ isLoading: true, error: null })
    // TODO: Wire to Supabase RPC in Phase 2
    // const { data, error } = await supabase.rpc('cascada_cartera', {...})
    set({ isLoading: false })
  },

  getFiltered: () => {
    const { clientes, filtroRegla, search, sortMora } = get()

    let filtered = [...clientes]

    // Filter by rule
    if (filtroRegla === 'CRITICO') {
      // Critical = R5, R7, or any with dias_mora > 45
      filtered = filtered.filter(
        (c) => c.regla === 'R5' || c.regla === 'R7' || c.dias_mora > 45,
      )
    } else if (filtroRegla) {
      filtered = filtered.filter((c) => c.regla === filtroRegla)
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.rut.toLowerCase().includes(q),
      )
    }

    // Sort by mora
    if (sortMora) {
      filtered.sort((a, b) =>
        sortMora === 'desc' ? b.dias_mora - a.dias_mora : a.dias_mora - b.dias_mora,
      )
    }

    return filtered
  },

  reset: () => set(initialState),
}))

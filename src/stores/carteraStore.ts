import { create } from 'zustand'
import type { Cliente, Regla, SortMora } from '@/types'
import { repositories } from '@/lib/repositories'

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
  loadClientes: (perfilRol?: 'cobradora' | 'jefatura') => Promise<void>
  getFiltered: () => Cliente[]
  reset: () => void
}

// Priority order for rules (lower = higher priority)
const RULE_PRIORITY: Record<string, number> = {
  SAYORANA: 1,
  R7: 2,
  R2: 3,
  R1: 4,
  R5: 5,
  R3: 6,
  R4: 7,
  R6: 8,
  PRE_DESISTIDO: 9,
  PAGADO: 10,
}

/**
 * Pure filter + sort for the cartera table.
 *
 * Kept as a standalone pure function (not only a store getter) so React
 * components can call it with subscribed state as explicit arguments. The
 * React Compiler then tracks `clientes`/`filtroRegla`/`search`/`sortMora`
 * as dependencies and recomputes when data loads. Calling the store's
 * `getFiltered()` getter directly inside render gets memoized to a stale
 * (empty) result because the compiler cannot see its internal `get()` deps.
 */
export function filterCartera(
  clientes: Cliente[],
  filtroRegla: Regla | 'CRITICO' | null,
  search: string,
  sortMora: SortMora,
): Cliente[] {
  let filtered = [...clientes]

  // Filter by rule
  if (filtroRegla === 'CRITICO') {
    const today = new Date().toISOString().slice(0, 10)
    filtered = filtered.filter((c) => {
      const isSinGestion =
        c.estado_gestion === 'sin_gestion' &&
        c.dias_mora >= 0 &&
        !['SAYORANA', 'PAGADO', 'R6'].includes(c.regla)
      const isCompromisoDue =
        c.estado_gestion === 'compromiso_vigente' && c.fec_proxima && c.fec_proxima <= today
      return isSinGestion || isCompromisoDue
    })
  } else if (filtroRegla === 'R3') {
    filtered = filtered.filter((c) => c.estado_gestion === 'compromiso_vigente')
  } else if (filtroRegla === 'R4') {
    filtered = filtered.filter((c) => c.ultimo_efecto === 'agenda_llamado')
  } else if (filtroRegla) {
    filtered = filtered.filter((c) => c.regla === filtroRegla)
  }

  // Filter by search
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.rut.toLowerCase().includes(q),
    )
  }

  // Sort by mora (default asc), rut as stable tiebreaker
  if (sortMora === 'desc') {
    filtered.sort((a, b) => b.dias_mora - a.dias_mora || a.rut.localeCompare(b.rut))
  } else {
    filtered.sort((a, b) => a.dias_mora - b.dias_mora || a.rut.localeCompare(b.rut))
  }

  return filtered
}

const initialState = {
  clientes: [],
  filtroRegla: 'CRITICO' as const,
  filtroAmbito: 'mia' as const,
  search: '',
  sortMora: null,
  page: 0,
  pageSize: 10,
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

  loadClientes: async (perfilRol) => {
    const { filtroAmbito } = get()
    set({ isLoading: true, error: null })

    try {
      const cobradoraId =
        perfilRol === 'jefatura' && filtroAmbito !== 'todos' && filtroAmbito !== 'mia'
          ? filtroAmbito
          : undefined

      const data = await repositories.cartera.listClientes(
        cobradoraId ? { cobradoraId } : undefined,
      )

      // Sort: zona_critica first, then by rule priority, then by dias_mora desc
      const sorted = data.sort((a, b) => {
        const critA = a.zona_critica ? 0 : 1
        const critB = b.zona_critica ? 0 : 1
        if (critA !== critB) return critA - critB

        const ruleA = RULE_PRIORITY[a.regla] ?? 99
        const ruleB = RULE_PRIORITY[b.regla] ?? 99
        if (ruleA !== ruleB) return ruleA - ruleB

        return (b.dias_mora ?? 0) - (a.dias_mora ?? 0)
      })

      set({ clientes: sorted, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading clientes'
      set({ error: message, isLoading: false })
    }
  },

  getFiltered: () => {
    const { clientes, filtroRegla, search, sortMora } = get()
    return filterCartera(clientes, filtroRegla, search, sortMora)
  },

  reset: () => set(initialState),
}))

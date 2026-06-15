import { create } from 'zustand'
import type { Cliente, Regla, SortMora } from '@/types'
import { repositories } from '@/lib/repositories'

// ---- Priority bucket types (FR-007) ----

export const PRIORITY_BUCKET = {
  VENCE_HOY: 'vence_hoy',
  R5_AL_LIMITE: 'r5_al_limite',
  PRE_BLOQUEO: 'pre_bloqueo',
  MORA_ACTIVA: 'mora_activa',
  R1_PRIMER: 'r1_primer',
} as const

export type PriorityBucketKey = (typeof PRIORITY_BUCKET)[keyof typeof PRIORITY_BUCKET]

export interface PriorityBucketCounts {
  vence_hoy: number
  r5_al_limite: number
  pre_bloqueo: number
  mora_activa: number
  r1_primer: number
}

/**
 * Pure function to count clients in each priority bucket.
 * Compiler-safe: call with subscribed clientes as an explicit argument so the
 * React Compiler tracks it as a dependency and recomputes when data loads.
 * Do NOT call getFiltered() or any store getter inside a component render —
 * those call get() internally and get memoized to a stale value.
 */
export function countPriorityBuckets(clientes: Cliente[]): PriorityBucketCounts {
  return {
    vence_hoy: clientes.filter((c) => c.zona_critica === 'CRIT_VENCE_HOY').length,
    r5_al_limite: clientes.filter((c) => c.regla === 'R5').length,
    pre_bloqueo: clientes.filter((c) => c.regla === 'R2' && c.dias_mora >= 30).length,
    mora_activa: clientes.filter((c) => c.regla === 'R2' && c.dias_mora < 30).length,
    r1_primer: clientes.filter((c) => c.regla === 'R1').length,
  }
}

// ---- Store state ----

interface CarteraState {
  clientes: Cliente[]
  filtroRegla: Regla | 'CRITICO' | null
  filtroAmbito: 'mia' | 'todos' | string // 'mia', 'todos', or cobradora_id
  filtroPrioritario: PriorityBucketKey | null
  search: string
  sortMora: SortMora
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null
  lastLoadedAt: Date | null

  // Actions
  setClientes: (clientes: Cliente[]) => void
  setFiltroRegla: (regla: Regla | 'CRITICO' | null) => void
  setFiltroAmbito: (ambito: 'mia' | 'todos' | string) => void
  setFiltroPrioritario: (key: PriorityBucketKey) => void
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
 *
 * The optional `filtroPrioritario` applies an additional AND filter for the
 * priority bucket selected in the ATENCIÓN PRIORITARIA sidebar section (FR-007).
 */
export function filterCartera(
  clientes: Cliente[],
  filtroRegla: Regla | 'CRITICO' | null,
  search: string,
  sortMora: SortMora,
  filtroPrioritario: PriorityBucketKey | null = null,
): Cliente[] {
  let filtered = [...clientes]

  // Filter by priority bucket (FR-007) — applied before rule filter (AND logic)
  if (filtroPrioritario) {
    switch (filtroPrioritario) {
      case PRIORITY_BUCKET.VENCE_HOY:
        filtered = filtered.filter((c) => c.zona_critica === 'CRIT_VENCE_HOY')
        break
      case PRIORITY_BUCKET.R5_AL_LIMITE:
        filtered = filtered.filter((c) => c.regla === 'R5')
        break
      case PRIORITY_BUCKET.PRE_BLOQUEO:
        filtered = filtered.filter((c) => c.regla === 'R2' && c.dias_mora >= 30)
        break
      case PRIORITY_BUCKET.MORA_ACTIVA:
        filtered = filtered.filter((c) => c.regla === 'R2' && c.dias_mora < 30)
        break
      case PRIORITY_BUCKET.R1_PRIMER:
        filtered = filtered.filter((c) => c.regla === 'R1')
        break
    }
  }

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
  filtroPrioritario: null as PriorityBucketKey | null,
  search: '',
  sortMora: null as SortMora,
  page: 0,
  pageSize: 10,
  isLoading: false,
  error: null as string | null,
  lastLoadedAt: null as Date | null,
}

export const useCarteraStore = create<CarteraState>((set, get) => ({
  ...initialState,

  setClientes: (clientes) => set({ clientes }),
  // Rule filter and priority bucket are MUTUALLY EXCLUSIVE (matches legacy):
  // setting one clears the other so the table shows exactly one segment.
  setFiltroRegla: (filtroRegla) => set({ filtroRegla, filtroPrioritario: null, page: 0 }),
  setFiltroAmbito: (filtroAmbito) => set({ filtroAmbito, page: 0 }),

  /**
   * Toggle priority bucket filter — clicking the same key clears the filter.
   * Setting a bucket clears filtroRegla (mutual exclusion); clearing the bucket
   * leaves filtroRegla null so the table returns to the full unfiltered list.
   * Compiler-safe: sets plain state that components subscribe to as explicit deps.
   */
  setFiltroPrioritario: (key) =>
    set((state) => ({
      filtroPrioritario: state.filtroPrioritario === key ? null : key,
      filtroRegla: state.filtroPrioritario === key ? state.filtroRegla : null,
      page: 0,
    })),

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

      set({ clientes: sorted, isLoading: false, lastLoadedAt: new Date() })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading clientes'
      set({ error: message, isLoading: false })
    }
  },

  getFiltered: () => {
    const { clientes, filtroRegla, search, sortMora, filtroPrioritario } = get()
    return filterCartera(clientes, filtroRegla, search, sortMora, filtroPrioritario)
  },

  reset: () => set(initialState),
}))

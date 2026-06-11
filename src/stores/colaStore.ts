import { create } from 'zustand'
import type { Cliente } from '@/types'
import type { SiguienteResult } from '@/lib/ports'
import { repositories } from '@/lib/repositories'

interface ColaState {
  cola: Cliente[]
  indiceActual: number
  isActive: boolean
  isLoading: boolean
  error: string | null
  // Count of remaining clients in queue
  pendientes: number

  // Actions
  setCola: (clientes: Cliente[]) => void
  siguiente: () => Cliente | null
  anterior: () => Cliente | null
  irA: (indice: number) => Cliente | null
  getActual: () => Cliente | null
  activar: (clientes: Cliente[]) => void
  desactivar: () => void
  // RPC-based queue actions
  fetchSiguiente: () => Promise<SiguienteResult | null>
  countPendientes: () => Promise<void>
  reset: () => void
}

const initialState = {
  cola: [],
  indiceActual: 0,
  isActive: false,
  isLoading: false,
  error: null,
  pendientes: 0,
}

export const useColaStore = create<ColaState>((set, get) => ({
  ...initialState,

  setCola: (cola) => set({ cola, indiceActual: 0 }),

  siguiente: () => {
    const { cola, indiceActual } = get()
    if (cola.length === 0) return null

    const nextIndex = (indiceActual + 1) % cola.length
    set({ indiceActual: nextIndex })
    return cola[nextIndex] ?? null
  },

  anterior: () => {
    const { cola, indiceActual } = get()
    if (cola.length === 0) return null

    const prevIndex = indiceActual === 0 ? cola.length - 1 : indiceActual - 1
    set({ indiceActual: prevIndex })
    return cola[prevIndex] ?? null
  },

  irA: (indice) => {
    const { cola } = get()
    if (indice < 0 || indice >= cola.length) return null

    set({ indiceActual: indice })
    return cola[indice] ?? null
  },

  getActual: () => {
    const { cola, indiceActual, isActive } = get()
    if (!isActive || cola.length === 0) return null
    return cola[indiceActual] ?? null
  },

  activar: (clientes) =>
    set({
      cola: clientes,
      indiceActual: 0,
      isActive: true,
    }),

  desactivar: () =>
    set({
      isActive: false,
    }),

  fetchSiguiente: async () => {
    set({ isLoading: true, error: null })

    try {
      const result = await repositories.cola.siguienteCliente()

      set({ isLoading: false, isActive: true })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching siguiente'
      set({ error: message, isLoading: false })
      return null
    }
  },

  countPendientes: async () => {
    try {
      const count = await repositories.cola.countPendientes()
      set({ pendientes: count })
    } catch {
      // Silent fail for count
      set({ pendientes: 0 })
    }
  },

  reset: () => set(initialState),
}))

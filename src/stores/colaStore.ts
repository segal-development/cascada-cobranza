import { create } from 'zustand'
import type { Cliente } from '@/types'

interface ColaState {
  cola: Cliente[]
  indiceActual: number
  isActive: boolean

  // Actions
  setCola: (clientes: Cliente[]) => void
  siguiente: () => Cliente | null
  anterior: () => Cliente | null
  irA: (indice: number) => Cliente | null
  getActual: () => Cliente | null
  activar: (clientes: Cliente[]) => void
  desactivar: () => void
  reset: () => void
}

const initialState = {
  cola: [],
  indiceActual: 0,
  isActive: false,
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

  reset: () => set(initialState),
}))

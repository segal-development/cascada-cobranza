import { create } from 'zustand'
import type { Cliente } from '@/types'
import { supabase } from '@/lib/supabase'

interface SiguienteResponse {
  fin_cola?: boolean
  mensaje?: string
  rut?: string
  cuota_id?: string
  nombre?: string
  regla?: string
  dias_mora?: number
  monto?: number
  // ... other fields from the RPC
}

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
  fetchSiguiente: () => Promise<SiguienteResponse | null>
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
      const { data, error } = await supabase.rpc('cascada_siguiente_cliente')

      if (error) {
        throw new Error(error.message)
      }

      set({ isLoading: false, isActive: true })
      return data as SiguienteResponse
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching siguiente'
      set({ error: message, isLoading: false })
      return null
    }
  },

  countPendientes: async () => {
    try {
      const { count } = await supabase
        .from('cascada_clientes')
        .select('rut', { count: 'exact', head: true })
        .eq('estado_cuota', 'vigente')
        .not('regla', 'in', '(SAYORANA,PAGADO,R6)')
        .not('estado_gestion', 'in', '(gestionado_hoy,compromiso_vigente,verificacion_pendiente)')

      set({ pendientes: count ?? 0 })
    } catch {
      // Silent fail for count
      set({ pendientes: 0 })
    }
  },

  reset: () => set(initialState),
}))

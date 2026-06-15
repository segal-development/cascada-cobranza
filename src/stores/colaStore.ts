import { create } from 'zustand'
import type { Cliente } from '@/types'
import type { SiguienteResult, RegistrarGestionInput } from '@/lib/ports'
import { repositories } from '@/lib/repositories'
import { useUIStore } from '@/stores/uiStore'

interface ColaState {
  cola: Cliente[]
  indiceActual: number
  isActive: boolean
  isLoading: boolean
  error: string | null
  // Count of remaining clients in queue
  pendientes: number
  // Cola mode flag — true while iterating the work queue
  colaModeActive: boolean

  // Actions
  setCola: (clientes: Cliente[]) => void
  siguiente: () => Cliente | null
  anterior: () => Cliente | null
  irA: (indice: number) => Cliente | null
  getActual: () => Cliente | null
  activar: (clientes: Cliente[]) => void
  desactivar: () => void
  // RPC-based queue actions (legacy)
  fetchSiguiente: () => Promise<SiguienteResult | null>
  countPendientes: () => Promise<void>
  reset: () => void
  // Cola mode actions (PR-04)
  enterColaMode: () => Promise<void>
  exitColaMode: () => void
  submitGestion: (input: RegistrarGestionInput) => Promise<void>
  saltar: () => Promise<void>
}

const initialState = {
  cola: [],
  indiceActual: 0,
  isActive: false,
  isLoading: false,
  error: null,
  pendientes: 0,
  colaModeActive: false,
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

  // ---------------------------------------------------------------------------
  // Cola mode — PR-04
  // ---------------------------------------------------------------------------

  /**
   * Start or advance cola mode: fetch the next client from the work queue and
   * open ClienteModal for that client. Shows a toast when the queue is empty.
   * Called from the sidebar "Siguiente cliente" button and keyboard shortcut N.
   */
  enterColaMode: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await repositories.cola.siguienteCliente()
      set({ isLoading: false })

      if (result.fin_cola) {
        set({ colaModeActive: false })
        useUIStore.getState().showToast(result.mensaje, 'info')
      } else {
        set({ colaModeActive: true })
        useUIStore.getState().openModal('cliente', result as Cliente & { fin_cola?: false })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener siguiente cliente'
      set({ error: message, isLoading: false })
    }
  },

  /**
   * Exit cola mode without advancing the queue. Closes the modal.
   * Called from the × button in the cola-mode indicator badge.
   */
  exitColaMode: () => {
    set({ colaModeActive: false })
    useUIStore.getState().closeModal()
  },

  /**
   * Register a gestión and optionally advance the queue.
   * If in cola mode: registers the gestión then fetches the next client.
   * If not in cola mode: registers the gestión then closes the modal.
   * Throws on registration failure so the caller can show an error toast.
   */
  submitGestion: async (input: RegistrarGestionInput) => {
    set({ isLoading: true, error: null })
    try {
      await repositories.gestion.registrarGestion(input)

      if (get().colaModeActive) {
        const result = await repositories.cola.siguienteCliente()
        set({ isLoading: false })
        if (result.fin_cola) {
          set({ colaModeActive: false })
          useUIStore.getState().closeModal()
          useUIStore.getState().showToast(result.mensaje || 'Cola finalizada', 'info')
        } else {
          useUIStore.getState().openModal('cliente', result as Cliente & { fin_cola?: false })
        }
      } else {
        set({ isLoading: false })
        useUIStore.getState().closeModal()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar gestión'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  /**
   * Skip the current client and advance to the next one without registering a
   * gestión. Closes the modal if the queue is exhausted.
   */
  saltar: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await repositories.cola.siguienteCliente()
      set({ isLoading: false })

      if (result.fin_cola) {
        set({ colaModeActive: false })
        useUIStore.getState().closeModal()
        useUIStore.getState().showToast(result.mensaje || 'Cola finalizada', 'info')
      } else {
        useUIStore.getState().openModal('cliente', result as Cliente & { fin_cola?: false })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al saltar cliente'
      set({ error: message, isLoading: false })
    }
  },
}))

import { create } from 'zustand'
import type { ResumenDia, Rol } from '@/types'
import type { ResumenCobradora } from '@/lib/ports'
import { repositories } from '@/lib/repositories'

interface ResumenState {
  // Aggregated resumen for current context
  resumen: ResumenDia | null
  // Full data for all cobradoras (for jefatura sidebar)
  resumenTodas: ResumenCobradora[]
  isLoading: boolean
  error: string | null

  // Actions
  loadResumen: (perfilId: string, perfilRol: Rol, filtroAmbito: string) => Promise<void>
  reset: () => void
}

const initialState = {
  resumen: null,
  resumenTodas: [],
  isLoading: false,
  error: null,
}

export const useResumenStore = create<ResumenState>((set) => ({
  ...initialState,

  loadResumen: async (perfilId: string, perfilRol: Rol, filtroAmbito: string) => {
    set({ isLoading: true, error: null })

    try {
      const todas = await repositories.resumen.getResumenDia()

      let resumen: ResumenDia

      if (perfilRol === 'jefatura') {
        if (filtroAmbito === 'todos') {
          // Aggregate all cobradoras
          resumen = {
            gestiones_hoy: todas.reduce((s, r) => s + r.gestiones_hoy, 0),
            gestiones_mes: todas.reduce((s, r) => s + r.gestiones_mes, 0),
            meta: todas.reduce((s, r) => s + r.meta_diaria, 0),
            meta_mes_acumulada: todas.reduce((s, r) => s + r.meta_mes_acumulada, 0),
            meta_mes_total: todas.reduce((s, r) => s + r.meta_mes_total, 0),
            cartera: todas.reduce((s, r) => s + r.cartera_total, 0),
            monto_cartera: todas.reduce((s, r) => s + r.monto_cartera, 0),
          }
        } else {
          // Filter to specific cobradora
          const r = todas.find((x) => x.cobradora_id === filtroAmbito)
          resumen = r
            ? {
                gestiones_hoy: r.gestiones_hoy,
                gestiones_mes: r.gestiones_mes,
                meta: r.meta_diaria,
                meta_mes_acumulada: r.meta_mes_acumulada,
                meta_mes_total: r.meta_mes_total,
                cartera: r.cartera_total,
                monto_cartera: r.monto_cartera,
              }
            : {
                gestiones_hoy: 0,
                gestiones_mes: 0,
                meta: 0,
                meta_mes_acumulada: 0,
                meta_mes_total: 0,
                cartera: 0,
                monto_cartera: 0,
              }
        }
      } else {
        // Cobradora: their own data
        const r = todas.find((x) => x.cobradora_id === perfilId)
        resumen = r
          ? {
              gestiones_hoy: r.gestiones_hoy,
              gestiones_mes: r.gestiones_mes,
              meta: r.meta_diaria,
              meta_mes_acumulada: r.meta_mes_acumulada,
              meta_mes_total: r.meta_mes_total,
              cartera: r.cartera_total,
              monto_cartera: r.monto_cartera,
            }
          : {
              gestiones_hoy: 0,
              gestiones_mes: 0,
              meta: 0,
              meta_mes_acumulada: 0,
              meta_mes_total: 0,
              cartera: 0,
              monto_cartera: 0,
            }
      }

      set({ resumen, resumenTodas: todas, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading resumen'
      set({ error: message, isLoading: false })
    }
  },

  reset: () => set(initialState),
}))

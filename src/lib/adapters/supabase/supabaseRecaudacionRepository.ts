import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type {
  RecaudacionRepository,
  RecaudacionRow,
  HistorialPagoRow,
  CuotaPagadaRow,
} from '@/lib/ports'

export class SupabaseRecaudacionRepository implements RecaudacionRepository {
  // deferred: implemented in Slice E (UI); adapter body is live here (Phase 0)
  async recaudacionCobradora(): Promise<RecaudacionRow[]> {
    const { data, error } = await supabase
      .from('cascada_recaudacion_cobradora')
      .select('*')
      .order('monto_pagado', { ascending: false })

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data ?? []) as RecaudacionRow[]
  }

  // deferred: implemented in Slice E (UI); adapter body is live here (Phase 0)
  async historialPagos(): Promise<HistorialPagoRow[]> {
    const { data, error } = await supabase
      .from('cascada_historial_pagos')
      .select('*')
      .limit(20)

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data ?? []) as HistorialPagoRow[]
  }

  // deferred: implemented in Slice E (UI); adapter body is live here (Phase 0)
  async cuotasPagadas(): Promise<CuotaPagadaRow[]> {
    const { data, error } = await supabase
      .from('cascada_cuotas_pagadas')
      .select('*')
      .limit(200)

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data ?? []) as CuotaPagadaRow[]
  }
}

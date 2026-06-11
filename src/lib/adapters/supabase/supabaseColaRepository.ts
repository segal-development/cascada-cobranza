import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type { ColaRepository, SiguienteResult } from '@/lib/ports'

export class SupabaseColaRepository implements ColaRepository {
  async siguienteCliente(): Promise<SiguienteResult> {
    const { data, error } = await supabase.rpc('cascada_siguiente_cliente')

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    // A Postgres function returning NULL yields { data: null, error: null }.
    // Guard it so the contract throws RepositoryError instead of a raw TypeError.
    if (data == null) {
      throw new RepositoryError('cascada_siguiente_cliente returned an empty result')
    }

    const result = data as Record<string, unknown>

    // Discriminated union: fin_cola: true → queue exhausted; otherwise full client row
    if (result.fin_cola === true) {
      return { fin_cola: true, mensaje: result.mensaje as string }
    }

    return result as unknown as SiguienteResult
  }

  async countPendientes(): Promise<number> {
    const { count, error } = await supabase
      .from('cascada_clientes')
      .select('rut', { count: 'exact', head: true })
      .eq('estado_cuota', 'vigente')
      .not('regla', 'in', '(SAYORANA,PAGADO,R6)')
      .not('estado_gestion', 'in', '(gestionado_hoy,compromiso_vigente,verificacion_pendiente)')

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return count ?? 0
  }
}

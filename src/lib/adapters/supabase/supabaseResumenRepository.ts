import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type {
  ResumenRepository,
  ResumenCobradora,
  KpiGestionados,
  DesgloseGestiones,
  SegmentoKind,
  SetearMetaParams,
} from '@/lib/ports'

export class SupabaseResumenRepository implements ResumenRepository {
  async getResumenDia(): Promise<ResumenCobradora[]> {
    const { data, error } = await supabase.from('cascada_resumen_dia').select('*')

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data ?? []).map((r) => ({
      cobradora_id: r.cobradora_id,
      cobradora_nombre: r.cobradora_nombre,
      gestiones_hoy: Number(r.gestiones_hoy) || 0,
      gestiones_mes: Number(r.gestiones_mes) || 0,
      meta_diaria: Number(r.meta_diaria) || 0,
      meta_mes_acumulada: Number(r.meta_mes_acumulada) || 0,
      meta_mes_total: Number(r.meta_mes_total) || 0,
      cartera_total: Number(r.cartera_total) || 0,
      monto_cartera: Number(r.monto_cartera) || 0,
      es_pool: Boolean(r.es_pool),
    }))
  }

  // deferred: implemented in Slice C
  async getKpiGestionados(): Promise<KpiGestionados> {
    throw new RepositoryError('not implemented: resumen.getKpiGestionados')
  }

  // deferred: implemented in Slice C
  async getDesgloseSegmento(
    _segmento: SegmentoKind,
    _fecha: string,
  ): Promise<DesgloseGestiones> {
    throw new RepositoryError('not implemented: resumen.getDesgloseSegmento')
  }

  // deferred: implemented in Slice D
  async getResumenGestiones(
    _cobradoraId: string,
    _fecha: string,
  ): Promise<DesgloseGestiones> {
    throw new RepositoryError('not implemented: resumen.getResumenGestiones')
  }

  // deferred: implemented in Slice D
  async setearMeta(_params: SetearMetaParams): Promise<void> {
    throw new RepositoryError('not implemented: resumen.setearMeta')
  }
}

// Resumen domain types

export interface ResumenCobradora {
  cobradora_id: string
  cobradora_nombre: string
  gestiones_hoy: number
  gestiones_mes: number
  meta_diaria: number
  meta_mes_acumulada: number
  meta_mes_total: number
  cartera_total: number
  monto_cartera: number
  es_pool: boolean
}

export interface KpiGestionados {
  criticas_gest: number
  criticas_pct: number
  urgentes_gest: number
  urgentes_pct: number
  promesas_gest: number
  promesas_pct: number
}

export interface DesgloseGestiones {
  total: number
  por_efecto: Record<string, number>
  por_tipo: Record<string, number>
}

export const SEGMENTO_KIND = {
  CRITICAS: 'criticas',
  URGENTES: 'urgentes',
  PROMESAS: 'promesas',
} as const

export type SegmentoKind = (typeof SEGMENTO_KIND)[keyof typeof SEGMENTO_KIND]

export interface SetearMetaParams {
  cobradoraId: string
  meta: number
  fecha: string
  aplicarPermanente: boolean
  motivo: string | null
}

// Resumen repository port
export interface ResumenRepository {
  /** Fetch daily summary per cobradora from cascada_resumen_dia. */
  getResumenDia(): Promise<ResumenCobradora[]>

  // deferred: implemented in Slice C
  /** Fetch KPI totals via cascada_kpi_gestionados RPC. */
  getKpiGestionados(): Promise<KpiGestionados>

  // deferred: implemented in Slice C
  /** Fetch segment breakdown via cascada_desglose_segmento RPC. */
  getDesgloseSegmento(segmento: SegmentoKind, fecha: string): Promise<DesgloseGestiones>

  // deferred: implemented in Slice D
  /** Fetch cobradora productivity via cascada_resumen_gestiones RPC. */
  getResumenGestiones(cobradoraId: string, fecha: string): Promise<DesgloseGestiones>

  // deferred: implemented in Slice D
  /** Update daily meta via cascada_setear_meta RPC. */
  setearMeta(params: SetearMetaParams): Promise<void>
}

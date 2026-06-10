// Recaudacion domain types

export interface RecaudacionRow {
  cobradora: string
  cuotas_pagadas: number
  clientes_pagaron: number
  monto_pagado: number
}

export interface HistorialPagoRow {
  created_at: string
  nombre_archivo: string
  registros_archivo: number
  cuotas_marcadas: number
  subido_por: string
}

export interface CuotaPagadaRow {
  nombre: string
  rut: string
  nro_cuota: string
  nro_total_cuotas: number
  monto: number
  cobradora: string
  fec_vencimiento: string
}

// Recaudacion repository port — all methods deferred: implemented in Slice E
export interface RecaudacionRepository {
  // deferred: implemented in Slice E
  /** Fetch per-cobradora recaudacion summary from cascada_recaudacion_cobradora view. */
  recaudacionCobradora(): Promise<RecaudacionRow[]>

  // deferred: implemented in Slice E
  /** Fetch last 20 payment file loads from cascada_historial_pagos view. */
  historialPagos(): Promise<HistorialPagoRow[]>

  // deferred: implemented in Slice E
  /** Fetch last 200 paid cuotas from cascada_cuotas_pagadas view. */
  cuotasPagadas(): Promise<CuotaPagadaRow[]>
}

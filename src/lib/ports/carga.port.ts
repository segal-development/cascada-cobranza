// Carga domain types

/** Represents one ERP row mapped via the 25-column COL_MAP. */
export interface CargaRow {
  rut: string
  nombre?: string
  tipo_ingreso?: string
  nombre_tipo?: string
  fec_vencimiento?: string
  nro_cuota?: string
  monto?: number
  valor_contrato?: number
  nro_total_cuotas?: string
  nro_contrato?: string
  cobrador_cod?: string
  cobradora_nombre?: string
  ubicacion?: string
  telefono?: string
  celular?: string
  email?: string
  refere_mov?: string
  fecha_ges?: string
  accion_ges?: string
  efecto_ges?: string
  nota_ges?: string
  fecprox_ges?: string
  vendedor?: string
  abogado?: string
  procurador?: string
}

export interface CargaResult {
  nuevos: number
  actualizados: number
  gestiones_migradas: number
}

export interface CargaHist {
  created_at: string
  registros_procesados: number
  registros_nuevos: number
}

/** Payment row — union of three ERP formats (erp_can | erp_mov | simple). */
export type PagoRow = Record<string, string | number | null>

export interface CargaPagosResult {
  cuotas_marcadas_pagadas: number
  clientes_pagados: number
  no_encontradas: number
}

export interface AplicarSayoranaResult {
  movidos_al_pool: number
}

// Carga repository port
export interface CargaRepository {
  /** Upload monthly ERP cartera via cascada_carga_mensual RPC. */
  cargaMensual(registros: CargaRow[], nombreArchivo: string): Promise<CargaResult>

  // deferred: implemented in Slice B
  /** Fetch last cartera load from cascada_cargas_hist. */
  listCargasHist(): Promise<CargaHist[]>

  // deferred: implemented in Slice E
  /** Upload payment file via cascada_carga_pagos RPC. */
  cargaPagos(pagos: PagoRow[], nombreArchivo: string): Promise<CargaPagosResult>

  // deferred: implemented in Slice F
  /** Apply sayorana pool via cascada_aplicar_sayorana RPC. */
  aplicarSayorana(): Promise<AplicarSayoranaResult>
}

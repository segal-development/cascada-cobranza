// Gestion domain types

export interface RegistrarGestionInput {
  rut: string
  cuotaId: string
  tipo: string
  efecto: string
  nota: string | null
  fecProxima: string | null
}

export interface GestionExportRow {
  id: string
  fec_gestion: string
  refere_erp: string | null
  tipo: string
  efecto: string
  fec_proxima: string | null
  nota: string | null
  rut: string
  nombre_cliente: string
  cobradora: string
  nro_contrato: string
  nro_cuota: string
  monto: number
}

// Gestion repository port
export interface GestionRepository {
  /** Register a gestión via cascada_registrar_gestion RPC. Always includes p_rut. */
  registrarGestion(input: RegistrarGestionInput): Promise<void>

  // deferred: implemented in Slice F
  /** Fetch gestiones in date range via cascada_gestiones_rango RPC. */
  gestionesRango(desde: string, hasta: string): Promise<GestionExportRow[]>
}

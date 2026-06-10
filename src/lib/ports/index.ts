export type { AuthUser, AuthSession, AuthEventKind, AuthRepository } from './auth.port'
export { AUTH_EVENT } from './auth.port'

export type { ListClientesParams, CarteraRepository } from './cartera.port'

export type {
  ResumenCobradora,
  KpiGestionados,
  DesgloseGestiones,
  SegmentoKind,
  SetearMetaParams,
  ResumenRepository,
} from './resumen.port'
export { SEGMENTO_KIND } from './resumen.port'

export type { ColaAgotada, SiguienteResult, ColaRepository } from './cola.port'

export type {
  RegistrarGestionInput,
  GestionExportRow,
  GestionRepository,
} from './gestion.port'

export type {
  CargaRow,
  CargaResult,
  CargaHist,
  PagoRow,
  CargaPagosResult,
  AplicarSayoranaResult,
  CargaRepository,
} from './carga.port'

export type {
  RecaudacionRow,
  HistorialPagoRow,
  CuotaPagadaRow,
  RecaudacionRepository,
} from './recaudacion.port'

// Aggregate interface — the single injection point
export interface Repositories {
  auth: import('./auth.port').AuthRepository
  cartera: import('./cartera.port').CarteraRepository
  resumen: import('./resumen.port').ResumenRepository
  cola: import('./cola.port').ColaRepository
  gestion: import('./gestion.port').GestionRepository
  carga: import('./carga.port').CargaRepository
  recaudacion: import('./recaudacion.port').RecaudacionRepository
}

import { RepositoryError } from '@/lib/errors'
import type {
  Repositories,
  ResumenRepository,
  ColaRepository,
  GestionRepository,
  CargaRepository,
  RecaudacionRepository,
} from '@/lib/ports'
import { SupabaseAuthRepository } from './supabaseAuthRepository'
import { SupabaseCarteraRepository } from './supabaseCarteraRepository'

/** Stub factory — throws RepositoryError("not implemented") for all calls. */
function notImplemented(label: string) {
  return async (): Promise<never> => {
    throw new RepositoryError(`not implemented: ${label}`)
  }
}

export class SupabaseAdapter implements Repositories {
  auth = new SupabaseAuthRepository()
  cartera = new SupabaseCarteraRepository()

  // Stubs — bodies land in PR-02 (Resumen/Cola)
  resumen: ResumenRepository = {
    getResumenDia: notImplemented('resumen.getResumenDia'),
    getKpiGestionados: notImplemented('resumen.getKpiGestionados'),
    getDesgloseSegmento: notImplemented('resumen.getDesgloseSegmento'),
    getResumenGestiones: notImplemented('resumen.getResumenGestiones'),
    setearMeta: notImplemented('resumen.setearMeta'),
  }

  // Stubs — bodies land in PR-02 (Resumen/Cola)
  cola: ColaRepository = {
    siguienteCliente: notImplemented('cola.siguienteCliente'),
    countPendientes: notImplemented('cola.countPendientes'),
  }

  // Stubs — bodies land in PR-03 (Gestion/Carga/Recaudacion)
  gestion: GestionRepository = {
    registrarGestion: notImplemented('gestion.registrarGestion'),
    gestionesRango: notImplemented('gestion.gestionesRango'),
  }

  // Stubs — bodies land in PR-03 (cargaMensual/listCargasHist) and Slice E/F
  carga: CargaRepository = {
    cargaMensual: notImplemented('carga.cargaMensual'),
    listCargasHist: notImplemented('carga.listCargasHist'),
    cargaPagos: notImplemented('carga.cargaPagos'),
    aplicarSayorana: notImplemented('carga.aplicarSayorana'),
  }

  // Stubs — bodies land in Slice E
  recaudacion: RecaudacionRepository = {
    recaudacionCobradora: notImplemented('recaudacion.recaudacionCobradora'),
    historialPagos: notImplemented('recaudacion.historialPagos'),
    cuotasPagadas: notImplemented('recaudacion.cuotasPagadas'),
  }
}

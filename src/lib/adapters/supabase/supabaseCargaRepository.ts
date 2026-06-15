import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type {
  CargaRepository,
  CargaRow,
  CargaResult,
  CargaHist,
  PagoRow,
  CargaPagosResult,
  AplicarSayoranaResult,
} from '@/lib/ports'

export class SupabaseCargaRepository implements CargaRepository {
  async cargaMensual(registros: CargaRow[], nombreArchivo: string): Promise<CargaResult> {
    const { data, error } = await supabase.rpc('cascada_carga_mensual', {
      p_registros: registros,
      p_nombre_archivo: nombreArchivo,
    })

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return data as CargaResult
  }

  // deferred: implemented in Slice B (body); queried via cascada_cargas_hist
  async listCargasHist(): Promise<CargaHist[]> {
    const { data, error } = await supabase
      .from('cascada_cargas_hist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data ?? []) as CargaHist[]
  }

  // deferred: implemented in Slice E
  async cargaPagos(_pagos: PagoRow[], _nombreArchivo: string): Promise<CargaPagosResult> {
    throw new RepositoryError('not implemented: carga.cargaPagos')
  }

  // deferred: implemented in Slice F
  async aplicarSayorana(): Promise<AplicarSayoranaResult> {
    throw new RepositoryError('not implemented: carga.aplicarSayorana')
  }
}

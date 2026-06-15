import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type { GestionRepository, RegistrarGestionInput, GestionExportRow } from '@/lib/ports'

export class SupabaseGestionRepository implements GestionRepository {
  async registrarGestion(input: RegistrarGestionInput): Promise<void> {
    const { error } = await supabase.rpc('cascada_registrar_gestion', {
      p_rut: input.rut,
      p_cuota_id: input.cuotaId,
      p_tipo: input.tipo,
      p_efecto: input.efecto,
      p_nota: input.nota,
      p_fec_proxima: input.fecProxima,
    })

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }
  }

  // deferred: implemented in Slice F
  async gestionesRango(_desde: string, _hasta: string): Promise<GestionExportRow[]> {
    throw new RepositoryError('not implemented: gestion.gestionesRango')
  }
}

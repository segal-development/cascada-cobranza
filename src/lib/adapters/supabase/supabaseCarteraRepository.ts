import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import type { CarteraRepository, ListClientesParams } from '@/lib/ports'
import type { Cliente } from '@/types'

export class SupabaseCarteraRepository implements CarteraRepository {
  async listClientes(params?: ListClientesParams): Promise<Cliente[]> {
    let query = supabase.from('cascada_clientes').select('*')

    if (params?.cobradoraId) {
      query = query.eq('cobradora_id', params.cobradoraId)
    }

    const { data, error } = await query.limit(10000)

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data as Cliente[]) ?? []
  }
}

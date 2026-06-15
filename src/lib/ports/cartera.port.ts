import type { Cliente } from '@/types'

export interface ListClientesParams {
  cobradoraId?: string
}

export interface CarteraRepository {
  /** Fetch all clientes. Optionally filter by cobradoraId (jefatura view). */
  listClientes(params?: ListClientesParams): Promise<Cliente[]>
}

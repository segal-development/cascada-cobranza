import type { Cliente } from '@/types'

// Discriminated union: queue exhausted vs. next client row
export interface ColaAgotada {
  fin_cola: true
  mensaje: string
}

export type SiguienteResult = ColaAgotada | (Cliente & { fin_cola?: false })

export interface ColaRepository {
  /** Advance the work queue via cascada_siguiente_cliente RPC. */
  siguienteCliente(): Promise<SiguienteResult>
  /** Count pending clientes for the current cobradora. */
  countPendientes(): Promise<number>
}

// User roles
export type Rol = 'cobradora' | 'jefatura'

// Collection rules (reglas de cobranza)
export type Regla =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'SAYORANA'
  | 'PRE_DESISTIDO'
  | 'PAGADO'

// Management states
export type EstadoGestion =
  | 'sin_gestion'
  | 'gestionado_hoy'
  | 'wsp_respondido'
  | 'verificacion_pendiente'
  | 'compromiso_vigente'

// Action types
export type TipoGestion = 'llamada' | 'whatsapp' | 'sms' | 'correo'

// Action effects/outcomes
export type EfectoGestion =
  | 'compromiso_pago'
  | 'agenda_llamado'
  | 'no_contesta'
  | 'ocupado'
  | 'indica_deuda_pagada'
  | 'dificultad_pago'
  | 'no_quiere_pagar'
  | 'no_corresponde_numero'
  | 'cliente_equivocado'
  | 'pre_desistido'
  | 'otro'

// User profile
export interface Perfil {
  id: string
  nombre: string
  rol: Rol
  meta_diaria: number
  es_pool: boolean
}

// Client/Customer
export interface Cliente {
  rut: string
  cuota_id: string
  nombre: string
  regla: Regla
  dias_mora: number
  monto: number
  nro_cuota: number
  nro_total_cuotas: number
  zona_critica: string | null
  estado_gestion: EstadoGestion
  estado_cuota: string
  cobradora_id: string
  celular: string | null
  telefono: string | null
  movil_efectivo: string | null
  email: string | null
  fec_vencimiento: string
  accion_sugerida: string
  ultima_gestion_fecha: string | null
  ultimo_efecto: string | null
  ultima_gestion_nota: string | null
  fec_proxima: string | null
}

// Management action record
export interface Gestion {
  tipo: TipoGestion
  efecto: EfectoGestion
  nota: string | null
  fec_proxima: string | null
}

// Daily summary
export interface ResumenDia {
  gestiones_hoy: number
  gestiones_mes: number
  meta: number
  meta_mes_acumulada: number
  meta_mes_total: number
  cartera: number
  monto_cartera: number
}

// Filter state
export interface FiltroState {
  regla: Regla | null
  search: string
  ambito: 'mia' | 'todos' | string // 'mia', 'todos', or cobradora_id
}

// Sort options
export type SortMora = 'asc' | 'desc' | null

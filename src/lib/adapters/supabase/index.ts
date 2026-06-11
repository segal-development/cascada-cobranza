import type { Repositories } from '@/lib/ports'
import { SupabaseAuthRepository } from './supabaseAuthRepository'
import { SupabaseCarteraRepository } from './supabaseCarteraRepository'
import { SupabaseResumenRepository } from './supabaseResumenRepository'
import { SupabaseColaRepository } from './supabaseColaRepository'
import { SupabaseGestionRepository } from './supabaseGestionRepository'
import { SupabaseCargaRepository } from './supabaseCargaRepository'
import { SupabaseRecaudacionRepository } from './supabaseRecaudacionRepository'

export class SupabaseAdapter implements Repositories {
  auth = new SupabaseAuthRepository()
  cartera = new SupabaseCarteraRepository()
  resumen = new SupabaseResumenRepository()
  cola = new SupabaseColaRepository()
  gestion = new SupabaseGestionRepository()
  carga = new SupabaseCargaRepository()
  recaudacion = new SupabaseRecaudacionRepository()
}

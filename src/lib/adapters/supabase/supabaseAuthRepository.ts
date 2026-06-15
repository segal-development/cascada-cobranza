import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { RepositoryError } from '@/lib/errors'
import { AUTH_EVENT, type AuthEventKind, type AuthRepository, type AuthSession } from '@/lib/ports'
import type { Perfil } from '@/types'

// Map SDK auth events to domain AuthEventKind; unmapped events are ignored
const SDK_TO_DOMAIN: Partial<Record<AuthChangeEvent, AuthEventKind>> = {
  SIGNED_IN: AUTH_EVENT.SIGNED_IN,
  SIGNED_OUT: AUTH_EVENT.SIGNED_OUT,
  INITIAL_SESSION: AUTH_EVENT.INITIAL_SESSION,
}

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    if (!data.user) {
      throw new RepositoryError('No user returned from sign in')
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new RepositoryError(error.message, error.code)
    }
  }

  onAuthChange(cb: (e: AuthEventKind, userId: string | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const eventKind = SDK_TO_DOMAIN[event]
      if (eventKind !== undefined) {
        cb(eventKind, session?.user?.id ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }

  async getPerfil(): Promise<Perfil | null> {
    const { data, error } = await supabase.rpc('cascada_mi_perfil')

    if (error) {
      throw new RepositoryError(error.message, error.code)
    }

    return (data as Perfil | null) ?? null
  }
}

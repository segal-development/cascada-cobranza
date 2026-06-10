// Auth domain types

export interface AuthUser {
  id: string
  email?: string | null
}

export interface AuthSession {
  user: AuthUser
}

export const AUTH_EVENT = {
  SIGNED_IN: 'SIGNED_IN',
  SIGNED_OUT: 'SIGNED_OUT',
  INITIAL_SESSION: 'INITIAL_SESSION',
} as const

export type AuthEventKind = (typeof AUTH_EVENT)[keyof typeof AUTH_EVENT]

// Auth repository port
export interface AuthRepository {
  /** Sign in with email + password. Throws RepositoryError on failure. */
  signIn(email: string, password: string): Promise<AuthSession>
  /** Sign out the current user. */
  signOut(): Promise<void>
  /**
   * Subscribe to auth state changes.
   * @param cb Called with a neutral event kind and the user id (or null on sign-out).
   * @returns Unsubscribe function.
   */
  onAuthChange(cb: (e: AuthEventKind, userId: string | null) => void): () => void
  /** Fetch the current user's application profile via cascada_mi_perfil RPC. */
  getPerfil(): Promise<import('@/types').Perfil | null>
}

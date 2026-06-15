import { SupabaseAdapter } from '@/lib/adapters/supabase'
import type { Repositories } from '@/lib/ports'

let current: Repositories = new SupabaseAdapter()

/**
 * Module-singleton repository registry.
 *
 * Stores import { repositories } and call methods on it.
 * The Proxy keeps the exported reference stable while allowing
 * __setRepositories to swap the live implementation in unit tests.
 */
export const repositories: Repositories = new Proxy({} as Repositories, {
  get(_target, key: string | symbol) {
    return current[key as keyof Repositories]
  },
})

/**
 * Test-only seam — replace the backing adapter.
 * Call this in beforeEach to inject a mock adapter.
 * Never call in production code.
 */
export function __setRepositories(next: Repositories): void {
  current = next
}

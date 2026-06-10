import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Repositories } from '@/lib/ports'

// Inline factory to avoid hoisting issues with vi.mock
vi.mock('@/lib/adapters/supabase', () => ({
  SupabaseAdapter: vi.fn().mockImplementation(() => ({
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthChange: vi.fn(),
      getPerfil: vi.fn(),
    },
    cartera: { listClientes: vi.fn() },
    resumen: {
      getResumenDia: vi.fn(),
      getKpiGestionados: vi.fn(),
      getDesgloseSegmento: vi.fn(),
      getResumenGestiones: vi.fn(),
      setearMeta: vi.fn(),
    },
    cola: { siguienteCliente: vi.fn(), countPendientes: vi.fn() },
    gestion: { registrarGestion: vi.fn(), gestionesRango: vi.fn() },
    carga: {
      cargaMensual: vi.fn(),
      listCargasHist: vi.fn(),
      cargaPagos: vi.fn(),
      aplicarSayorana: vi.fn(),
    },
    recaudacion: {
      recaudacionCobradora: vi.fn(),
      historialPagos: vi.fn(),
      cuotasPagadas: vi.fn(),
    },
  })),
}))

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { repositories, __setRepositories } from './repositories'

/** Build a lightweight fake Repositories aggregate for swap testing. */
function makeFakeRepositories(): Repositories {
  return {
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthChange: vi.fn(),
      getPerfil: vi.fn(),
    },
    cartera: { listClientes: vi.fn() },
    resumen: {
      getResumenDia: vi.fn(),
      getKpiGestionados: vi.fn(),
      getDesgloseSegmento: vi.fn(),
      getResumenGestiones: vi.fn(),
      setearMeta: vi.fn(),
    },
    cola: { siguienteCliente: vi.fn(), countPendientes: vi.fn() },
    gestion: { registrarGestion: vi.fn(), gestionesRango: vi.fn() },
    carga: {
      cargaMensual: vi.fn(),
      listCargasHist: vi.fn(),
      cargaPagos: vi.fn(),
      aplicarSayorana: vi.fn(),
    },
    recaudacion: {
      recaudacionCobradora: vi.fn(),
      historialPagos: vi.fn(),
      cuotasPagadas: vi.fn(),
    },
  }
}

describe('repositories module-singleton', () => {
  it('exports a repositories object', () => {
    expect(repositories).toBeDefined()
    expect(typeof repositories).toBe('object')
  })

  it('repositories.auth is accessible via Proxy', () => {
    expect(repositories.auth).toBeDefined()
  })

  it('repositories.cartera is accessible via Proxy', () => {
    expect(repositories.cartera).toBeDefined()
  })

  describe('__setRepositories seam', () => {
    let original: Repositories

    beforeEach(() => {
      // Save a fresh fake as the "original" adapter for isolation
      original = makeFakeRepositories()
      __setRepositories(original)
    })

    it('replaces the backing adapter', () => {
      const alternate = makeFakeRepositories()
      __setRepositories(alternate)

      expect(repositories.auth).toBe(alternate.auth)
      expect(repositories.cartera).toBe(alternate.cartera)
    })

    it('Proxy reflects the swap — new calls go to the new adapter', async () => {
      const alt = makeFakeRepositories()
      const expected = [{ rut: 'test-rut', cuota_id: 'c1', nome: 'Test' }]
      vi.mocked(alt.cartera.listClientes).mockResolvedValue(expected as never)

      __setRepositories(alt)

      const result = await repositories.cartera.listClientes()
      expect(alt.cartera.listClientes).toHaveBeenCalled()
      expect(result).toEqual(expected)
    })

    it('old adapter is no longer called after swap', async () => {
      const alt = makeFakeRepositories()
      vi.mocked(alt.auth.signIn).mockResolvedValue({ user: { id: 'new', email: null } })

      __setRepositories(alt)

      await repositories.auth.signIn('a@b.cl', 'pass')
      expect(original.auth.signIn).not.toHaveBeenCalled()
      expect(alt.auth.signIn).toHaveBeenCalledWith('a@b.cl', 'pass')
    })
  })
})

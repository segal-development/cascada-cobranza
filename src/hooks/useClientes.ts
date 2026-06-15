import { useEffect } from 'react'
import { useCarteraStore } from '@/stores/carteraStore'
import { useResumenStore } from '@/stores/resumenStore'
import { useAuthStore } from '@/stores/authStore'

/**
 * Hook to load and manage cliente data
 * Automatically loads clientes and resumen when perfil/ambito changes
 */
export function useClientes() {
  const { perfil } = useAuthStore()
  const {
    clientes,
    filtroRegla,
    filtroAmbito,
    search,
    sortMora,
    page,
    pageSize,
    isLoading: carteraLoading,
    error: carteraError,
    loadClientes,
    getFiltered,
    setFiltroRegla,
    setFiltroAmbito,
    setSearch,
    setSortMora,
    setPage,
  } = useCarteraStore()

  const {
    resumen,
    resumenTodas,
    isLoading: resumenLoading,
    error: resumenError,
    loadResumen,
  } = useResumenStore()

  // Load data on mount and when ambito changes
  useEffect(() => {
    if (perfil?.id) {
      loadClientes(perfil.rol)
      loadResumen(perfil.id, perfil.rol, filtroAmbito)
    }
  }, [perfil?.id, perfil?.rol, filtroAmbito, loadClientes, loadResumen])

  // Get filtered and paginated data
  const filtered = getFiltered()
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedClientes = filtered.slice(page * pageSize, (page + 1) * pageSize)

  // Reload data function
  const reload = () => {
    if (perfil?.id) {
      loadClientes(perfil.rol)
      loadResumen(perfil.id, perfil.rol, filtroAmbito)
    }
  }

  return {
    // Data
    clientes: paginatedClientes,
    allClientes: clientes,
    filteredClientes: filtered,
    resumen,
    resumenTodas,

    // Filter state
    filtroRegla,
    filtroAmbito,
    search,
    sortMora,

    // Pagination
    page,
    pageSize,
    totalPages,
    totalCount: filtered.length,

    // Loading/error
    isLoading: carteraLoading || resumenLoading,
    error: carteraError || resumenError,

    // Actions
    setFiltroRegla,
    setFiltroAmbito,
    setSearch,
    setSortMora,
    setPage,
    reload,
  }
}

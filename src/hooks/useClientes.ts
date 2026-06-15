import { useEffect } from 'react'
import { useCarteraStore, filterCartera } from '@/stores/carteraStore'
import { useResumenStore } from '@/stores/resumenStore'
import { useAuthStore } from '@/stores/authStore'
import { useShallow } from 'zustand/react/shallow'

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
    filtroPrioritario,
    search,
    sortMora,
    page,
    pageSize,
    isLoading: carteraLoading,
    error: carteraError,
    loadClientes,
    setFiltroRegla,
    setFiltroAmbito,
    setFiltroPrioritario,
    setSearch,
    setSortMora,
    setPage,
  } = useCarteraStore(
    useShallow((state) => ({
      clientes: state.clientes,
      filtroRegla: state.filtroRegla,
      filtroAmbito: state.filtroAmbito,
      filtroPrioritario: state.filtroPrioritario,
      search: state.search,
      sortMora: state.sortMora,
      page: state.page,
      pageSize: state.pageSize,
      isLoading: state.isLoading,
      error: state.error,
      loadClientes: state.loadClientes,
      setFiltroRegla: state.setFiltroRegla,
      setFiltroAmbito: state.setFiltroAmbito,
      setFiltroPrioritario: state.setFiltroPrioritario,
      setSearch: state.setSearch,
      setSortMora: state.setSortMora,
      setPage: state.setPage,
    })),
  )

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

  // Get filtered and paginated data.
  // Call the pure filter with subscribed state (not the store's getFiltered()
  // getter) so the React Compiler tracks clientes/filters as dependencies and
  // recomputes when data loads — a getFiltered() call gets memoized stale.
  const filtered = filterCartera(clientes, filtroRegla, search, sortMora, filtroPrioritario)
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
    filtroPrioritario,
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
    setFiltroPrioritario,
    setSearch,
    setSortMora,
    setPage,
    reload,
  }
}

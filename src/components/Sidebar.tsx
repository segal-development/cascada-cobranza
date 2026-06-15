import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useColaStore } from '@/stores/colaStore'
import {
  useCarteraStore,
  filterCartera,
  countPriorityBuckets,
  type PriorityBucketKey,
  PRIORITY_BUCKET,
} from '@/stores/carteraStore'
import { useResumenStore } from '@/stores/resumenStore'
import { repositories } from '@/lib/repositories'
import type { CargaHist } from '@/lib/ports'
import { cn } from '@/lib/utils'

// Priority bucket display configuration
const PRIORITY_TILES: Array<{
  key: PriorityBucketKey
  label: string
  dotColor: string
}> = [
  { key: PRIORITY_BUCKET.VENCE_HOY, label: 'Vence hoy', dotColor: 'bg-red-500' },
  { key: PRIORITY_BUCKET.R5_AL_LIMITE, label: 'R5 · Al límite', dotColor: 'bg-orange-400' },
  { key: PRIORITY_BUCKET.PRE_BLOQUEO, label: 'Pre-bloqueo 30+d', dotColor: 'bg-amber-400' },
  { key: PRIORITY_BUCKET.MORA_ACTIVA, label: 'Mora activa 15-29d', dotColor: 'bg-yellow-400' },
  { key: PRIORITY_BUCKET.R1_PRIMER, label: 'R1 · Primer contacto', dotColor: 'bg-sky-400' },
]

/**
 * Format a Date into a relative "hace N min" label for the sync status.
 * Pure function — called with subscribed lastLoadedAt.
 */
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'hace un momento'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin === 1) return 'hace 1 min'
  if (diffMin < 60) return `hace ${diffMin} min`
  return `hace ${Math.floor(diffMin / 60)} h`
}

/**
 * Format an ISO timestamp for ÚLTIMA CARGA display.
 * Pure function.
 */
function formatCargaTimestamp(isoStr: string): string {
  const date = new Date(isoStr)
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export function Sidebar() {
  const { perfil } = useAuthStore()
  const { openModal } = useUIStore()
  const { enterColaMode, isLoading } = useColaStore(
    useShallow((state) => ({ enterColaMode: state.enterColaMode, isLoading: state.isLoading }))
  )

  const {
    clientes,
    filtroRegla,
    filtroPrioritario,
    setFiltroRegla,
    setFiltroPrioritario,
    lastLoadedAt,
  } = useCarteraStore(
    useShallow((state) => ({
      clientes: state.clientes,
      filtroRegla: state.filtroRegla,
      filtroPrioritario: state.filtroPrioritario,
      setFiltroRegla: state.setFiltroRegla,
      setFiltroPrioritario: state.setFiltroPrioritario,
      lastLoadedAt: state.lastLoadedAt,
    }))
  )

  const { resumenTodas } = useResumenStore(
    useShallow((state) => ({ resumenTodas: state.resumenTodas }))
  )

  const isJefatura = perfil?.rol === 'jefatura'

  // ---- ÚLTIMA CARGA — local fetch on sidebar mount ----
  const [ultimaCarga, setUltimaCarga] = useState<CargaHist | null>(null)
  const [cargaLoading, setCargaLoading] = useState(false)
  const [cargaError, setCargaError] = useState<string | null>(null)

  useEffect(() => {
    if (!isJefatura) return
    setCargaLoading(true)
    repositories.carga
      .listCargasHist()
      .then((hists) => {
        setUltimaCarga(hists[0] ?? null)
        setCargaLoading(false)
      })
      .catch((err: unknown) => {
        setCargaError(err instanceof Error ? err.message : 'Error al cargar historial')
        setCargaLoading(false)
      })
  }, [isJefatura])

  // ---- Derived counts (pure, compiler-safe — called with subscribed clientes) ----
  const totalClientes = clientes.length
  // "Urgentes hoy" uses same CRITICO filter as the main dashboard
  const urgentesHoyCount = filterCartera(clientes, 'CRITICO', '', null).length
  const sinGestionarCount = clientes.filter((c) => c.estado_gestion === 'sin_gestion').length

  // Priority bucket counts for ATENCIÓN PRIORITARIA section
  const bucketCounts = countPriorityBuckets(clientes)
  const totalPrioritario = Object.values(bucketCounts).reduce((s, n) => s + n, 0)

  // Active Vista button derived from filtroRegla
  const vistaActiva =
    filtroRegla === 'CRITICO' ? 'urgentes' : filtroRegla === null ? 'todos' : null

  // Sync label derived from lastLoadedAt
  const syncLabel = lastLoadedAt ? formatRelativeTime(lastLoadedAt) : 'Actualizando...'

  return (
    <aside className="bg-bg-panel border-r border-line-soft p-5 min-h-[calc(100vh-56px)] flex flex-col gap-5">
      {/* Siguiente cliente — visible to all authenticated users */}
      <div>
        <button
          aria-label="Siguiente cliente"
          onClick={() => void enterColaMode()}
          disabled={isLoading}
          className="w-full bg-ocean text-white rounded-lg py-2.5 px-3.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-ocean/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {isLoading ? 'Cargando...' : 'Siguiente cliente'}
          <span className="ml-auto font-mono text-[10px] opacity-60">N</span>
        </button>
      </div>

      {/* Jefatura-only sections */}
      {isJefatura && (
        <>
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => openModal('carga')}
              className="w-full bg-amber text-ink rounded-lg py-2.5 px-3.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#b87a10] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Carga Mensual
              <span className="ml-auto font-mono text-[10px] opacity-60">⌘U</span>
            </button>

            <button className="w-full bg-bg-panel border border-line rounded-lg py-2.5 px-3.5 text-[13px] text-ink-soft flex items-center gap-2 hover:bg-bg-soft hover:text-ink transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Reporte
              <span className="ml-auto font-mono text-[10px] opacity-60">⌘R</span>
            </button>
          </div>

          {/* Vista filters — computed from subscribed clientes (not hardcoded) */}
          <section>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Vista
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">3 filtros</span>
            </div>
            <div className="flex flex-col">
              {([
                { key: 'todos', label: 'Equipo completo', count: totalClientes, color: 'bg-ink', onClick: () => setFiltroRegla(null) },
                { key: 'urgentes', label: 'Urgentes hoy', count: urgentesHoyCount, color: 'bg-amber-hot', onClick: () => setFiltroRegla('CRITICO') },
                { key: 'pendientes', label: 'Sin gestionar', count: sinGestionarCount, color: 'bg-ink-faint', onClick: undefined },
              ] as const).map((filter) => (
                <button
                  key={filter.key}
                  onClick={filter.onClick}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[12.5px] text-ink-soft hover:bg-bg-soft transition-colors',
                    vistaActiva === filter.key && 'bg-bg-active text-ink font-medium',
                  )}
                >
                  <span className={`w-2 h-2 rounded-full ${filter.color}`} />
                  <span className="flex-1 text-left">{filter.label}</span>
                  <span className="font-mono text-[11.5px] text-ink-mute">{filter.count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ATENCIÓN PRIORITARIA — 5 priority buckets (FR-007) */}
          <section>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Atención Prioritaria
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">{totalPrioritario}</span>
            </div>
            <div className="flex flex-col">
              {PRIORITY_TILES.map((tile) => (
                <button
                  key={tile.key}
                  onClick={() => setFiltroPrioritario(tile.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[12.5px] text-ink-soft hover:bg-bg-soft transition-colors',
                    filtroPrioritario === tile.key && 'bg-bg-active text-ink font-medium',
                  )}
                >
                  <span className={`w-2 h-2 rounded-full ${tile.dotColor}`} />
                  <span className="flex-1 text-left">{tile.label}</span>
                  <span className="font-mono text-[11.5px] text-ink-mute">
                    {bucketCounts[tile.key]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* CARTERAS — real data from resumenStore (cascada_resumen_dia) */}
          <section className="flex-1">
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Cobradoras
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">{resumenTodas.length}</span>
            </div>
            <div className="flex flex-col">
              {resumenTodas.map((cobradora) => (
                <button
                  key={cobradora.cobradora_id}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-bg-soft transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-bg-soft border border-line-soft grid place-items-center text-[10px] font-bold text-ink-soft">
                    {cobradora.es_pool
                      ? '∞'
                      : cobradora.cobradora_nombre
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                  </span>
                  <span className="flex-1 text-left text-[12.5px]">{cobradora.cobradora_nombre}</span>
                  <span className="font-mono text-[11px] text-ink-mute">{cobradora.cartera_total}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ÚLTIMA CARGA — fetched from cascada_cargas_hist on mount (FR-003) */}
          <section>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Última Carga
              </h3>
            </div>
            {cargaLoading && (
              <p className="text-[11.5px] text-ink-mute">Cargando...</p>
            )}
            {cargaError && !cargaLoading && (
              <p className="text-[11.5px] text-red-400">Error: {cargaError}</p>
            )}
            {!cargaLoading && !cargaError && ultimaCarga && (
              <div className="flex flex-col gap-0.5 text-[11.5px] text-ink-soft">
                <span>{formatCargaTimestamp(ultimaCarga.created_at)}</span>
                <span className="font-mono text-ink-mute">
                  {ultimaCarga.registros_procesados} procesados · {ultimaCarga.registros_nuevos} nuevos
                </span>
              </div>
            )}
            {!cargaLoading && !cargaError && !ultimaCarga && (
              <p className="text-[11.5px] text-ink-faint">Sin registros</p>
            )}
          </section>
        </>
      )}

      {/* Sync status */}
      <div className="pt-4 border-t border-line-soft">
        <div className="flex items-center gap-2 text-[11px] text-ink-mute">
          <span className="relative w-[6px] h-[6px] rounded-full bg-sage">
            <span className="absolute inset-[-3px] rounded-full border border-sage opacity-40 animate-pulse" />
          </span>
          <span>Sincronizado</span>
          <span className="font-mono text-ink-faint ml-auto">{syncLabel}</span>
        </div>
      </div>
    </aside>
  )
}

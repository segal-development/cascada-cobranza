import { useUIStore } from '@/stores/uiStore'
import { useClientes } from '@/hooks/useClientes'
import { KPI } from '@/components/KPI'
import { KPIGrid } from '@/components/KPIGrid'
import { FilterPills } from '@/components/FilterPills'
import { ClienteTable } from '@/components/ClienteTable'
import { formatCLP, formatNumber } from '@/lib/format'

export function DashboardJefatura() {
  const { openModal } = useUIStore()
  const {
    clientes,
    allClientes,
    resumen,
    filtroRegla,
    filtroAmbito,
    page,
    pageSize,
    totalPages,
    totalCount,
    setFiltroRegla,
    setPage,
    isLoading,
  } = useClientes()

  // Calculate critical counts
  const zonasCriticas = allClientes.filter(
    (c) => c.zona_critica && c.regla !== 'PAGADO',
  ).length
  const venceHoy = allClientes.filter(
    (c) => c.zona_critica === 'CRIT_VENCE_HOY',
  ).length
  const r5Count = allClientes.filter((c) => c.regla === 'R5').length
  const promesas = allClientes.filter((c) => c.regla === 'R3').length

  const urgentes = zonasCriticas + r5Count

  // KPI data
  const cartera = resumen?.cartera ?? 0
  const montoCartera = resumen?.monto_cartera ?? 0

  // Label for current view
  const viewLabel =
    filtroAmbito === 'todos'
      ? 'Equipo completo'
      : filtroAmbito === 'mia'
        ? 'Mi cartera'
        : 'Cobradora seleccionada'

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">
          Sala de operaciones · <span className="text-amber">{viewLabel}</span>
        </h1>
        <p className="text-ink-mute text-sm mt-1.5">
          {formatNumber(allClientes.length)} casos en vista
        </p>
        <div className="flex items-center gap-2.5 mt-2.5">
          <span className="relative w-[7px] h-[7px] rounded-full bg-sage">
            <span className="absolute inset-[-4px] rounded-full border border-sage opacity-40 animate-pulse" />
          </span>
          <span className="font-mono text-xs text-ink-mute">
            Cascada activa · {isLoading ? 'sincronizando...' : 'datos actualizados'}
          </span>
        </div>
      </div>

      {/* KPIs - 4 columns for jefatura */}
      <KPIGrid cols={4}>
        <KPI
          label="Zonas criticas"
          value={zonasCriticas}
          valueClass="amber-hot"
          detail={`${formatNumber(venceHoy)} vencen HOY`}
        />
        <KPI
          label="Urgentes hoy (R5+R1)"
          value={urgentes}
          detail={`de ${formatNumber(allClientes.length)} casos en vista`}
        />
        <KPI
          label="Promesas vigentes"
          value={promesas}
          detail="R3 · compromisos de pago activos"
        />
        <KPI
          label="Cartera total gestionable"
          value={formatCLP(montoCartera)}
          detail={`${formatNumber(cartera)} clientes activos`}
        />
      </KPIGrid>

      {/* Filter pills */}
      <FilterPills
        clientes={allClientes}
        active={filtroRegla}
        onChange={(regla) => setFiltroRegla(regla)}
      />

      {/* Table */}
      <ClienteTable
        clientes={clientes}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(cliente) => openModal('cliente', cliente)}
      />
    </div>
  )
}

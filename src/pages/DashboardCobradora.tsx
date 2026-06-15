import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useClientes } from '@/hooks/useClientes'
import { KPI } from '@/components/KPI'
import { KPIGrid } from '@/components/KPIGrid'
import { FilterPills } from '@/components/FilterPills'
import { ClienteTable } from '@/components/ClienteTable'
import { formatNumber } from '@/lib/format'

export function DashboardCobradora() {
  const { perfil } = useAuthStore()
  const { openModal } = useUIStore()
  const {
    clientes,
    allClientes,
    resumen,
    filtroRegla,
    page,
    pageSize,
    totalPages,
    totalCount,
    setFiltroRegla,
    setPage,
    isLoading,
  } = useClientes()

  // Calculate urgentes count
  const today = new Date().toISOString().slice(0, 10)
  const urgentes = allClientes.filter((c) => {
    const isCritico =
      c.estado_gestion === 'sin_gestion' &&
      c.dias_mora >= 0 &&
      !['SAYORANA', 'PAGADO', 'R6'].includes(c.regla)
    const isCompromisoDue =
      c.estado_gestion === 'compromiso_vigente' &&
      c.fec_proxima &&
      c.fec_proxima <= today
    return isCritico || isCompromisoDue
  }).length

  const zonasCriticas = allClientes.filter(
    (c) => c.zona_critica && c.regla !== 'PAGADO',
  ).length
  const r5Count = allClientes.filter((c) => c.regla === 'R5').length

  // KPI data
  const metaDia = resumen?.meta ?? perfil?.meta_diaria ?? 0
  const gestionesHoy = resumen?.gestiones_hoy ?? 0
  const gestionesMes = resumen?.gestiones_mes ?? 0
  const metaMesTotal = resumen?.meta_mes_total ?? 0
  const pctMes = metaMesTotal
    ? Math.min(100, Math.round((gestionesMes / metaMesTotal) * 100))
    : 0

  const mesNombre = new Date().toLocaleDateString('es-CL', { month: 'long' })
  const firstName = perfil?.nombre?.split(' ')[0] ?? 'Usuario'

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">
          Hola, <span className="text-amber">{firstName}</span>
        </h1>
        <p className="text-ink-mute text-sm mt-1.5">
          Tu cartera priorizada por la cascada. Empieza por las urgencias.
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

      {/* KPIs */}
      <KPIGrid cols={3}>
        <KPI
          label="Urgentes hoy"
          value={urgentes}
          valueClass="amber-hot"
          detail={`${formatNumber(zonasCriticas)} zonas criticas · ${formatNumber(r5Count)} R5 al limite`}
        />
        <KPI
          label="Mi meta del dia"
          value={gestionesHoy}
          unit={`/ ${metaDia}`}
          detail={
            gestionesHoy >= metaDia
              ? '✓ Meta alcanzada'
              : `${Math.max(0, metaDia - gestionesHoy)} gestiones restantes`
          }
          progress={{
            value: gestionesHoy,
            max: metaDia,
            tone: 'sage',
          }}
        />
        <KPI
          label={`Mi meta del mes · ${mesNombre}`}
          value={gestionesMes}
          unit={`/ ${metaMesTotal}`}
          detail={`${pctMes}% del mes completo`}
          progress={{
            value: gestionesMes,
            max: metaMesTotal,
            tone: 'ocean',
          }}
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

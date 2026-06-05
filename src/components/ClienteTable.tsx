import type { Cliente, EstadoGestion } from '@/types'
import { RuleChip } from './RuleChip'
import { Pagination } from './Pagination'
import { formatCLP, formatDate, formatNumber } from '@/lib/format'

// Status indicators
const ESTADO_ICON: Record<EstadoGestion, string> = {
  sin_gestion: '⚪',
  gestionado_hoy: '🟡',
  wsp_respondido: '🟢',
  verificacion_pendiente: '🔵',
  compromiso_vigente: '🟣',
}

const ESTADO_TITLE: Record<EstadoGestion, string> = {
  sin_gestion: 'Sin gestion hoy - pendiente',
  gestionado_hoy: 'Gestionado hoy - esperando respuesta',
  wsp_respondido: 'WSP respondido - prioridad alta',
  verificacion_pendiente: 'Verificacion pendiente - indica deuda pagada',
  compromiso_vigente: 'Compromiso de pago vigente',
}

interface ClienteTableProps {
  clientes: Cliente[]
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onRowClick?: (cliente: Cliente) => void
}

export function ClienteTable({
  clientes,
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onRowClick,
}: ClienteTableProps) {
  const baseRowNum = page * pageSize

  const getMoraClass = (dias: number, isPagada: boolean) => {
    if (isPagada) return ''
    if (dias >= 45) return 'text-rust font-medium'
    if (dias >= 15) return 'text-amber font-medium'
    return 'text-ink-soft'
  }

  const getAccionClass = (cliente: Cliente) => {
    const isPagada = cliente.regla === 'PAGADO'
    if (isPagada) return 'text-sage'
    if (cliente.zona_critica) return 'text-amber-hot'
    if (cliente.regla === 'R5' || cliente.regla === 'R2') return 'text-amber'
    if (cliente.regla === 'R6') return 'text-sage'
    return 'text-ocean'
  }

  const getRowClass = (cliente: Cliente) => {
    const isPagada = cliente.regla === 'PAGADO'
    if (isPagada) return 'opacity-50'
    if (cliente.estado_gestion === 'gestionado_hoy') return 'bg-bg-active/30'
    return ''
  }

  return (
    <div className="mt-[18px] bg-bg-panel border border-line-soft rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-line-soft">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold">Cartera priorizada</span>
          <span className="font-mono text-xs text-ink-mute">
            · {formatNumber(totalCount)} de {formatNumber(totalCount)}
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          {/* Future: add sort/filter controls here */}
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft w-9">
              #
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Regla
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Cliente
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Mora
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Cuota
            </th>
            <th className="text-right text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Monto
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Accion sugerida
            </th>
            <th className="text-left text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold px-3.5 py-2 bg-bg-soft border-b border-line-soft">
              Ultima gestion
            </th>
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <div className="py-12 text-center">
                  <div className="text-3xl mb-2">✓</div>
                  <h3 className="font-semibold text-ink">
                    Sin pendientes en esta categoria
                  </h3>
                  <p className="text-sm text-ink-mute mt-1">
                    Pasa al siguiente filtro.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            clientes.map((c, idx) => {
              const isPagada = c.regla === 'PAGADO'
              const estado = c.estado_gestion ?? 'sin_gestion'
              const rowNum = baseRowNum + idx + 1

              return (
                <tr
                  key={`${c.rut}-${c.cuota_id}`}
                  onClick={() => onRowClick?.(c)}
                  className={`
                    border-b border-line-soft last:border-b-0
                    cursor-pointer hover:bg-bg-soft transition-colors
                    ${getRowClass(c)}
                  `}
                >
                  {/* Position */}
                  <td className="px-3.5 py-3 font-mono text-[11px] text-ink-faint w-9">
                    {String(rowNum).padStart(2, '0')}
                  </td>

                  {/* Regla */}
                  <td className="px-3.5 py-3">
                    <RuleChip regla={c.regla} />
                  </td>

                  {/* Cliente */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span title={ESTADO_TITLE[estado]} className="text-sm cursor-default">
                        {ESTADO_ICON[estado] ?? '⚪'}
                      </span>
                      <div>
                        <div className="font-medium text-ink">{c.nombre}</div>
                        <div className="font-mono text-[11px] text-ink-mute">
                          {c.rut}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Mora */}
                  <td className="px-3.5 py-3">
                    <span className={`font-mono ${getMoraClass(c.dias_mora, isPagada)}`}>
                      {isPagada ? '✓' : `${c.dias_mora}d`}
                    </span>
                  </td>

                  {/* Cuota */}
                  <td className="px-3.5 py-3 font-mono text-xs text-ink-mute">
                    {c.nro_cuota}
                    {c.nro_total_cuotas ? `/${c.nro_total_cuotas}` : ''}
                  </td>

                  {/* Monto */}
                  <td className="px-3.5 py-3 text-right font-mono font-semibold text-ink">
                    {formatCLP(c.monto)}
                  </td>

                  {/* Accion sugerida */}
                  <td className="px-3.5 py-3">
                    <span
                      className={`
                        inline-flex items-center gap-1.5
                        text-[11.5px] font-semibold uppercase tracking-wide
                        ${getAccionClass(c)}
                      `}
                    >
                      {c.accion_sugerida || '—'}
                      <span className="transition-transform group-hover:translate-x-[3px]">
                        →
                      </span>
                    </span>
                  </td>

                  {/* Ultima gestion */}
                  <td className="px-3.5 py-3 text-xs text-ink-mute">
                    {c.ultima_gestion_fecha ? (
                      <div>
                        <span className="font-mono text-[11px]">
                          {formatDate(c.ultima_gestion_fecha)}
                        </span>
                        {c.ultimo_efecto && (
                          <span className="ml-2">· {c.ultimo_efecto}</span>
                        )}
                        {c.ultima_gestion_nota && (
                          <div className="mt-0.5 truncate max-w-[200px]">
                            {c.ultima_gestion_nota.slice(0, 60)}
                            {c.ultima_gestion_nota.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-faint">Sin gestion</span>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}

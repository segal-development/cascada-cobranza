import type { Regla, Cliente } from '@/types'
import { formatNumber } from '@/lib/format'

type FilterId = 'CRITICO' | 'R5' | 'R1' | 'R2' | 'R3' | 'R4' | 'R7' | 'R6' | 'SAYORANA'

interface FilterDef {
  id: FilterId
  label: string
  color: string
  critical?: boolean
}

interface FilterPillsProps {
  clientes: Cliente[]
  active: Regla | 'CRITICO' | null
  onChange: (regla: Regla | 'CRITICO' | null) => void
}

export function FilterPills({ clientes, active, onChange }: FilterPillsProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Count clients per filter
  const counts: Record<FilterId, number> = {
    CRITICO: clientes.filter((c) => {
      const isSinGestion =
        c.estado_gestion === 'sin_gestion' &&
        c.dias_mora >= 0 &&
        !['SAYORANA', 'PAGADO', 'R6'].includes(c.regla)
      const isCompromisoDue =
        c.estado_gestion === 'compromiso_vigente' &&
        c.fec_proxima &&
        c.fec_proxima <= today
      return isSinGestion || isCompromisoDue
    }).length,
    R5: clientes.filter((c) => c.regla === 'R5').length,
    R1: clientes.filter((c) => c.regla === 'R1').length,
    R2: clientes.filter((c) => c.regla === 'R2').length,
    R3: clientes.filter((c) => c.estado_gestion === 'compromiso_vigente').length,
    R4: clientes.filter((c) => c.ultimo_efecto === 'agenda_llamado').length,
    R7: clientes.filter((c) => c.regla === 'R7').length,
    R6: clientes.filter((c) => c.regla === 'R6').length,
    SAYORANA: clientes.filter((c) => c.regla === 'SAYORANA').length,
  }

  const allFilters: FilterDef[] = [
    { id: 'CRITICO', label: 'Urgentes', color: '#d84a1a', critical: true },
    { id: 'R5', label: 'R5 Al Limite', color: '#d84a1a' },
    { id: 'R1', label: 'R1 Primer Contacto', color: '#6a8a68' },
    { id: 'R2', label: 'R2 Mora Activa', color: '#c88a1a' },
    { id: 'R3', label: 'R3 Compromisos', color: '#3a6a80' },
    { id: 'R4', label: 'R4 Agendados', color: '#7a4a6a' },
    { id: 'R7', label: 'R7 Recuperacion', color: '#a44535' },
    { id: 'R6', label: 'R6 Fidelizados', color: '#3a6a5a' },
    { id: 'SAYORANA', label: 'Sayorana', color: '#5a5040' },
  ]

  const filters = allFilters.filter((f) => counts[f.id] > 0)

  const handleClick = (id: FilterId) => {
    if (active === id) {
      onChange(null)
    } else {
      // FilterId is compatible with Regla | 'CRITICO'
      onChange(id as Regla | 'CRITICO')
    }
  }

  return (
    <div className="flex gap-2 flex-wrap mt-7 items-center">
      <span className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold mr-1.5">
        Vista
      </span>
      {filters.map((f) => {
        const isActive = active === f.id
        const count = counts[f.id]

        return (
          <button
            key={f.id}
            onClick={() => handleClick(f.id)}
            className={`
              inline-flex items-center gap-[7px]
              px-3 py-1.5
              rounded-full
              border
              text-[12.5px]
              transition-all duration-150
              whitespace-nowrap
              ${
                isActive
                  ? f.critical
                    ? 'bg-amber-hot border-amber-hot text-white'
                    : 'bg-ink border-ink text-bg'
                  : 'bg-bg-panel border-line text-ink-soft hover:bg-bg-soft'
              }
            `}
          >
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: isActive ? 'currentColor' : f.color }}
            />
            {f.label}
            <span
              className={`
                font-mono text-[11px]
                px-1.5 py-[1px]
                rounded
                ${
                  isActive
                    ? 'bg-white/10 text-current'
                    : 'bg-bg-soft text-ink-mute'
                }
              `}
            >
              {formatNumber(count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

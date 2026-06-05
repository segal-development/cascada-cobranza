import type { Regla } from '@/types'
import { RULES } from '@/lib/rules'

interface RuleChipProps {
  regla: Regla
  className?: string
}

export function RuleChip({ regla, className = '' }: RuleChipProps) {
  const config = RULES[regla]
  const label = config?.label ?? regla

  // CSS classes based on rule
  const ruleClasses: Record<string, string> = {
    R1: 'text-rule-r1 bg-rule-r1/10 border-rule-r1/30',
    R2: 'text-rule-r2 bg-rule-r2/10 border-rule-r2/30',
    R3: 'text-rule-r3 bg-rule-r3/10 border-rule-r3/30',
    R4: 'text-rule-r4 bg-rule-r4/10 border-rule-r4/30',
    R5: 'text-white bg-rule-r5 border-rule-r5',
    R6: 'text-rule-r6 bg-rule-r6/10 border-rule-r6/30',
    R7: 'text-rule-r7 bg-rule-r7/10 border-rule-r7/30',
    SAYORANA: 'text-rule-sayorana bg-rule-sayorana/10 border-rule-sayorana/30',
    PRE_DESISTIDO: 'text-rule-sayorana bg-rule-sayorana/10 border-rule-sayorana/30',
    PAGADO: 'text-sage bg-sage/10 border-sage/30',
  }

  return (
    <span
      className={`
        inline-flex items-center
        font-mono font-semibold text-[10.5px]
        px-[7px] py-[2px]
        rounded-[5px] border
        tracking-[0.04em]
        ${ruleClasses[regla] ?? 'text-ink-mute bg-bg-soft border-line'}
        ${className}
      `}
    >
      {label}
    </span>
  )
}

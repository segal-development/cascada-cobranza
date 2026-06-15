import { formatNumber } from '@/lib/format'

interface KPIProgress {
  value: number
  max: number
  tone?: 'sage' | 'ocean' | 'amber' | 'rust'
}

interface KPIProps {
  label: string
  value: number | string
  unit?: string
  valueClass?: 'amber-hot' | 'ocean' | 'amber' | 'sage' | 'rust'
  detail?: string
  progress?: KPIProgress
  trend?: string
  footer?: string
  sparkline?: string
  onClick?: () => void
}

export function KPI({
  label,
  value,
  unit,
  valueClass,
  detail,
  progress,
  trend,
  footer,
  sparkline,
  onClick,
}: KPIProps) {
  const progressPct = progress
    ? Math.min(100, Math.round((progress.value / progress.max) * 100))
    : 0

  const progressToneClasses: Record<string, string> = {
    sage: 'bg-sage',
    ocean: 'bg-ocean',
    amber: 'bg-amber',
    rust: 'bg-rust',
  }

  const valueColorClasses: Record<string, string> = {
    'amber-hot': 'text-amber-hot',
    ocean: 'text-ocean',
    amber: 'text-amber',
    sage: 'text-sage',
    rust: 'text-rust',
  }

  return (
    <div
      className={`bg-bg-panel border border-line-soft rounded-xl p-5 relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:bg-bg-soft transition-colors' : ''
      }`}
      onClick={onClick}
    >
      {/* Top row: label + trend */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold">
          {label}
          {onClick && (
            <span className="text-[10px] opacity-50 ml-1">↗</span>
          )}
        </div>
        {trend && (
          <div className="font-mono text-[11px] text-ink-faint">{trend}</div>
        )}
      </div>

      {/* Value */}
      <div
        className={`text-4xl font-bold tracking-tight leading-none ${
          valueClass ? valueColorClasses[valueClass] : ''
        }`}
      >
        {typeof value === 'number' ? formatNumber(value) : value}
        {unit && (
          <span className="text-sm font-medium text-ink-mute ml-1.5 font-mono tracking-normal">
            {unit}
          </span>
        )}
      </div>

      {/* Detail */}
      {detail && (
        <div className="text-xs text-ink-mute mt-2">{detail}</div>
      )}

      {/* Progress bar */}
      {progress && (
        <>
          <div className="h-[5px] bg-bg-soft rounded-full mt-3.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-400 ${
                progress.tone ? progressToneClasses[progress.tone] : 'bg-sage'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] mt-1.5 text-ink-mute">
            <span>
              {formatNumber(progress.value)} / {formatNumber(progress.max)}
            </span>
            <span>{progressPct}%</span>
          </div>
        </>
      )}

      {/* Footer */}
      {footer && (
        <div
          className="text-xs text-ink-mute mt-3 pt-2.5"
          style={{ borderTop: '1px dashed var(--color-line-soft)' }}
        >
          {footer}
        </div>
      )}

      {/* Sparkline */}
      {sparkline && (
        <svg
          className="absolute right-3 bottom-3 opacity-45 pointer-events-none"
          width="80"
          height="28"
          viewBox="0 0 80 28"
        >
          <path
            d={sparkline}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-ink-faint"
          />
        </svg>
      )}
    </div>
  )
}

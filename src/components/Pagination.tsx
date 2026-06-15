import { formatNumber } from '@/lib/format'

// Simple chevron icons as SVG
function ChevronLeft({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, totalCount)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 0; i < totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(0)

      if (page > 2) {
        pages.push('ellipsis')
      }

      // Show pages around current
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
        pages.push(i)
      }

      if (page < totalPages - 3) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages - 1)
    }

    return pages
  }

  return (
    <div className="px-[18px] py-3 flex justify-between items-center text-xs text-ink-mute bg-bg-soft border-t border-line-soft">
      <span>
        Mostrando {formatNumber(start)}-{formatNumber(end)} de{' '}
        {formatNumber(totalCount)} clientes
      </span>

      <div className="flex gap-1 items-center">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="w-[26px] h-[26px] rounded-[5px] text-xs font-mono text-ink-soft flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-panel"
        >
          <ChevronLeft size={12} />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-ink-faint">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`
                w-[26px] h-[26px] rounded-[5px]
                text-xs font-mono
                flex items-center justify-center
                ${
                  p === page
                    ? 'bg-bg-panel border border-line text-ink font-medium'
                    : 'text-ink-soft hover:bg-bg-panel'
                }
              `}
            >
              {p + 1}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="w-[26px] h-[26px] rounded-[5px] text-xs font-mono text-ink-soft flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-panel"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

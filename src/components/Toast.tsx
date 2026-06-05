import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '@/stores/uiStore'

const TOAST_DURATION = 3000

/**
 * Toast notification component
 * Auto-dismisses after 3 seconds
 * Supports success/error/info variants
 */
export function Toast() {
  const { toast, clearToast } = useUIStore()

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      clearToast()
    }, TOAST_DURATION)

    return () => clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  const bgColors = {
    success: 'bg-sage',
    error: 'bg-rust',
    info: 'bg-ink',
  }

  return createPortal(
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
        ${bgColors[toast.type]} text-white
        px-4 py-2.5 rounded-full text-[13px]
        flex items-center gap-2.5
        shadow-modal animate-toast-in
      `}
      role="alert"
      aria-live="polite"
    >
      {toast.type === 'success' && (
        <span className="w-2 h-2 rounded-full bg-white/60" />
      )}
      {toast.type === 'error' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>{toast.message}</span>
    </div>,
    document.body,
  )
}

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * Base modal component - renders to document.body via portal
 * Features:
 * - Backdrop click closes
 * - Esc key closes
 * - Focus trap within modal
 * - Scroll lock on body when open
 */
export function Modal({ isOpen, onClose, children, className = '' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management and scroll lock
  useEffect(() => {
    if (!isOpen) return

    // Store current focus
    previousActiveElement.current = document.activeElement

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus first focusable element in modal
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusableElements && focusableElements.length > 0) {
      ;(focusableElements[0] as HTMLElement).focus()
    }

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow

      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/32 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className={`
          relative bg-bg-panel border border-line-soft rounded-[14px]
          shadow-modal max-h-[88vh] overflow-hidden
          animate-modal-in
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface ModalHeaderProps {
  children: ReactNode
  onClose: () => void
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
  return (
    <div className="px-7 py-5 border-b border-line-soft flex justify-between items-start gap-4 bg-bg-panel">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={onClose}
        className="
          w-[30px] h-[30px] grid place-items-center rounded-lg
          text-ink-mute border border-line-soft bg-bg-panel
          hover:bg-bg-soft hover:text-ink transition-colors
        "
        aria-label="Cerrar"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return <div className={`overflow-y-auto ${className}`}>{children}</div>
}

interface ModalFooterProps {
  children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="px-7 py-3.5 border-t border-line-soft flex justify-between items-center bg-bg-panel">
      {children}
    </div>
  )
}

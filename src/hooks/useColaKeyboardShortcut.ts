import { useEffect } from 'react'
import { useColaStore } from '@/stores/colaStore'
import { useUIStore } from '@/stores/uiStore'

/**
 * Registers a global keyboard shortcut: pressing N when cola mode is active
 * and no modal is open calls enterColaMode to fetch and display the next client.
 *
 * Per FR-006: "The keyboard shortcut N MUST trigger 'Siguiente cliente' when
 * cola mode is active and no modal is currently open."
 */
export function useColaKeyboardShortcut() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if the user is typing in a form control
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === 'N' || e.key === 'n') {
        const { colaModeActive, enterColaMode, isLoading } = useColaStore.getState()
        const { activeModal } = useUIStore.getState()

        // Guard isLoading: a siguienteCliente() RPC may already be in flight
        // (modal not open yet). Without this, rapid N presses consume multiple
        // queue slots concurrently.
        if (colaModeActive && !isLoading && activeModal === null) {
          e.preventDefault()
          void enterColaMode()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

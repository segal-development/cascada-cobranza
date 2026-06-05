import { create } from 'zustand'
import type { Cliente } from '@/types'

type ModalType = 'cliente' | 'carga' | null

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

interface UIState {
  activeModal: ModalType
  clienteActual: Cliente | null
  toast: Toast | null
  isLoading: boolean
  loadingMessage: string

  // Actions
  openModal: (modal: ModalType, cliente?: Cliente) => void
  closeModal: () => void
  showToast: (message: string, type?: Toast['type']) => void
  clearToast: () => void
  showLoading: (message?: string) => void
  hideLoading: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  clienteActual: null,
  toast: null,
  isLoading: false,
  loadingMessage: 'Procesando...',

  openModal: (modal, cliente = undefined) =>
    set({
      activeModal: modal,
      clienteActual: cliente ?? null,
    }),

  closeModal: () =>
    set({
      activeModal: null,
      clienteActual: null,
    }),

  showToast: (message, type = 'success') =>
    set({
      toast: { message, type },
    }),

  clearToast: () => set({ toast: null }),

  showLoading: (message = 'Procesando...') =>
    set({
      isLoading: true,
      loadingMessage: message,
    }),

  hideLoading: () =>
    set({
      isLoading: false,
      loadingMessage: 'Procesando...',
    }),
}))

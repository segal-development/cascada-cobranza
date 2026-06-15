import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { LoginScreen } from '@/components/LoginScreen'
import { Layout } from '@/components/Layout'
import { DashboardCobradora } from '@/pages/DashboardCobradora'
import { DashboardJefatura } from '@/pages/DashboardJefatura'
import { ClienteModal } from '@/components/ClienteModal'
import { CargaModal } from '@/components/CargaModal'
import { Toast } from '@/components/Toast'
import { useColaKeyboardShortcut } from '@/hooks/useColaKeyboardShortcut'

function Dashboard() {
  const { perfil } = useAuthStore()
  
  if (perfil?.rol === 'jefatura') {
    return <DashboardJefatura />
  }
  
  return <DashboardCobradora />
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber border-t-transparent rounded-full animate-spin" />
          <span className="text-ink-soft">Cargando...</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, [initialize])

  // Global keyboard shortcut: N key advances cola queue when modal is closed
  useColaKeyboardShortcut()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <>
      <Layout>
        <Dashboard />
      </Layout>
      {/* Modals - rendered via portal to document.body */}
      <ClienteModal />
      <CargaModal />
      <Toast />
    </>
  )
}

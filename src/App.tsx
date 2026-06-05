import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { LoginScreen } from '@/components/LoginScreen'
import { Layout } from '@/components/Layout'

function DashboardPlaceholder() {
  const { perfil } = useAuthStore()
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">
          Buenos días, <span className="text-amber">{perfil?.nombre?.split(' ')[0] || 'Usuario'}</span>
        </h1>
        <p className="text-ink-mute text-sm mt-1.5">
          Tu cartera está lista. Tienes clientes priorizados para hoy.
        </p>
        <div className="flex items-center gap-2.5 mt-2.5">
          <span className="relative w-[7px] h-[7px] rounded-full bg-sage">
            <span className="absolute inset-[-4px] rounded-full border border-sage opacity-40 animate-pulse" />
          </span>
          <span className="font-mono text-xs text-ink-mute">
            Cascada activa · última sync hace 2 min
          </span>
        </div>
      </div>
      
      {/* KPI placeholder */}
      <div className={`grid gap-4 mt-5 ${perfil?.rol === 'jefatura' ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {[
          { label: 'Gestiones hoy', value: '12', detail: 'de 18 meta' },
          { label: 'Cartera activa', value: '48', detail: 'clientes asignados' },
          { label: 'Contactabilidad', value: '78%', detail: '+5% vs ayer' },
          ...(perfil?.rol === 'jefatura' ? [{ label: 'Equipo', value: '4', detail: 'cobradoras activas' }] : []),
        ].map((kpi, i) => (
          <div key={i} className="bg-bg-panel border border-line-soft rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold mb-2">
              {kpi.label}
            </div>
            <div className="text-4xl font-bold tracking-tight">{kpi.value}</div>
            <div className="text-xs text-ink-mute mt-2">{kpi.detail}</div>
          </div>
        ))}
      </div>

      {/* Table placeholder */}
      <div className="mt-6 bg-bg-panel border border-line-soft rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-soft">
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold">Cartera priorizada</span>
            <span className="font-mono text-xs text-ink-mute">· 48 clientes</span>
          </div>
        </div>
        <div className="p-8 text-center text-ink-mute">
          <p className="text-sm">Componentes de tabla y filtros en PR 3</p>
        </div>
      </div>
    </div>
  )
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

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <Layout>
      <DashboardPlaceholder />
    </Layout>
  )
}

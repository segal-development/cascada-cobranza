import { useAuthStore } from '@/stores/authStore'

export function TopBar() {
  const { perfil, logout } = useAuthStore()
  
  const displayName = perfil?.nombre || 'Usuario'
  const role = perfil?.rol || 'cobradora'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="h-14 bg-bg-panel border-b border-line-soft flex items-center px-7 gap-4">
      {/* Brand */}
      <div className="flex items-baseline gap-0 text-[15px] font-semibold tracking-tight text-ink">
        Cascada
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber mx-1 -translate-y-px" />
        Cobranza
      </div>

      {/* Breadcrumb */}
      <nav className="text-ink-mute text-xs flex items-center gap-2">
        <span className="text-ink-faint">/</span>
        <span>Cartera</span>
        <span className="text-ink-faint">/</span>
        <span className="text-ink-soft">
          {role === 'jefatura' ? 'Equipo completo' : 'Mi cartera'}
        </span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search mock */}
      <div className="flex items-center gap-2 bg-bg-soft border border-line-soft rounded-lg px-3 py-1.5 w-[280px] text-ink-mute text-[12.5px]">
        <svg className="w-[13px] h-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Buscar cliente o RUT…</span>
        <kbd className="ml-auto font-mono text-[10.5px] bg-bg-panel border border-line-soft px-1.5 py-px rounded text-ink-mute">
          ⌘K
        </kbd>
      </div>

      {/* Notifications */}
      <button className="w-8 h-8 grid place-items-center rounded-lg text-ink-mute hover:bg-bg-soft hover:text-ink transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {/* User chip */}
      <div className="flex items-center gap-2.5 py-1 pl-3 pr-1 border border-line-soft rounded-full bg-bg-panel">
        <span className="text-[13px] font-medium">{displayName}</span>
        <span className="text-[9.5px] font-semibold uppercase tracking-wider bg-bg-active text-amber py-0.5 px-[7px] rounded border border-[#f0e2c0]">
          {role === 'jefatura' ? 'Jefatura' : 'Cobradora'}
        </span>
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d8c89a] to-[#a8895a] text-ink grid place-items-center text-[11px] font-bold">
          {initials}
        </span>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        title="Salir"
        className="w-8 h-8 grid place-items-center rounded-lg text-ink-mute hover:bg-bg-soft hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>

      {/* Date display */}
      <div className="text-xs text-ink-mute capitalize hidden xl:block">
        {today}
      </div>
    </header>
  )
}

import { useState, type FormEvent } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  
  const { login, isLoading, error } = useAuthStore()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-bg">
      {/* Left visual side */}
      <div className="hidden lg:flex relative flex-col p-10 xl:p-14 overflow-hidden bg-bg-soft border-r border-line-soft">
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: 'linear-gradient(var(--color-line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--color-line-soft) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse at 40% 50%, black 25%, transparent 80%)',
          }}
        />
        
        {/* Gradient overlays */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 25% 15%, rgba(200,138,26,0.16), transparent 60%), radial-gradient(ellipse 70% 50% at 80% 90%, rgba(58,106,128,0.10), transparent 60%)',
          }}
        />

        <div className="relative z-10 flex-1 flex flex-col max-w-[540px]">
          {/* Brand + Status */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-ink text-amber grid place-items-center text-lg font-bold tracking-tight">
                C
              </span>
              <div>
                <div className="text-[15px] font-semibold tracking-tight flex items-baseline">
                  Cascada<span className="inline-block w-1.5 h-1.5 rounded-full bg-amber mx-1 -translate-y-px" />Cobranza
                </div>
                <div className="text-[11.5px] text-ink-mute mt-0.5">
                  Grupo Segal · Plataforma de gestión
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-bg-panel border border-line-soft py-1.5 px-3 rounded-full text-[11.5px] text-ink-soft font-medium whitespace-nowrap">
              <span className="relative w-[7px] h-[7px] rounded-full bg-sage">
                <span className="absolute inset-[-4px] rounded-full border border-sage opacity-50 animate-pulse" />
              </span>
              <span>Cascada operando</span>
              <span className="font-mono text-ink-mute text-[10.5px]">· {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="mt-14 text-[44px] font-semibold leading-[1.05] tracking-tight text-balance">
            La cascada decide<br />
            <em className="not-italic text-amber">a quién contactar</em> primero.
          </h1>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-soft max-w-[440px]">
            Cada mañana priorizamos los clientes con mora según 8 reglas vivas.
            Tu cartera lista en menos de 4 minutos.
          </p>

          {/* Preview card placeholder */}
          <div className="mt-9 bg-bg-panel border border-line-soft rounded-xl shadow-[0_12px_32px_-16px_rgba(26,24,20,0.14)] overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-line-soft bg-bg-soft">
              <span className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold">
                Cartera priorizada · hoy
              </span>
              <span className="font-mono text-[11px] text-ink-soft">
                286 clientes
              </span>
            </div>
            <div className="relative p-4 space-y-2">
              {[
                { rule: 'R1', name: 'González, María', mora: '0d', monto: '$125.000' },
                { rule: 'R5', name: 'Pérez, Juan', mora: '45d', monto: '$342.000' },
                { rule: 'R2', name: 'Silva, Ana', mora: '12d', monto: '$89.000' },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-[38px_1fr_auto_auto] gap-3.5 items-center text-[13px]">
                  <span className={`font-mono text-[10.5px] font-semibold py-0.5 px-[7px] rounded border ${
                    row.rule === 'R5' 
                      ? 'text-white bg-amber-hot border-amber-hot' 
                      : row.rule === 'R1'
                        ? 'text-rule-r1 bg-rule-r1/10 border-rule-r1/30'
                        : 'text-rule-r2 bg-rule-r2/10 border-rule-r2/30'
                  }`}>
                    {row.rule}
                  </span>
                  <span className="text-ink font-medium">{row.name}</span>
                  <span className="font-mono text-rust font-medium text-xs">{row.mora}</span>
                  <span className="font-mono font-semibold text-ink text-xs">{row.monto}</span>
                </div>
              ))}
              <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-bg-panel to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Footer stats */}
          <div className="mt-auto pt-6 grid grid-cols-4 gap-4 border-t border-line-soft">
            {[
              { label: 'Carteras vivas', value: '8' },
              { label: 'Clientes en gestión', value: '1.184' },
              { label: 'Recuperado abril', value: '$48,2M' },
              { label: 'SLA', value: '99,95%', color: 'text-sage' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="text-[9.5px] uppercase tracking-widest text-ink-mute font-semibold leading-tight min-h-[26px]">
                  {stat.label}
                </div>
                <div className={`font-mono text-xl font-semibold tracking-tight ${stat.color || ''}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form side */}
      <div className="flex flex-col px-8 py-7 lg:px-14">
        <div className="flex justify-between items-center mb-auto">
          <span className="font-mono text-[11px] text-ink-faint tracking-wider">v2.4.1 · prod</span>
          <a href="#" className="text-xs text-ink-soft border-b border-dotted border-line pb-px hover:text-amber hover:border-amber">
            ¿Necesitas ayuda?
          </a>
        </div>

        <div className="w-full max-w-[420px] my-auto">
          {/* Eyebrow */}
          <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-widest text-sage font-bold bg-sage/10 border border-sage/25 py-1 px-2.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
            Acceso autorizado
          </span>

          <h1 className="text-[32px] font-semibold tracking-tight mt-4 mb-2">
            Inicia sesión
          </h1>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            Ingresa con tu cuenta corporativa de Grupo Segal para abrir tu sala de operaciones.
          </p>

          <form className="mt-7" onSubmit={handleSubmit}>
            {/* Email field */}
            <div className="mb-3.5">
              <label className="block text-[11px] uppercase tracking-widest text-ink-mute font-semibold mb-1.5">
                Correo corporativo
              </label>
              <div className="flex items-center gap-2.5 bg-bg-panel border border-line rounded-lg px-3 focus-within:border-amber focus-within:ring-[3px] focus-within:ring-amber/15 transition-all">
                <svg className="w-3.5 h-3.5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre.apellido@segal.cl"
                  autoComplete="email"
                  className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="mb-3.5">
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold">
                  Contraseña
                </label>
                <a href="#" className="text-[11px] text-ink-soft border-b border-dotted border-line pb-px hover:text-amber hover:border-amber">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="flex items-center gap-2.5 bg-bg-panel border border-line rounded-lg px-3 focus-within:border-amber focus-within:ring-[3px] focus-within:ring-amber/15 transition-all">
                <svg className="w-3.5 h-3.5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] uppercase tracking-wider text-ink-mute font-semibold py-1 px-2 rounded hover:bg-bg-soft hover:text-ink-soft"
                  tabIndex={-1}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {/* Remember checkbox */}
            <label className="flex items-center gap-2.5 my-4 cursor-pointer text-[12.5px] text-ink-soft">
              <span 
                onClick={() => setRemember(!remember)}
                className={`w-4 h-4 rounded border-[1.5px] grid place-items-center transition-colors ${
                  remember ? 'bg-ink border-ink text-white' : 'bg-bg-panel border-line'
                }`}
              >
                {remember && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span>Mantener sesión iniciada en este dispositivo</span>
            </label>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rust/10 border border-rust/30 text-rust text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ink text-bg-panel rounded-lg py-3.5 px-4 text-sm font-semibold flex items-center justify-center gap-2.5 relative hover:bg-black hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar a la cascada'}
              <span className="absolute right-3 font-mono text-xs bg-white/10 text-line py-0.5 px-[7px] rounded border border-white/5">
                ↵
              </span>
            </button>

            {/* SSO divider */}
            <div className="relative mt-5">
              <span className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-bg px-2.5 text-[11px] uppercase tracking-widest text-ink-faint font-semibold">
                o
              </span>
            </div>

            {/* SSO button */}
            <button
              type="button"
              className="w-full mt-6 bg-bg-panel border border-line rounded-lg py-3 px-4 text-[13.5px] font-medium text-ink-soft flex items-center justify-center gap-2.5 hover:bg-bg-soft hover:border-ink-faint hover:text-ink transition-all"
            >
              <span className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-amber to-rust text-white grid place-items-center text-[11px] font-bold">
                G
              </span>
              Continuar con Google Workspace
            </button>
          </form>

          {/* Trust badges */}
          <div className="flex justify-between gap-3.5 flex-wrap mt-7 pt-4 border-t border-line-soft">
            {['SSO Segal', '2FA habilitado', 'Sesión cifrada'].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-ink-mute font-medium">
                <svg className="w-[11px] h-[11px] text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mt-auto pt-6 text-[11px] text-ink-faint">
          <span>© 2026 Grupo Segal · Cobranzas</span>
          <span className="font-mono">soporte@segal.cl</span>
        </div>
      </div>
    </div>
  )
}

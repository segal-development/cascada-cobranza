import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useColaStore } from '@/stores/colaStore'

// Placeholder cobradoras data until carteraStore is wired in Slice B (PR-05)
const PLACEHOLDER_COBRADORAS = [
  { id: '1', nombre: 'María González', clientes: 48 },
  { id: '2', nombre: 'Ana Silva', clientes: 52 },
  { id: '3', nombre: 'Carmen Pérez', clientes: 45 },
  { id: '4', nombre: 'Pool general', clientes: 141, isPool: true },
]

export function Sidebar() {
  const { perfil } = useAuthStore()
  const { openModal } = useUIStore()
  const { enterColaMode, isLoading } = useColaStore(
    useShallow((state) => ({ enterColaMode: state.enterColaMode, isLoading: state.isLoading }))
  )

  const isJefatura = perfil?.rol === 'jefatura'

  return (
    <aside className="bg-bg-panel border-r border-line-soft p-5 min-h-[calc(100vh-56px)] flex flex-col gap-5">
      {/* Siguiente cliente — visible to all authenticated users */}
      <div>
        <button
          aria-label="Siguiente cliente"
          onClick={() => void enterColaMode()}
          disabled={isLoading}
          className="w-full bg-ocean text-white rounded-lg py-2.5 px-3.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-ocean/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          {isLoading ? 'Cargando...' : 'Siguiente cliente'}
          <span className="ml-auto font-mono text-[10px] opacity-60">N</span>
        </button>
      </div>

      {/* Jefatura-only sections */}
      {isJefatura && (
        <>
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => openModal('carga')}
              className="w-full bg-amber text-ink rounded-lg py-2.5 px-3.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#b87a10] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Carga Mensual
              <span className="ml-auto font-mono text-[10px] opacity-60">⌘U</span>
            </button>

            <button className="w-full bg-bg-panel border border-line rounded-lg py-2.5 px-3.5 text-[13px] text-ink-soft flex items-center gap-2 hover:bg-bg-soft hover:text-ink transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Reporte
              <span className="ml-auto font-mono text-[10px] opacity-60">⌘R</span>
            </button>
          </div>

          {/* Filters section */}
          <section>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Vista
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">3 filtros</span>
            </div>
            <div className="flex flex-col">
              {[
                { key: 'todos', label: 'Equipo completo', count: 286, color: 'bg-ink' },
                { key: 'urgentes', label: 'Urgentes hoy', count: 24, color: 'bg-amber-hot' },
                { key: 'pendientes', label: 'Sin gestionar', count: 89, color: 'bg-ink-faint' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[12.5px] text-ink-soft hover:bg-bg-soft transition-colors ${
                    filter.key === 'todos' ? 'bg-bg-active text-ink font-medium' : ''
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filter.color}`} />
                  <span className="flex-1 text-left">{filter.label}</span>
                  <span className="font-mono text-[11.5px] text-ink-mute">{filter.count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Cobradoras section (PLACEHOLDER — will be replaced in Slice B / PR-05) */}
          <section className="flex-1">
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Cobradoras
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">{PLACEHOLDER_COBRADORAS.length}</span>
            </div>
            <div className="flex flex-col">
              {PLACEHOLDER_COBRADORAS.map((cobradora) => (
                <button
                  key={cobradora.id}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-bg-soft transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-bg-soft border border-line-soft grid place-items-center text-[10px] font-bold text-ink-soft">
                    {cobradora.isPool ? '∞' : cobradora.nombre.split(' ').map(n => n[0]).join('')}
                  </span>
                  <span className="flex-1 text-left text-[12.5px]">{cobradora.nombre}</span>
                  <span className="font-mono text-[11px] text-ink-mute">{cobradora.clientes}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Sync status */}
      <div className="pt-4 border-t border-line-soft">
        <div className="flex items-center gap-2 text-[11px] text-ink-mute">
          <span className="relative w-[6px] h-[6px] rounded-full bg-sage">
            <span className="absolute inset-[-3px] rounded-full border border-sage opacity-40 animate-pulse" />
          </span>
          <span>Sincronizado</span>
          <span className="font-mono text-ink-faint ml-auto">hace 2 min</span>
        </div>
      </div>
    </aside>
  )
}

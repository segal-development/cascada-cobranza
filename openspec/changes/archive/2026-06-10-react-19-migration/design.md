# Design: React 19 Migration with Tailwind 4 Design System

## Technical Approach

Strangler Fig migration mounting React 19 inside the existing `index.html`, progressively replacing vanilla JS components. Zustand for state, Tailwind 4 for styling with tokens ported from design handoff. Each phase delivers working code that coexists with legacy until final cleanup.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| State management | Zustand 5 | Redux, Jotai, Context | Minimal boilerplate, no providers, TypeScript-native |
| Styling | Tailwind 4 + CSS vars | CSS modules, styled-components | Direct token mapping from handoff, utility-first scales |
| Build tool | Vite | Webpack, Parcel | Fast HMR, native ESM, React 19 support |
| Supabase client | Singleton in `lib/supabase.ts` | Per-component imports | Mirror existing pattern, avoid multiple instances |
| Form state | Controlled components | React Hook Form | Simple forms, no validation library needed |
| Data fetching | Stores + hooks | React Query, SWR | Match existing imperative patterns, gradual migration |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ authStore   │   │ carteraStore │   │    uiStore       │ │
│  │ user,perfil │   │ clientes,    │   │ modal,toast,     │ │
│  │ login/out   │   │ filtros,page │   │ loading          │ │
│  └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘ │
└─────────┼─────────────────┼────────────────────┼───────────┘
          │                 │                    │
          ▼                 ▼                    ▼
   ┌──────────────────────────────────────────────────┐
   │              Supabase Client                      │
   │  auth.signIn/Out │ rpc() │ from().select()        │
   └──────────────────────────────────────────────────┘
```

**Component tree**:
```
App
├── LoginScreen (unauthenticated)
└── Layout (authenticated)
    ├── TopBar
    ├── Sidebar (jefatura only)
    └── Main
        ├── Greeting + KPIGrid
        ├── FilterPills
        ├── ClienteTable
        └── Modals (portal)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `vite.config.ts` | Create | Vite config with React plugin |
| `tsconfig.json` | Create | TypeScript strict mode |
| `tailwind.config.ts` | Create | Design tokens from handoff |
| `package.json` | Create | Dependencies + scripts |
| `.env.local` | Create | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `src/main.tsx` | Create | React 19 entry point |
| `src/App.tsx` | Create | Root with auth routing |
| `src/lib/supabase.ts` | Create | Supabase client singleton |
| `src/lib/format.ts` | Create | `formatCLP`, `formatDate`, `formatRUT` |
| `src/lib/rules.ts` | Create | RULES config, WSP_TEMPLATES |
| `src/types/index.ts` | Create | Cliente, Perfil, Gestion, etc. |
| `src/stores/*.ts` | Create | authStore, carteraStore, uiStore, colaStore |
| `src/components/**/*.tsx` | Create | All UI components per structure |
| `index.html` | Modify | Add Vite entry, strip inline CSS in cleanup |
| `app.js` | Delete | Removed in final cleanup phase |

## Interfaces / Contracts

```typescript
// src/types/index.ts
type Rol = 'cobradora' | 'jefatura'
type Regla = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'SAYORANA'|'PRE_DESISTIDO'|'PAGADO'
type EstadoGestion = 'sin_gestion'|'gestionado_hoy'|'wsp_respondido'|'verificacion_pendiente'|'compromiso_vigente'

interface Perfil {
  id: string
  nombre: string
  rol: Rol
  meta_diaria: number
  es_pool: boolean
}

interface Cliente {
  rut: string
  cuota_id: string
  nombre: string
  regla: Regla
  dias_mora: number
  monto_cuota: number
  cuota_actual: string
  zona_critica: boolean
  estado_gestion: EstadoGestion
  cobradora_id: string
}

// src/stores/authStore.ts
interface AuthState {
  user: User | null
  perfil: Perfil | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// src/stores/carteraStore.ts
interface CarteraState {
  clientes: Cliente[]
  filtros: { regla: string | null; search: string }
  sortMora: 'asc' | 'desc' | null
  page: number
  loadClientes: () => Promise<void>
  getFiltered: () => Cliente[]
}

// src/stores/uiStore.ts
interface UIState {
  activeModal: 'cliente' | 'carga' | null
  clienteActual: Cliente | null
  toast: { message: string; type: 'success' | 'error' } | null
  openModal: (modal: string, data?: Cliente) => void
  closeModal: () => void
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Stores (auth, cartera, ui), format utils, rules config | Vitest with mocked Supabase |
| Integration | Hooks with store interactions, component data flow | Testing Library + Vitest |
| E2E | Login flow, gestión submission, carga upload | Playwright (Phase 6) |

## Migration / Rollout

**Strangler Fig phases** — each PR adds React code while legacy `app.js` stays functional:

1. Foundation PR: Vite scaffold, types, stores shell (no UI yet)
2. Shell PR: Layout, TopBar, LoginScreen mount alongside legacy
3. Data PR: Stores wired to Supabase, hooks for data
4. Core views PR: KPIs, FilterPills, ClienteTable
5. Modals PR: ClienteModal, CargaModal
6. Cleanup PR: Remove `app.js`, strip inline CSS, final polish

Rollback at any phase: revert PR, legacy continues working.

## Open Questions

- [ ] None — design handoff provides complete token reference

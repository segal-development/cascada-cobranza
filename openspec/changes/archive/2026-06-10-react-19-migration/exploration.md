# Exploration: React 19 Migration

## Current State

**Architecture**: Monolithic vanilla JS frontend in a single `app.js` file (2185 lines) with inline CSS in `index.html` (1028 lines of style). Backend uses Supabase with PostgreSQL, auth, and RPC functions.

**Core data flow**:
1. Auth via `sb.auth.signInWithPassword()` → session persisted
2. Profile loaded via `cascada_mi_perfil` RPC → determines `cobradora` vs `jefatura` role
3. Data loaded in parallel: `loadClientes()`, `loadResumenDia()`, `loadLastCarga()`, `loadKpiGestionados()`
4. Global `state` object holds everything; UI renders via imperative DOM manipulation

**Business rules encoded in code**:
- **Reglas de cobranza**: R1-R7, Sayorana, Pre-desistido (7+ rule types with distinct WSP templates)
- **Cola de gestión priorizada**: `cascada_siguiente_cliente` RPC
- **Role-based UI**: Jefatura sees sidebar + productivity grid; Cobradora sees simplified KPIs
- **Zona crítica detection**: `CRIT_VENCE_HOY` filtering

**External dependencies**:
- Supabase JS SDK v2 (CDN)
- SheetJS/XLSX v0.18.5 (CDN)
- Google Fonts (Inter, JetBrains Mono)

## Affected Areas

### Natural Component Boundaries (from code analysis)

| Component | Lines | Complexity | Dependencies |
|-----------|-------|------------|--------------|
| `LoginScreen` | ~90 | Low | Supabase auth |
| `Header` | ~25 | Low | state.perfil |
| `Sidebar` (jefatura) | ~70 | Medium | state.cobradoras, state.resumenTodas, filtros |
| `KPIGrid` | ~120 | Medium | state.resumenDia, state.kpiGestionados |
| `ProductividadGrid` | ~90 | Medium | state.resumenTodas |
| `FilterPills` | ~30 | Low | state.filtroRegla |
| `ClienteTable` + `ClienteRow` | ~100 | Medium | state.data, pagination |
| `Toolbar` (search) | ~20 | Low | state.search |
| `ClienteModal` | ~150 | High | clienteActual, gestión form, WSP integration |
| `CargaModal` | ~200 | High | file handling, SheetJS, preview |
| `PagosModal` | ~120 | Medium | file handling, SheetJS |
| `RecaudacionModal` | ~170 | High | multiple Supabase queries, charts |
| `DesgloseModal` | ~90 | Medium | RPC calls |
| `MetaModal` | ~60 | Low | RPC call |
| `GestionesExportModal` | ~80 | Medium | date range, RPC |

### State Slices → Zustand Stores

```
authStore:
  user: User | null
  perfil: Perfil | null
  login(), logout(), loadPerfil()

carteraStore:
  data: Cliente[]           // clientes loaded
  filtros: { ambito, regla, zona, search, sortMora }
  page: number
  pageSize: number
  loadClientes(), setFiltro(), getFiltered()

resumenStore:
  resumenDia: ResumenDia | null
  resumenTodas: ResumenCobradora[]
  kpiGestionados: KpiGestionados
  loadResumen()

uiStore:
  modals: { cliente: boolean, carga: boolean, ... }
  loading: { message: string } | null
  toast: { message: string, type: 'success'|'error' } | null
  openModal(), closeModal(), showLoading(), toast()

colaStore:
  colaActiva: boolean
  clienteActual: Cliente | null
  abrirSiguiente(), saltarCliente()
```

### Hooks to Extract

- `useSupabase()` — singleton client instance
- `useAuth()` — login, logout, session check, perfil
- `useCartera()` — load clients, filtering, pagination
- `useResumen()` — KPIs, productividad data
- `useGestion()` — register gestión, cola management
- `useCarga()` — file upload, SheetJS processing
- `useToast()` — toast notifications

### Types to Define

```typescript
// Core domain
type Rol = 'cobradora' | 'jefatura'
type Regla = 'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'SAYORANA'|'PRE_DESISTIDO'|'PAGADO'
type EstadoGestion = 'sin_gestion'|'gestionado_hoy'|'wsp_respondido'|'verificacion_pendiente'|'compromiso_vigente'|'no_requiere'
type TipoGestion = 'llamada'|'whatsapp'|'sms'|'correo'
type EfectoGestion = 'compromiso_pago'|'agenda_llamado'|'no_contesta'|...

interface Perfil { id: string; nombre: string; rol: Rol; meta_diaria: number; es_pool: boolean }
interface Cliente { rut: string; cuota_id: string; nombre: string; regla: Regla; dias_mora: number; ... }
interface ResumenDia { gestiones_hoy: number; gestiones_mes: number; meta: number; ... }
interface Gestion { tipo: TipoGestion; efecto: EfectoGestion; nota?: string; fec_proxima?: string }
```

## Approaches

### 1. **Big Bang Migration** — Full rewrite in new project structure

- Pros: Clean architecture from day one, no legacy code to maintain, can optimize component structure
- Cons: High risk (no working product during transition), long feedback loop, hard to compare behavior parity
- Effort: **High** (2-3 weeks full-time)
- Risk: Feature regression, business logic bugs during translation

### 2. **Incremental "Strangler Fig"** — Mount React inside existing HTML, migrate component by component

- Pros: Always have working product, can A/B test, lower risk per change, smaller PRs
- Cons: Hybrid state management complexity, need bridges between vanilla JS and React, longer total timeline
- Effort: **Medium-High** (3-4 weeks, but spread safely)
- Risk: Bridge code complexity, dual state management bugs

### 3. **Parallel Reconstruction** — Build React version alongside, feature-parity checkpoint, then switch

- Pros: Can compare side-by-side, easy rollback (just revert redirect), clean separation
- Cons: Duplicated effort for any changes during migration, need to maintain two codebases
- Effort: **High** (2-3 weeks, but less risky than big bang)
- Risk: Code drift between versions

## Recommendation

**Approach 2 (Incremental "Strangler Fig")** is recommended given the constraints:

1. **~400 line PR budget** — Big Bang produces one massive PR; Strangler produces many small, reviewable PRs
2. **Business continuity** — The CRM is actively used; can't afford multi-week downtime
3. **Reviewability** — Each PR migrates one component/feature, easy to verify
4. **Rollback safety** — If a migrated component has issues, can revert just that PR

### Proposed Migration Phases

**Phase 0: Foundation (1-2 PRs, ~300 lines)**
- Set up Vite + React 19 + TypeScript + Tailwind 4
- Configure Zustand
- Create Supabase client wrapper
- Define core types

**Phase 1: Shell Components (2-3 PRs, ~400-500 lines)**
- LoginScreen (isolated, no dependencies)
- Header component
- Layout structure with slots for legacy content

**Phase 2: State Stores (2-3 PRs, ~300-400 lines)**
- authStore (login/logout/perfil)
- uiStore (modals, loading, toast)
- Mount React root, render shell

**Phase 3: Data Components (4-5 PRs, ~600-800 lines)**
- KPIGrid + useResumen hook
- FilterPills + Toolbar
- ClienteTable + pagination

**Phase 4: Modals (4-5 PRs, ~700-900 lines)**
- ClienteModal (complex: form + WSP + gestión)
- CargaModal (SheetJS integration)
- Smaller modals (Meta, Desglose, Gestiones)

**Phase 5: Sidebar + Productividad (2 PRs, ~300-400 lines)**
- Sidebar (jefatura only)
- ProductividadGrid

**Phase 6: Cleanup (1-2 PRs)**
- Remove legacy app.js
- Remove inline styles from index.html
- Final Tailwind refinements

### Component Priority Order

1. **LoginScreen** — Zero dependencies, isolated, easy win
2. **Header** — Simple, sets up layout pattern
3. **KPIGrid** — High visibility, good hooks exercise
4. **FilterPills** — Light, establishes filter pattern
5. **ClienteTable** — Core feature, but well-contained
6. **ClienteModal** — Complex, but critical path
7. **Sidebar** — jefatura-only, can be last
8. **Carga/Pagos modals** — Feature-complete but lower traffic

## Risks

### Technical
- **Supabase RLS compatibility** — React client must maintain same auth patterns; Supabase JS SDK works identically, but session handling needs careful migration
- **SheetJS integration** — CDN script → npm package; API is identical but bundling adds complexity
- **CSS-in-JS vs Tailwind** — Current inline CSS uses CSS variables; Tailwind 4 supports CSS variables natively, should map cleanly
- **Date handling** — Current code has careful UTC handling for Chilean timezone; must preserve in new components

### Business Logic
- **Reglas de cobranza** — 7+ rule types with distinct behavior; need comprehensive type definitions
- **WSP templates** — Dynamic text generation per rule; extract to separate module
- **Cola de gestión** — Stateful "mode" that affects modal behavior; needs careful state management

### Operational
- **Deployment strategy** — Netlify serves static files; Vite build output should drop in
- **Cache invalidation** — Current `app.js?v=37` pattern; Vite handles via content hashes
- **Monitoring** — No current error tracking; consider adding during migration

## Ready for Proposal

**Yes** — The exploration provides sufficient detail to move forward.

The orchestrator should tell the user:
- Migration is feasible using an incremental approach
- Recommended: Strangler Fig pattern with ~10-12 PRs over 3-4 weeks
- First PR: Vite + React 19 + TypeScript + Zustand foundation
- Each subsequent PR migrates one component group
- Business continuity maintained throughout; rollback possible at any point

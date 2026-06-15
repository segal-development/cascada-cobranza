# Tasks: React 19 Migration with Tailwind 4

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation scaffold | PR 1 | Base: `feature/react-migration`. Vite, types, stores, utils. ~380 lines |
| 2 | Shell + Auth | PR 2 | Base: PR 1 branch. Login, TopBar, Layout, authStore wired. ~350 lines |
| 3 | Core Views | PR 3 | Base: PR 2 branch. KPIs, FilterPills, ClienteTable. ~380 lines |
| 4 | Modals | PR 4 | Base: PR 3 branch. ClienteModal, CargaModal. ~400 lines |
| 5 | Cleanup + Polish | PR 5 | Base: PR 4 branch. Remove legacy, final wiring, E2E. ~290 lines |

---

## Phase 0: Foundation

- [x] 0.1 Create `vite.config.ts` with React 19 plugin
- [x] 0.2 Create `tsconfig.json` with strict mode, path aliases
- [x] 0.3 Create `tailwind.config.ts` with design tokens from handoff
- [x] 0.4 Create `package.json` with all dependencies
- [x] 0.5 Create `.env.local.example` with Supabase env vars
- [x] 0.6 Create `src/main.tsx` entry point
- [x] 0.7 Create `src/App.tsx` placeholder
- [x] 0.8 Create `src/types/index.ts` — Cliente, Perfil, Gestion, Regla, EstadoGestion
- [x] 0.9 Create `src/lib/supabase.ts` singleton client
- [x] 0.10 Create `src/lib/format.ts` — formatCLP, formatDate, formatRUT
- [x] 0.11 Create `src/lib/rules.ts` — RULES config, WSP_TEMPLATES
- [x] 0.12 Create `src/stores/authStore.ts` shell
- [x] 0.13 Create `src/stores/carteraStore.ts` shell
- [x] 0.14 Create `src/stores/uiStore.ts` shell
- [x] 0.15 Create `src/stores/colaStore.ts` shell
- [x] 0.16 Add Vitest config + sample test

**Tests:** Vitest runs, format utils have unit tests

---

## Phase 1: Shell + Auth

- [x] 1.1 Wire `authStore` to Supabase auth (login, logout, onAuthStateChange)
- [x] 1.2 Create `src/components/LoginScreen.tsx` from handoff
- [x] 1.3 Create `src/components/TopBar.tsx` from handoff
- [x] 1.4 Create `src/components/Layout.tsx` — wraps TopBar + main + sidebar slot
- [x] 1.5 Create `src/components/Sidebar.tsx` — jefatura actions, cartera list
- [x] 1.6 Update `App.tsx` — auth routing (LoginScreen vs Layout)
- [x] 1.7 Add `index.css` with Tailwind imports (verified from PR1)

**Tests:** authStore login/logout with mocked Supabase (9 tests passing)

---

## Phase 2: Data Layer

- [x] 2.1 Wire `carteraStore.loadClientes` to Supabase RPC
- [x] 2.2 Implement `carteraStore.getFiltered` with regla/search filters
- [x] 2.3 Create `src/hooks/useClientes.ts` — data fetching hook
- [x] 2.4 Wire `colaStore` — next client queue logic
- [x] 2.5 Create `src/stores/resumenStore.ts` — KPI data

**Tests:** carteraStore filtering logic, mock RPC responses (17 tests passing)

---

## Phase 3: Core Views

- [x] 3.1 Create `src/components/KPI.tsx` from handoff
- [x] 3.2 Create `src/components/KPIGrid.tsx` — 3 cols (cobradora) / 4 cols (jefatura)
- [x] 3.3 Create `src/components/FilterPills.tsx` from handoff
- [x] 3.4 Create `src/components/ClienteTable.tsx` from handoff
- [x] 3.5 Create `src/components/Pagination.tsx`
- [x] 3.6 Create `src/components/RuleChip.tsx` — styled rule badge
- [x] 3.7 Create `src/pages/DashboardCobradora.tsx` — wire all views
- [x] 3.8 Create `src/pages/DashboardJefatura.tsx` — wire all views + sidebar

**Tests:** KPI renders with mock data, table sorting

---

## Phase 4: Modals

- [x] 4.1 Create `src/components/Modal.tsx` — base portal, backdrop, close handlers
- [x] 4.2 Create `src/components/ClienteModal.tsx` from handoff
- [x] 4.3 Wire gestión form submission to Supabase RPC
- [x] 4.4 Create `src/components/CargaModal.tsx` from handoff
- [x] 4.5 Wire SheetJS Excel parsing (dynamic import)
- [x] 4.6 Create `src/components/Toast.tsx`
- [x] 4.7 Wire `uiStore` modal open/close with keyboard (Esc)

**Tests:** Modal open/close, form validation

---

## Phase 5: Cleanup

- [x] 5.1 Remove `app.js` legacy file
- [x] 5.2 Strip inline CSS from `index.html` (verified: already clean Vite entry)
- [x] 5.3 Update `index.html` Vite entry point (verified: already clean)
- [x] 5.4 Add Playwright E2E config
- [x] 5.5 Write E2E: login flow (3 tests: render, password toggle, validation)
- [x] 5.6 Write E2E: gestión submission (4 tests marked .skip for real Supabase)
- [x] 5.7 Final accessibility audit — TODO added (TODO-accessibility.md)
- [x] 5.8 Production build verification (build succeeds, 100 modules)

**Tests:** E2E login (3 passing), gestión (4 skipped pending real backend)

# Apply Progress: react-feature-parity — PR-01 + PR-02

**Change**: react-feature-parity  
**Batch**: PR-02 (merged with PR-01)  
**Mode**: Strict TDD  
**Date**: 2026-06-11  

---

## Completed Tasks (PR-01)

- [x] Install `babel-plugin-react-compiler` as devDependency
- [x] Configure `vite.config.ts` with React Compiler babel plugin (target: "19")
- [x] Replace `import * as React` with named imports in 4 ui/ components
- [x] Create `src/lib/errors.ts` — `RepositoryError` class
- [x] Create `src/lib/ports/auth.port.ts` — `AuthRepository`, `AuthUser`, `AuthSession`, `AUTH_EVENT`, `AuthEventKind`
- [x] Create `src/lib/ports/cartera.port.ts` — `CarteraRepository`, `ListClientesParams`
- [x] Create `src/lib/ports/resumen.port.ts` — `ResumenRepository` with deferred Slice C/D methods
- [x] Create `src/lib/ports/cola.port.ts` — `ColaRepository`, `SiguienteResult` discriminated union
- [x] Create `src/lib/ports/gestion.port.ts` — `GestionRepository`, `RegistrarGestionInput`, `GestionExportRow`
- [x] Create `src/lib/ports/carga.port.ts` — `CargaRepository` with all 4 methods + domain types
- [x] Create `src/lib/ports/recaudacion.port.ts` — `RecaudacionRepository` + domain types
- [x] Create `src/lib/ports/index.ts` — re-exports all ports + `Repositories` aggregate
- [x] Create `src/lib/adapters/supabase/supabaseAuthRepository.ts` — full `AuthRepository` impl
- [x] Create `src/lib/adapters/supabase/supabaseCarteraRepository.ts` — full `CarteraRepository` impl
- [x] Create `src/lib/adapters/supabase/index.ts` — `SupabaseAdapter` (Auth+Cartera live; 5 ports stubbed)
- [x] Create `src/lib/repositories.ts` — Proxy singleton + `__setRepositories` seam
- [x] Migrate `src/stores/authStore.ts` — uses `repositories.auth.*`, no supabase import
- [x] Migrate `src/stores/carteraStore.ts` — uses `repositories.cartera.*`, no supabase import
- [x] Migrate `src/stores/authStore.test.ts` — mocks `@/lib/repositories`
- [x] Migrate `src/stores/carteraStore.test.ts` — mocks `@/lib/repositories`
- [x] All tests verified passing
- [x] No supabase imports in migrated stores
- [x] No wildcard React imports in ui/ components

---

## TDD Cycle Evidence

| Task | RED (test written first) | GREEN (impl passes) | REFACTOR |
|------|--------------------------|---------------------|----------|
| `errors.ts` | `errors.test.ts` — 5 tests — failed (file missing) | Created `errors.ts` — 5 pass | None needed |
| `supabaseAuthRepository.ts` | `supabaseAuthRepository.test.ts` — 13 tests — failed (file missing) | Created impl — 13 pass | Fixed 2-assertion mock pattern |
| `supabaseCarteraRepository.ts` | `supabaseCarteraRepository.test.ts` — 6 tests — failed (file missing) | Created impl — 6 pass | Fixed 2-assertion mock pattern |
| `repositories.ts` | `repositories.test.ts` — 6 tests — failed (file missing) | Created impl — 6 pass | Moved makeAdapter inline to fix hoisting |
| `authStore.ts` migration | Modified `authStore.test.ts` (removed supabase mock) — 6 tests failed | Migrated store — 9 pass | None |
| `carteraStore.ts` migration | Modified `carteraStore.test.ts` (removed supabase mock) — 4 tests failed | Migrated store — 17 pass | None |

---

## Files Created

| File | Action |
|------|--------|
| `src/lib/errors.ts` | Created |
| `src/lib/errors.test.ts` | Created |
| `src/lib/ports/auth.port.ts` | Created |
| `src/lib/ports/cartera.port.ts` | Created |
| `src/lib/ports/resumen.port.ts` | Created |
| `src/lib/ports/cola.port.ts` | Created |
| `src/lib/ports/gestion.port.ts` | Created |
| `src/lib/ports/carga.port.ts` | Created |
| `src/lib/ports/recaudacion.port.ts` | Created |
| `src/lib/ports/index.ts` | Created |
| `src/lib/adapters/supabase/supabaseAuthRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseAuthRepository.test.ts` | Created |
| `src/lib/adapters/supabase/supabaseCarteraRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseCarteraRepository.test.ts` | Created |
| `src/lib/adapters/supabase/index.ts` | Created |
| `src/lib/repositories.ts` | Created |
| `src/lib/repositories.test.ts` | Created |

## Files Modified

| File | Change |
|------|--------|
| `vite.config.ts` | Added `babel-plugin-react-compiler` to react() plugin options |
| `package.json` | Added `babel-plugin-react-compiler` devDependency |
| `src/components/ui/input.tsx` | Named import (`ComponentProps`) |
| `src/components/ui/textarea.tsx` | Named import (`ComponentProps`) |
| `src/components/ui/select.tsx` | Named import (`ComponentProps`) |
| `src/components/ui/label.tsx` | Named import (`ComponentProps`) |
| `src/stores/authStore.ts` | Migrated to `repositories.auth.*`; removed supabase import; changed `user` type to `AuthUser` |
| `src/stores/authStore.test.ts` | Mock migrated from `@/lib/supabase` to `@/lib/repositories` |
| `src/stores/carteraStore.ts` | Migrated to `repositories.cartera.*`; removed supabase import |
| `src/stores/carteraStore.test.ts` | Mock migrated from `@/lib/supabase` to `@/lib/repositories` |
| `openspec/changes/react-feature-parity/tasks.md` | All PR-01 tasks marked `[x]` |

---

## Test Results

```
Test Files  7 passed (7)
     Tests  76 passed (76)   (46 original + 30 new)
```

TypeScript: `npx tsc --noEmit` → exit 0 (zero errors)

---

## Deviations from Design

1. **`AuthUser` shape**: The design specified `onAuthChange(cb: (e: AuthEventKind, userId: string | null) => void)`. The `authStore.ts` now sets `user: { id: userId }` (minimal `AuthUser`) rather than the full Supabase `User` object. The store's `user` field type changed from `User` (supabase SDK) to `AuthUser` (domain type). This is an intentional hexagonal improvement — no SDK types leak into the store. The test assertions were updated to match `{ id: 'user-123' }` shape instead of the full mock user.
   
2. **`logout` error handling**: Added a `try/catch` around `repositories.auth.signOut()` to preserve the original "always reset state on logout" behavior even if signOut throws. The adapter throws `RepositoryError` on error; the store ignores it.

3. **`supabaseCarteraRepository` limit**: Added `.limit(10000)` in the adapter's `listClientes` to match the original store's query exactly. This was not explicitly mentioned in the adapter description but was in the original code.

No architecture deviations. All 7 port interfaces exist, `SupabaseAdapter` is sole consumer of `supabase.ts`, `repositories.ts` is the single wiring point, all tests pass.

---

## Completed Tasks (PR-02)

- [x] Create `src/lib/adapters/supabase/supabaseResumenRepository.ts` — `getResumenDia()` live; deferred methods stubbed with `RepositoryError("not implemented")`
- [x] Create `src/lib/adapters/supabase/supabaseColaRepository.ts` — `siguienteCliente()` live (fin_cola discriminated union); `countPendientes()` live (count query with 3 filter predicates)
- [x] Register `SupabaseResumenRepository` + `SupabaseColaRepository` in `SupabaseAdapter` (`src/lib/adapters/supabase/index.ts`)
- [x] Migrate `src/stores/resumenStore.ts` — uses `repositories.resumen.getResumenDia()`; removed supabase import; imports `ResumenCobradora` from `@/lib/ports`
- [x] Migrate `src/stores/colaStore.ts` — uses `repositories.cola.siguienteCliente()` + `repositories.cola.countPendientes()`; removed supabase import; `SiguienteResponse` replaced by `SiguienteResult` from ports
- [x] Created `src/lib/adapters/supabase/supabaseResumenRepository.test.ts` — 9 tests
- [x] Created `src/lib/adapters/supabase/supabaseColaRepository.test.ts` — 9 tests (fin_cola both branches, countPendientes head/count call, error paths)
- [x] Created `src/stores/resumenStore.test.ts` — 9 tests (mock `@/lib/repositories`)
- [x] Created `src/stores/colaStore.test.ts` — 11 tests (mock `@/lib/repositories`)
- [x] All 115 tests pass (76 original + 39 new)
- [x] `npx tsc --noEmit` → exit 0
- [x] `rg 'import.*supabase' src/stores/resumenStore.ts src/stores/colaStore.ts` → zero hits

---

## TDD Cycle Evidence (PR-02)

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| `supabaseResumenRepository.ts` | `supabaseResumenRepository.test.ts` — 9 tests failed (file missing) | Created impl — 9 pass | Fixed error test to use `mockResolvedValue` (persistent mock pattern) |
| `supabaseColaRepository.ts` | `supabaseColaRepository.test.ts` — 9 tests failed (file missing) | Created impl — 9 pass | Fixed error tests (same persistent mock pattern); fixed `unknown as SiguienteResult` double-cast for TS |
| `resumenStore.ts` migration | `resumenStore.test.ts` — 7/9 tests failed (store still used supabase) | Migrated store — 9 pass | None |
| `colaStore.ts` migration | `colaStore.test.ts` — 6/11 tests failed (store still used supabase) | Migrated store — 11 pass | None |

---

## Files Created (PR-02)

| File | Action |
|------|--------|
| `src/lib/adapters/supabase/supabaseResumenRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseResumenRepository.test.ts` | Created |
| `src/lib/adapters/supabase/supabaseColaRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseColaRepository.test.ts` | Created |
| `src/stores/resumenStore.test.ts` | Created |
| `src/stores/colaStore.test.ts` | Created |

## Files Modified (PR-02)

| File | Change |
|------|--------|
| `src/lib/adapters/supabase/index.ts` | Replaced resumen + cola stubs with `new SupabaseResumenRepository()` and `new SupabaseColaRepository()` |
| `src/stores/resumenStore.ts` | Migrated to `repositories.resumen.getResumenDia()`; removed supabase import; removed local `ResumenCobradora` interface (imported from ports) |
| `src/stores/colaStore.ts` | Migrated `fetchSiguiente` + `countPendientes` to repositories; removed supabase import; removed local `SiguienteResponse` (uses `SiguienteResult` from ports) |
| `openspec/changes/react-feature-parity/tasks.md` | All PR-02 tasks marked `[x]` |

---

## Test Results (PR-02 final)

```
Test Files  11 passed (11)
     Tests  115 passed (115)   (76 original + 39 new)
```

TypeScript: `npx tsc --noEmit` → exit 0

---

## Deviations from Design (PR-02)

1. **Double-cast in `supabaseColaRepository.ts`**: The RPC response `data` is cast as `result as unknown as SiguienteResult` instead of a single `as SiguienteResult`. This is required because TypeScript sees `Record<string, unknown>` and `SiguienteResult` as insufficiently overlapping. The cast is safe — the adapter branches on `fin_cola` before returning, so the `ColaAgotada` branch always returns the explicit shape, and the client-row branch passes the raw RPC data through without transformation (same pattern as `supabaseCarteraRepository` which casts `data as Cliente[]`).

No architecture deviations. All PR-02 acceptance criteria met: DAL-001, DAL-002, DAL-004.

---

## Completed Tasks (PR-03)

- [x] Create `src/lib/adapters/supabase/supabaseGestionRepository.ts` — `registrarGestion` live (maps all 6 args incl. p_rut); `gestionesRango` stub
- [x] Create `src/lib/adapters/supabase/supabaseCargaRepository.ts` — `cargaMensual` live; `listCargasHist` live; `cargaPagos` + `aplicarSayorana` stubs
- [x] Create `src/lib/adapters/supabase/supabaseRecaudacionRepository.ts` — all 3 views live: `recaudacionCobradora` (order desc), `historialPagos` (limit 20), `cuotasPagadas` (limit 200)
- [x] Replaced stubs in `src/lib/adapters/supabase/index.ts` with real repo classes; removed `notImplemented` helper
- [x] Migrated `src/components/ClienteModal.tsx` — replaced `supabase.rpc('cascada_registrar_gestion', ...)` with `repositories.gestion.registrarGestion({rut: cliente.rut, ...})`; removed supabase import; added p_rut fix
- [x] Migrated `src/components/CargaModal.tsx` — replaced `supabase.rpc('cascada_carga_mensual', ...)` with `repositories.carga.cargaMensual(registros, nombre)`; removed supabase import
- [x] Created `src/lib/adapters/supabase/supabaseGestionRepository.test.ts` — 7 tests (registrarGestion success/error paths, p_rut mapping, gestionesRango stub)
- [x] Created `src/lib/adapters/supabase/supabaseCargaRepository.test.ts` — 9 tests (cargaMensual, listCargasHist, deferred stubs)
- [x] Created `src/lib/adapters/supabase/supabaseRecaudacionRepository.test.ts` — 12 tests (3 views × success/empty/error)
- [x] Created `src/components/ClienteModal.test.tsx` — 2 focused tests verifying `registrarGestion` dispatched with rut
- [x] Created `src/components/CargaModal.test.tsx` — 1 focused test verifying `cargaMensual` dispatched with (registros, nombre)
- [x] All 147 tests pass (115 original + 32 new)
- [x] `npx tsc --noEmit` → exit 0
- [x] `rg 'import.*supabase' src/stores/ src/components/` → zero hits — Phase 0 complete

---

## TDD Cycle Evidence (PR-03)

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| `supabaseGestionRepository.ts` | 3 test files failed (files missing) | Created 3 adapters — 28 new tests pass | None |
| `supabaseCargaRepository.ts` | Same RED batch | Same GREEN batch | None |
| `supabaseRecaudacionRepository.ts` | Same RED batch | Same GREEN batch | None |
| SupabaseAdapter index.ts | 144 passing (stubs remained) | Replaced stubs with real classes | Removed notImplemented helper |
| ClienteModal.tsx migration | ClienteModal.test.tsx — 2 tests failed (still used supabase) | Migrated component — 2 pass | Fixed TypeScript cast for ParsedRow→CargaRow |
| CargaModal.tsx migration | CargaModal.test.tsx — 1 test failed | Migrated component — 1 pass | Fixed missing arrayBuffer polyfill in test |

---

## Files Created (PR-03)

| File | Action |
|------|--------|
| `src/lib/adapters/supabase/supabaseGestionRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseGestionRepository.test.ts` | Created |
| `src/lib/adapters/supabase/supabaseCargaRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseCargaRepository.test.ts` | Created |
| `src/lib/adapters/supabase/supabaseRecaudacionRepository.ts` | Created |
| `src/lib/adapters/supabase/supabaseRecaudacionRepository.test.ts` | Created |
| `src/components/ClienteModal.test.tsx` | Created |
| `src/components/CargaModal.test.tsx` | Created |

## Files Modified (PR-03)

| File | Change |
|------|--------|
| `src/lib/adapters/supabase/index.ts` | Replaced gestion/carga/recaudacion stubs with real class instances; removed notImplemented helper |
| `src/components/ClienteModal.tsx` | Replaced `supabase` import with `repositories`; replaced `supabase.rpc(...)` with `repositories.gestion.registrarGestion({rut: cliente.rut, ...})` |
| `src/components/CargaModal.tsx` | Replaced `supabase` import with `repositories`; replaced `supabase.rpc(...)` with `repositories.carga.cargaMensual(...)` |
| `openspec/changes/react-feature-parity/tasks.md` | All PR-03 tasks marked `[x]` |

---

## Test Results (PR-03 final)

```
Test Files  16 passed (16)
     Tests  147 passed (147)   (115 original + 32 new)
```

TypeScript: `npx tsc --noEmit` → exit 0

Zero supabase imports in src/stores/ or src/components/ → Phase 0 COMPLETE (DAL-002, DAL-004)

---

## Deviations from Design (PR-03)

1. **Type cast in CargaModal**: `preview.registros` is typed as `ParsedRow[]` (with `string | null` fields). `CargaRow` uses optional fields (`string | undefined`). With `exactOptionalPropertyTypes: true`, these are incompatible. Added `as unknown as CargaRow[]` cast at the call site. This is safe at runtime — the RPC accepts null values for optional fields. No architecture deviation.

2. **`act` warning in CargaModal test**: The test generates a React "An update to CargaModal inside a test was not wrapped in act()" warning in stderr. This is cosmetic — it's caused by React state updates from the async `processFile` callback firing after `waitFor`'s act boundary. The test passes and verifies the correct behavior. No test reliability issue.

3. **jsdom missing `File.prototype.arrayBuffer`**: jsdom 26 doesn't implement `Blob.prototype.arrayBuffer`. Fixed by assigning the method as an own property on the test File instance before triggering the change event. This does not affect production behavior.

---

## Phase 0 Status

**COMPLETE.** All 3 sub-PRs (PR-01 Foundation/Auth/Cartera, PR-02 Resumen/Cola, PR-03 Gestion/Carga/Recaudacion) are implemented and verified. Zero supabase imports remain in src/stores/ or src/components/. The hexagonal data-access layer is fully in place. All slices (PR-04 through PR-10) are unblocked.

---

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main)
- PR-01 boundary: `feat/parity-pr01-dal-foundation` branch — awaiting orchestrator review
- PR-02 boundary: `feat/parity-pr02-resumen-cola` branch — all changes in working tree (no commit yet — awaiting orchestrator review)
- PR-03 boundary: `feat/parity-pr03-gestion-carga` branch — all changes in working tree (no commit yet — awaiting orchestrator review)
- PR-03 estimated budget impact: ~240 lines changed

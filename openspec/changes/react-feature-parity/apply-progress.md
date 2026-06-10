# Apply Progress: react-feature-parity — PR-01

**Change**: react-feature-parity  
**Batch**: PR-01 (first batch — no prior progress to merge)  
**Mode**: Strict TDD  
**Date**: 2026-06-10  

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

## Remaining Tasks (PR-02+)

All PR-01 tasks complete. Next: PR-02 (Resumen/Cola adapter + store migration).

---

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main)
- Current work unit: PR-01 — NFR-004 + Phase 0.1 Foundation + Auth/Cartera
- Boundary: `feat/parity-pr01-dal-foundation` branch, all changes in working tree (no commit yet — awaiting orchestrator review)
- Estimated review budget impact: ~350 lines changed

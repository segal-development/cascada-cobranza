# Apply Progress: React 19 Migration - PR 3 (Core Views)

**Change**: react-19-migration
**Mode**: Standard (no Strict TDD)
**Batch**: PR 3 - Data Layer + Core Views
**Date**: 2026-06-05

## Completed Tasks

### Phase 2: Data Layer
- [x] 2.1 Wire `carteraStore.loadClientes` to Supabase - fetches from `cascada_clientes`, sorts by zona_critica + rule priority + dias_mora
- [x] 2.2 Implement `carteraStore.getFiltered` - CRITICO, R3 (compromiso), R4 (agendados), search, sortMora
- [x] 2.3 Create `useClientes.ts` hook - combines carteraStore + resumenStore, pagination, reload
- [x] 2.4 Wire `colaStore` - fetchSiguiente RPC, countPendientes
- [x] 2.5 Create `resumenStore.ts` - loads from `cascada_resumen_dia`, aggregates for jefatura

### Phase 3: Core Views
- [x] 3.1 KPI.tsx - label, value, progress bar, sparkline, trend
- [x] 3.2 KPIGrid.tsx - 3/4 column grid
- [x] 3.3 FilterPills.tsx - rule filters with counts, active state
- [x] 3.4 ClienteTable.tsx - full table with estado icons, RuleChip, pagination
- [x] 3.5 Pagination.tsx - page numbers, prev/next, info text
- [x] 3.6 RuleChip.tsx - styled rule badge using RULES config
- [x] 3.7 DashboardCobradora.tsx - KPIs (3 cols), filters, table
- [x] 3.8 DashboardJefatura.tsx - KPIs (4 cols), filters, table

## Files Created

| File | Description |
|------|-------------|
| `src/stores/resumenStore.ts` | KPI data store with Supabase fetch |
| `src/hooks/useClientes.ts` | Data fetching hook combining stores |
| `src/components/KPI.tsx` | KPI card component |
| `src/components/KPIGrid.tsx` | Grid layout for KPIs |
| `src/components/FilterPills.tsx` | Rule filter pills |
| `src/components/ClienteTable.tsx` | Main data table |
| `src/components/Pagination.tsx` | Table pagination |
| `src/components/RuleChip.tsx` | Styled rule badge |
| `src/pages/DashboardCobradora.tsx` | Cobradora dashboard |
| `src/pages/DashboardJefatura.tsx` | Jefatura dashboard |
| `src/stores/carteraStore.test.ts` | Tests for filtering logic |

## Files Modified

| File | Changes |
|------|---------|
| `src/stores/carteraStore.ts` | Wired to Supabase, enhanced filtering |
| `src/stores/colaStore.ts` | Added fetchSiguiente RPC, countPendientes |
| `src/App.tsx` | Switched to real Dashboard component |
| `openspec/changes/react-19-migration/tasks.md` | Marked Phase 2+3 complete |

## Verification Results

```
npm run typecheck: PASS
npm run test: PASS (46 tests)
  - format.test.ts: 20 tests
  - authStore.test.ts: 9 tests  
  - carteraStore.test.ts: 17 tests
```

## Tests Added

- `carteraStore.test.ts`: 17 new tests
  - Filter by CRITICO (urgent cases)
  - Filter by specific rule (R5, R3, R4)
  - Filter by search text (name, RUT)
  - Combined filter and search
  - Sort by mora (asc/desc)
  - Load clientes from Supabase
  - Filter by cobradora for jefatura
  - Handle errors
  - Action tests (setFiltroRegla, setSearch, reset)

## Deviations from Design

None - implementation matches design.

## Issues Found

None.

## Remaining Tasks

### Phase 4: Modals
- [ ] 4.1 Create Modal.tsx base component
- [ ] 4.2 Create ClienteModal.tsx
- [ ] 4.3 Wire gestion form to Supabase RPC
- [ ] 4.4 Create CargaModal.tsx
- [ ] 4.5 Wire SheetJS Excel parsing
- [ ] 4.6 Create Toast.tsx
- [ ] 4.7 Wire uiStore modal handlers

### Phase 5: Cleanup
- [ ] 5.1 Remove app.js
- [ ] 5.2 Strip inline CSS from index.html
- [ ] 5.3 Update index.html Vite entry
- [ ] 5.4-5.8 E2E tests and final polish

## Workload / PR Boundary

- **Mode**: chained PR slice
- **Chain strategy**: feature-branch-chain
- **Current work unit**: PR 3 - Core Views
- **Boundary**: Phase 2 (Data Layer) + Phase 3 (Core Views) complete
- **Estimated review impact**: ~380 lines (within 400-line budget)

## Status

**13/13 tasks complete for PR 3. Ready for verify.**

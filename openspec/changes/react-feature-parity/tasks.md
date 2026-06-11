# Tasks: React Feature Parity

---

## Review Workload Forecast

| Slice / Unit | Est. changed lines |
|---|---|
| PR-01 NFR-004 + Phase 0.1 Foundation + Auth/Cartera | ~350 |
| PR-02 Phase 0.2 Resumen/Cola | ~240 |
| PR-03 Phase 0.3 Gestion/Carga/Recaudacion | ~240 |
| PR-04 Slice A Work queue | ~320 |
| PR-05 Slice B Live sidebar | ~280 |
| PR-06 Slice C Live KPIs | ~225 |
| PR-07 Slice D Productivity | ~380 |
| PR-08 Slice E Payments + Recaudación | ~420 |
| PR-09 Slice F Exports + Sayorana | ~320 |
| PR-10 Slice G Table polish | ~130 |
| **Total estimated** | **~2905 lines** |
| **400-line budget risk** | **High** |
| **Chained PRs recommended** | **Yes** |
| **Suggested split** | Phase 0 ×3 + Slices A–G ×7 = **10 PRs** |
| **Decision needed before apply** | **Yes** — `chain_strategy` must be selected (stacked-to-main vs. feature-branch-chain) |

---

## Suggested Work Units

| Unit | PR | Base branch | Parallel with | Notes |
|---|---|---|---|---|
| NFR-004 + Phase 0.1 Foundation + Auth/Cartera | PR-01 | `main` | — | Defines ALL port interfaces; must land first |
| Phase 0.2 Resumen/Cola | PR-02 | PR-01 / `main` | — | Sequential after PR-01 |
| Phase 0.3 Gestion/Carga/Recaudacion | PR-03 | PR-02 / `main` | — | Sequential after PR-02; gates all slices |
| Slice A Work queue | PR-04 | PR-03 | B, C, E, G | cola mode UI + ClienteModal multi-button + p_rut fix |
| Slice B Live sidebar | PR-05 | PR-03 | A, C, E, G | priority buckets + CARTERAS + ÚLTIMA CARGA |
| Slice C Live KPIs | PR-06 | PR-03 | A, B, E, G | gates Slice D |
| Slice D Productivity | PR-07 | PR-06 | — | depends on KPI store methods from C |
| Slice E Payments + Recaudación | PR-08 | PR-03 | A, B, C, G | 25-col COL_MAP fix included here; gates Slice F |
| Slice F Exports + Sayorana | PR-09 | PR-08 | — | depends on ERP history fields persisted by E |
| Slice G Table polish | PR-10 | PR-03 | A, B, C, E | minimal surface; can merge any time after PR-03 |

> With `stacked-to-main`: each PR targets `main` in order. PRs 04, 05, 06, 08, 10 merge after PR-03; PR-07 after PR-06; PR-09 after PR-08.
> With `feature-branch-chain`: create a tracker branch `feat/react-feature-parity`; PR-01 targets tracker, each subsequent PR targets its immediate parent. Only the tracker merges to `main`.
> Chain strategy is TBD — orchestrator resolves before `sdd-apply` launches.

---

## Dependency Order

```
PR-01 (Foundation)
  └── PR-02 (Resumen/Cola)
        └── PR-03 (Gestion/Carga/Recaudacion)
              ├── PR-04 (Slice A) ─────────────────┐
              ├── PR-05 (Slice B)                   │
              ├── PR-06 (Slice C)                   │
              │     └── PR-07 (Slice D)             │ parallel
              ├── PR-08 (Slice E) ─────────────────┤
              │     └── PR-09 (Slice F)             │
              └── PR-10 (Slice G) ─────────────────┘
```

---

## Tasks

---

### PR-01 — NFR-004 + Phase 0.1 Foundation + Auth/Cartera

**Specs satisfied:** DAL-001, DAL-002, DAL-003, DAL-004, NFR-004
**No user-visible changes. All existing tests must pass after this PR.**

- [x] Install `babel-plugin-react-compiler` as devDependency (`npm i -D babel-plugin-react-compiler`)
- [x] Configure `vite.config.ts`: add `babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] }` to the `react()` plugin options
- [x] Replace `import * as React from "react"` with named imports in:
  - `src/components/ui/input.tsx`
  - `src/components/ui/textarea.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/label.tsx`
- [x] Create `src/lib/errors.ts` — export `RepositoryError extends Error` with `message: string` and optional `code?: string`
- [x] Create `src/lib/ports/auth.port.ts` — `AuthRepository` interface (`signIn`, `signOut`, `onAuthChange`, `getPerfil`)
- [x] Create `src/lib/ports/cartera.port.ts` — `CarteraRepository` interface + `ListClientesParams`
- [x] Create `src/lib/ports/resumen.port.ts` — `ResumenRepository` interface with all methods including Slice C/D deferred members; add `// deferred: implemented in Slice C/D` comments on those
- [x] Create `src/lib/ports/cola.port.ts` — `ColaRepository` interface + `SiguienteResult` discriminated union (`fin_cola: true, mensaje` | full client row)
- [x] Create `src/lib/ports/gestion.port.ts` — `GestionRepository` interface + `RegistrarGestionInput` + `GestionExportRow`
- [x] Create `src/lib/ports/carga.port.ts` — `CargaRepository` interface + `CargaRow`, `CargaResult`, `CargaHist`, `PagoRow`, `CargaPagosResult`, `AplicarSayoranaResult`
- [x] Create `src/lib/ports/recaudacion.port.ts` — `RecaudacionRepository` interface + `RecaudacionRow`, `HistorialPagoRow`, `CuotaPagadaRow`
- [x] Create `src/lib/ports/index.ts` — re-export all interfaces and `Repositories` aggregate interface
- [x] Create `src/lib/adapters/supabase/supabaseAuthRepository.ts` — implement `AuthRepository`; `onAuthChange` maps SDK events → neutral `AuthEventKind`; `getPerfil` calls `rpc('cascada_mi_perfil')`; on error throw `RepositoryError`
- [x] Create `src/lib/adapters/supabase/supabaseCarteraRepository.ts` — implement `CarteraRepository`; `listClientes` calls `from('cascada_clientes').select('*')` + optional `.eq('cobradora_id', ...)` for jefatura
- [x] Create `src/lib/adapters/supabase/index.ts` — `SupabaseAdapter` class that assembles all repository implementations (Auth + Cartera bodies; remaining ports as stubs that throw `RepositoryError("not implemented")` until their slice lands)
- [x] Create `src/lib/repositories.ts` — Proxy module-singleton + `__setRepositories(next: Repositories)` test seam
- [x] Migrate `src/stores/authStore.ts` — replace all `supabase.*` calls with `repositories.auth.*`; remove `import { supabase }` line
- [x] Migrate `src/stores/carteraStore.ts` — replace all `supabase.from('cascada_clientes')` calls with `repositories.cartera.listClientes(...)`; remove `import { supabase }` line
- [x] Migrate `authStore.test.ts` — switch from `vi.mock('@/lib/supabase')` to `vi.mock('@/lib/repositories')` (or `__setRepositories`)
- [x] Migrate `carteraStore.test.ts` — same mock migration
- [x] Run `npm test -- --run` and confirm all previously-passing tests pass
- [x] Verify: `rg 'import.*supabase' src/stores/authStore.ts src/stores/carteraStore.ts` returns no hits
- [x] Verify: `rg 'import \* as React' src/components/ui/` returns zero matches

**Acceptance criteria:**
- All 7 port interfaces exist; no raw `PostgrestError`/`PostgrestResponse` in any signature (DAL-001)
- `SupabaseAdapter` is the sole consumer of `src/lib/supabase.ts` (DAL-002)
- `src/lib/repositories.ts` is the single adapter wiring point (DAL-003)
- All existing tests pass without modification (DAL-004)
- `babel-plugin-react-compiler` configured in `vite.config.ts`; named imports in all 4 ui/ files (NFR-004)

---

### PR-02 — Phase 0.2 Resumen/Cola Adapter + Store Migration

**Specs satisfied:** DAL-001, DAL-002, DAL-004
**No user-visible changes. All existing tests must pass.**

- [x] Create `src/lib/adapters/supabase/supabaseResumenRepository.ts` — implement `getResumenDia()` calling `from('cascada_resumen_dia').select('*')`; implement deferred methods (`getKpiGestionados`, `getDesgloseSegmento`, `getResumenGestiones`, `setearMeta`) as stubs throwing `RepositoryError("not implemented")` — bodies land in Slices C and D
- [x] Create `src/lib/adapters/supabase/supabaseColaRepository.ts` — implement `siguienteCliente()` calling `rpc('cascada_siguiente_cliente')`; branch on `fin_cola` to return discriminated union; implement `countPendientes()` calling `from('cascada_clientes').select('*', { count: 'exact', head: true })` with the verified filter predicates
- [x] Add `ResumenRepository` and `ColaRepository` implementations to `SupabaseAdapter` in `src/lib/adapters/supabase/index.ts`
- [x] Migrate `src/stores/resumenStore.ts` — replace `supabase.from('cascada_resumen_dia')` with `repositories.resumen.getResumenDia()`; remove `import { supabase }` line
- [x] Migrate `src/stores/colaStore.ts` — replace RPC and count calls with `repositories.cola.siguienteCliente()` and `repositories.cola.countPendientes()`; remove `import { supabase }` line
- [x] Migrate any resumenStore and colaStore tests to use `vi.mock('@/lib/repositories')` or `__setRepositories`
- [x] Run `npm test -- --run` and confirm all tests pass
- [x] Verify: `rg 'import.*supabase' src/stores/resumenStore.ts src/stores/colaStore.ts` returns no hits

**Acceptance criteria:**
- `resumenStore` and `colaStore` contain no direct SDK imports (DAL-002, DAL-004)
- All tests pass; no user-visible change

---

### PR-03 — Phase 0.3 Gestion/Carga/Recaudacion Adapter + Modal Migration

**Specs satisfied:** DAL-001, DAL-002, DAL-004
**No user-visible changes. All existing tests must pass. Phase 0 fully complete after this PR.**

- [x] Create `src/lib/adapters/supabase/supabaseGestionRepository.ts` — implement `registrarGestion(input)` calling `rpc('cascada_registrar_gestion', { p_rut: input.rut, p_cuota_id: input.cuotaId, p_tipo: input.tipo, p_efecto: input.efecto, p_nota: input.nota, p_fec_proxima: input.fecProxima })`; implement `gestionesRango` as stub throwing `RepositoryError("not implemented")` — body lands in Slice F
- [x] Create `src/lib/adapters/supabase/supabaseCargaRepository.ts` — implement `cargaMensual(rows, name)` calling `rpc('cascada_carga_mensual', { p_registros: rows, p_nombre_archivo: name })`; implement `listCargasHist()` calling `from('cascada_cargas_hist').select('*').limit(1)`; implement `cargaPagos` and `aplicarSayorana` as stubs — bodies land in Slice E/F
- [x] Create `src/lib/adapters/supabase/supabaseRecaudacionRepository.ts` — implement all 3 views: `recaudacionCobradora()` (`from('cascada_recaudacion_cobradora').select('*').order('monto_pagado',{ascending:false})`), `historialPagos()` (limit 20), `cuotasPagadas()` (limit 200)
- [x] Add all three new implementations to `SupabaseAdapter` in `src/lib/adapters/supabase/index.ts`
- [x] Migrate `src/components/ClienteModal.tsx` — replace direct `supabase.rpc('cascada_registrar_gestion', ...)` with `repositories.gestion.registrarGestion(input)`; remove `import { supabase }` line
- [x] Migrate `src/components/CargaModal.tsx` — replace `supabase.rpc('cascada_carga_mensual', ...)` with `repositories.carga.cargaMensual(rows, name)`; remove `import { supabase }` line
- [x] Migrate ClienteModal and CargaModal tests to use `vi.mock('@/lib/repositories')` or `__setRepositories`
- [x] Run `npm test -- --run` and confirm all tests pass
- [x] Verify: `rg 'import.*supabase' src/stores/ src/components/' returns zero hits — Phase 0 complete

**Acceptance criteria:**
- Zero direct SDK imports remain in `src/stores/` or `src/components/` (DAL-002, DAL-004)
- All tests pass; no user-visible change

---

### PR-04 — Slice A: Work Queue

**Specs satisfied:** FR-004, FR-006
**Prerequisite:** PR-03

- [ ] Add `submitGestion` action to `colaStore` (or gestion action in colaStore): calls `repositories.gestion.registrarGestion(input)` with `rut` always included; if cola mode active, follows with `repositories.cola.siguienteCliente()` and updates current client or closes on `fin_cola`
- [ ] Add `saltar` action to `colaStore`: calls `repositories.cola.siguienteCliente()` without registering a gestión
- [ ] Add `colaModeActive` flag and `enterColaMode(client)` / `exitColaMode()` to `colaStore`
- [ ] Wire sidebar "Siguiente cliente" button to dispatch `colaStore.enterColaMode` (calls `repositories.cola.siguienteCliente()`, opens ClienteModal in cola mode)
- [ ] Add keyboard shortcut: when `colaModeActive === true` and no modal is open, pressing `N` dispatches `siguienteCliente()` and opens ClienteModal
- [ ] Modify `ClienteModal.tsx` — replace single submit button with three-button row:
  - **"Solo guardar"** (secondary): calls `submitGestion` and closes modal regardless of cola mode
  - **"Guardar y siguiente →"** (primary): calls `submitGestion`; if cola mode, loads next client; if not cola mode, closes modal
  - **"Saltar ⏩"** (visible in cola mode only): calls `saltar` action; no gestión registered
- [ ] Add cola-mode indicator badge ("⏭ Modo cola") to ClienteModal header; visible only when `colaModeActive === true`; badge includes an × button that calls `exitColaMode()` and closes modal without advancing queue
- [ ] WSP button path — ensure `registrarGestion` is called with fixed payload (`tipo: "whatsapp"`, `efecto: "no_contesta"`, `nota: "WSP enviado: <first 180 chars of template>"`, `fecProxima: null`) AND `p_rut` included — independent of any subsequent manual save (no dedup guard, Option A parity)
- [ ] Ensure every `registrarGestion` call in ClienteModal (WSP path and form submit path) passes `rut` from the current client in `RegistrarGestionInput`
- [ ] Write/update tests: solo guardar closes modal, guardar-y-siguiente advances cola, saltar skips without registering, WSP registers with fixed payload + `p_rut`, cola mode indicator renders, × exits cola mode

**Acceptance criteria (FR-004, FR-006):**
- "Solo guardar" registers gestión + closes modal (FR-004 scenario 1)
- "Guardar y siguiente →" in non-cola mode registers + closes (FR-004 scenario 2)
- "Guardar y siguiente →" in cola mode registers + calls `cascada_siguiente_cliente` (FR-004 scenario 3 / FR-006 scenario 2)
- WSP button registers `tipo=whatsapp, p_rut` AND opens `wa.me` link (FR-004 scenario 4)
- Manual save after WSP registers a second gestión independently — no dedup guard (FR-004 scenario 5)
- Every registration path includes `p_rut` in RPC payload (FR-004 scenario 6)
- "Saltar ⏩" skips without registering (FR-006 scenario 3)
- × button exits cola mode without advancing queue (FR-006 scenario 4)
- Keyboard shortcut N triggers `siguienteCliente` when cola active and modal closed (FR-006 scenario 5)

---

### PR-05 — Slice B: Live Sidebar

**Specs satisfied:** FR-003, FR-007
**Prerequisite:** PR-03 (parallel with PR-04, PR-06, PR-08, PR-10)

- [ ] Add 5 priority-bucket selectors to `carteraStore` computed over `state.data`:
  - `Vence hoy`: `zona_critica === "CRIT_VENCE_HOY"`
  - `R5 · Al límite`: `regla === "R5"`
  - `Pre-bloqueo 30+d`: `regla === "R2" && dias_mora >= 30`
  - `Mora activa 15-29d`: `regla === "R2" && dias_mora < 30`
  - `R1 · Primer contacto`: `regla === "R1"`
- [ ] Add `setFiltroPrioritario(key)` action to `carteraStore`: toggles `filtroZona`/`filtroRegla`; re-clicking an active bucket clears the filter
- [ ] Render ATENCIÓN PRIORITARIA section in Sidebar: 5 bucket tiles with colored priority dot, label, count; active bucket receives active visual state (DS-007); section header shows total across all 5
- [ ] Render CARTERAS section in Sidebar: list cobradoras with `cartera_total` from `resumenStore` data (sourced from `cascada_resumen_dia`, already loaded)
- [ ] Render ÚLTIMA CARGA section in Sidebar: dispatch `repositories.carga.listCargasHist()` on sidebar mount; display `created_at` timestamp + `registros_procesados` + `registros_nuevos`; add loading and error states
- [ ] Write/update tests: bucket counts derived correctly from mock clientes, setFiltroPrioritario toggles, re-click clears, CARTERAS renders cobradora list, ÚLTIMA CARGA shows timestamp

**Acceptance criteria (FR-003, FR-007):**
- CARTERAS section renders real cobradora list with active client counts from `cascada_resumen_dia` (FR-003 scenario 1)
- ÚLTIMA CARGA section displays timestamp and count from `cascada_cargas_hist` (FR-003 scenario 1)
- ATENCIÓN PRIORITARIA section renders 5 buckets with correct counts; header total = sum of buckets (FR-007 scenario 1)
- Clicking a bucket filters client table to that segment (FR-007 scenario 2)
- Clicking an active bucket clears the filter (FR-007 scenario 3)

---

### PR-06 — Slice C: Live KPIs

**Specs satisfied:** FR-002 (KPI live wiring, drilldown)
**Prerequisite:** PR-03 (parallel with PR-04, PR-05, PR-08, PR-10)

- [ ] Implement `getKpiGestionados()` body in `supabaseResumenRepository.ts`: calls `rpc('cascada_kpi_gestionados')`, maps response to `KpiGestionados` domain type; replace the stub from PR-02
- [ ] Implement `getDesgloseSegmento(segmento, fecha)` body: calls `rpc('cascada_desglose_segmento', { p_segmento: segmento, p_fecha: fecha })`, maps to `DesgloseGestiones`; replace stub
- [ ] Add `loadKpis` action to `resumenStore` (or new `kpiStore`): dispatches `repositories.resumen.getKpiGestionados()` on dashboard mount; stores `KpiGestionados`
- [ ] Add `loadDesglose(segmento)` action: dispatches `repositories.resumen.getDesgloseSegmento(segmento, today)`; stores `DesgloseGestiones` keyed by segment
- [ ] Update KPIGrid — meta cards render a `<progress>` or CSS progress bar scaled to `gestiones_actual / meta_diaria`; values sourced live from `kpis` state
- [ ] Add drilldown panel to KPI card: clicking a card calls `loadDesglose(segmento)` and displays `por_efecto` / `por_tipo` breakdowns using `EFECTO_LABELS`/`TIPO_LABELS` lookups (raw key fallback for unknown labels)
- [ ] Write/update tests: `loadKpis` calls correct RPC, progress bar renders correct ratio, drilldown opens on card click with correct segment, unknown label falls back to raw key

**Acceptance criteria (FR-002):**
- Dashboard calls `cascada_kpi_gestionados` on mount; KPIGrid renders 3 cards with live values (FR-002 scenario 1)
- Meta cards render progress bar scaled to actual/target ratio (FR-002 scenario 1)
- Clicking a KPI card calls `cascada_desglose_segmento` and displays segment breakdown (FR-002 scenario 2)

---

### PR-07 — Slice D: Productivity

**Specs satisfied:** FR-003 (productivity grid, meta edit, desglose)
**Prerequisite:** PR-06

- [ ] Implement `getResumenGestiones(cobradoraId, fecha)` body in `supabaseResumenRepository.ts`: calls `rpc('cascada_resumen_gestiones', { p_cobradora_id: cobradoraId, p_fecha: fecha })`; maps to `DesgloseGestiones` (same shape as desglose); replace stub
- [ ] Implement `setearMeta(params)` body: calls `rpc('cascada_setear_meta', { p_cobradora_id, p_meta, p_fecha, p_aplicar_permanente, p_motivo })`; replace stub
- [ ] Add `productividadStore` (or extend `resumenStore`): `loadProductividad()` fetches `getResumenGestiones` for all cobradoras (or per session); stores productivity map keyed by `cobradoraId`
- [ ] Build `ProductividadGrid` component: renders one `.prod-card` per cobradora with daily count, monthly count, meta target, progress bar; card receives visual state class (`cumplida` / `en-ruta` / `atrasada`) based on progress ratio vs. meta
- [ ] Add hover-reveal inline meta edit control (pencil icon) to each `.prod-card`; clicking it opens `MetaModal`
- [ ] Build `MetaModal` component: current meta display, new meta numeric input, `permanente` checkbox, optional `motivo` text; on submit calls `repositories.resumen.setearMeta(params)` with correct `permanente` value; on success refresh productivity card; on close discard changes
- [ ] Card body click (not edit control) opens `DesgloseModal` for that cobradora loading `getResumenGestiones(cobradoraId, today)`
- [ ] Write/update tests: card visual state computed correctly, MetaModal permanente=false sends correct params, MetaModal permanente=true sends correct params, card click opens desglose

**Acceptance criteria (FR-003):**
- Each cobradora card shows daily count, monthly count, progress bar, correct visual state (`cumplida`/`en-ruta`/`atrasada`) (FR-003 scenario 2)
- Meta edit today-only calls `cascada_setear_meta` with `permanente: false` (FR-003 scenario 3)
- Meta edit permanent calls `cascada_setear_meta` with `permanente: true` (FR-003 scenario 4)
- Card body click opens desglose for that cobradora from `cascada_resumen_gestiones` (FR-003 scenario 5)

---

### PR-08 — Slice E: Payments + Recaudación

**Specs satisfied:** FR-005, FR-008, FR-009
**Prerequisite:** PR-03 (parallel with PR-04, PR-05, PR-06, PR-10)
> **Live-DB validation flag:** `cascada_carga_pagos` RPC has 3 input formats (erp_can | erp_mov | simple). DB-side matching semantics are not fully observable from the client. Validate format-detection logic and RPC response against a live DB before considering this slice complete. Not a blocker for client implementation but flag for QA sign-off.

- [ ] Create `src/lib/export/erpCargaColumns.ts` — export `ERP_CARGA_COLUMNS: readonly ErpCargaColumn[]` with all 25 entries from `COL_MAP` (design §RISK 3 table, columns 1–25) with `type` annotations (`string` | `number` | `date`); include `parseDateFlex` and string-force rules in column metadata
- [ ] Fix `CargaModal.tsx` — replace the existing 13-column mapping with a loop over `ERP_CARGA_COLUMNS` so all 25 columns (including gestión-history block 18–25) are forwarded to `repositories.carga.cargaMensual(rows, name)`. ALSO extend the date-parsing guard (currently only `fec_vencimiento`) to apply `parseDateFlex` to every `type:'date'` column — i.e. `fecha_ges` and `fecprox_ges` too — otherwise migrated gestión dates arrive as Excel serials/raw strings. Verified missing in PR-03 review (legacy app.js:1523 parses all three dates).
- [ ] Implement `cargaPagos(pagos, name)` body in `supabaseCargaRepository.ts`: calls `rpc('cascada_carga_pagos', { p_pagos: pagos, p_nombre_archivo: name })`; maps to `CargaPagosResult`; replace stub
- [ ] Build `PagosModal` component (mirrors CargaModal pattern): dropzone accepting `.xlsx`; format detection: (a) if columns `rut + nro_cuota + nro_contrato` present → erp/full format, (b) if only `rut` present → mark-all-active format; display informational notice describing accepted formats; preview parsed records; "Confirmar pagos" button calls `repositories.carga.cargaPagos(pagos, name)`; success toast shows `cuotas_marcadas_pagadas`; modal closes on success
- [ ] Add sidebar entry for "Carga de pagos" (jefatura only) that opens PagosModal
- [ ] Create `src/stores/recaudacionStore.ts`: `loadRecaudacion()` action calls all 3 methods — `repositories.recaudacion.recaudacionCobradora()`, `repositories.recaudacion.historialPagos()`, `repositories.recaudacion.cuotasPagadas()`; stores results; loading/error states
- [ ] Build `RecaudacionView` component: 4-cell aggregate KPI header (sum totals across cobradoras), per-cobradora breakdown table with `monto_pagado` progress bar, payment history section from `historialPagos`; monetary values use `--sage` color token + JetBrains Mono font (DS-003, DS-008)
- [ ] Add XLSX export to RecaudacionView: "Exportar XLSX" button generates file from current `cuotasPagadas` data using SheetJS; triggers browser download
- [ ] Add sidebar entry "Recaudación" (jefatura only) that opens RecaudacionView
- [ ] Write/update tests: 25-col mapping covers all ERP_CARGA_COLUMNS, PagosModal format detection for both input formats, recaudacionStore loads all 3 views, XLSX export uses in-memory data (no RPC)

**Acceptance criteria (FR-005, FR-008, FR-009):**
- CargaModal maps all 25 ERP columns including the 12 previously-dropped gestión-history fields (FR-005 scenario 2)
- PagosModal accepts rut+nro_cuota+nro_contrato format and calls `cascada_carga_pagos` (FR-008 scenario 1)
- PagosModal with rut-only file marks all active cuotas (FR-008 scenario 2)
- RecaudacionView loads from 3 data sources and renders 4 aggregate KPI cells + per-cobradora table (FR-009 scenario 1)
- XLSX export downloads file from in-memory data (FR-009 scenario 2)

---

### PR-09 — Slice F: Exports + Sayorana

**Specs satisfied:** FR-010, FR-011, FR-012
**Prerequisite:** PR-08 (25-col carga must have persisted `refere_mov`/`refere_erp` before export is meaningful)
> **Live-DB validation flag:** `cascada_aplicar_sayorana` RPC mutation semantics (which clients move to pool, idempotency) are not observable from the client. Validate against a live DB before relying on eligibility-gating logic.

- [ ] Implement `gestionesRango(desde, hasta)` body in `supabaseGestionRepository.ts`: calls `rpc('cascada_gestiones_rango', { p_fecha_desde: desde, p_fecha_hasta: hasta })`; maps to `GestionExportRow[]`; replace stub
- [ ] Implement `aplicarSayorana()` body in `supabaseCargaRepository.ts`: calls `rpc('cascada_aplicar_sayorana')`; maps to `AplicarSayoranaResult`; replace stub
- [ ] Create `src/lib/export/gestionesExport.ts`:
  - `TIPO_TO_ACCION: Record<string,string>` — port verbatim from `legacy-reference/app.js:2054-2059`
  - `EFECTO_TO_ERP: Record<string,string>` — port verbatim from `app.js:2039-2051`
  - `toExportRow(g: GestionExportRow)` — emits the 13 `Gestiones_Masivas` columns in order with all transforms (referencia = `refere_erp || id`, acciontxt, efectotxt, proxges, obstxt truncated/uppercased, contactado 0/1)
- [ ] Build `GestionesExportModal` component: desde/hasta date pickers; export blocked (validation message) if either date missing; "Exportar" calls `repositories.gestion.gestionesRango(desde, hasta)`, maps rows through `toExportRow`, writes XLSX as `Gestiones_Masivas_<timestamp>.xlsx`; informational notice: only gestiones registered in Cascada are included
- [ ] Add "Exportar gestiones" sidebar entry that opens GestionesExportModal
- [ ] Add "Exportar vista actual" sidebar function: reads current `carteraStore` filtered+sorted client data (no RPC); generates XLSX from in-memory rows; triggers browser download
- [ ] Implement "Aplicar Sayorana" action in `ClienteModal`:
  - Show action only when client is eligible (eligibility determined by client row state per `cascada_aplicar_sayorana` contract)
  - On trigger, calls `repositories.carga.aplicarSayorana()`; on success shows toast, closes modal, applies `no-gestionable` visual state to client row in `carteraStore`
- [ ] Write/update tests: `toExportRow` produces 13 columns in correct order with all transforms, export blocked without dates, "Exportar vista actual" uses in-memory data (assert no RPC call), sayorana action absent for ineligible client

**Acceptance criteria (FR-010, FR-011, FR-012):**
- Export date range calls `cascada_gestiones_rango` and downloads XLSX in `Gestiones_Masivas` format (FR-010 scenario 1)
- Export blocked without both dates selected; validation message shown (FR-010 scenario 2)
- "Exportar vista actual" reflects active filter/sort state; zero RPC calls (FR-011 scenario 1)
- Sayorana action calls `cascada_aplicar_sayorana`, shows toast, closes modal, row becomes no-gestionable (FR-012 scenario 1)
- Sayorana action not shown for ineligible clients (FR-012 scenario 2)

---

### PR-10 — Slice G: Table Polish

**Specs satisfied:** FR-002 (mora sort, no-gestionable), FR-003 (cobradora col)
**Prerequisite:** PR-03 (parallel with PR-04, PR-05, PR-06, PR-08)

- [ ] Wire mora sort toggle in `ClienteTable`: clicking the Mora column header toggles `sortMora` state (`asc` → `desc` → off); header shows ↑ / ↓ indicator while active; sorting applied client-side over current `carteraStore.filteredData`
- [ ] Add Cobradora column to `ClienteTable` — visible only in jefatura view; renders `cobradora_id` resolved to cobradora name via `resumenStore.cobradoras` map
- [ ] Apply `no-gestionable` visual state to client rows: clients with pool, sayorana, or pre-desistido status receive opacity 0.6 and `"· solo lectura"` suffix on name (DS-005)
- [ ] Write/update tests: mora sort asc shows ↑, mora sort desc shows ↓, cobradora col visible for jefatura, no-gestionable class applied to sayorana/pool clients

**Acceptance criteria (FR-002, FR-003):**
- Mora header click sorts ascending (↑); second click sorts descending (↓) (FR-002 scenario 3)
- Pool/sayorana client rows receive `no-gestionable` state (opacity 0.6, solo-lectura suffix) (FR-002 scenario 4)
- Cobradora column present in jefatura table view (FR-003 scenario 6)

---

## Cross-cutting notes

- **WSP double-register policy:** Option A (parity) is the default per spec FR-004 — both WSP auto-gestión and manual save register independently. No dedup guard introduced.
- **Live-DB validation required for:** Slice E (`cascada_carga_pagos` format matching, DB-side semantics) and Slice F (`cascada_aplicar_sayorana` mutation semantics, idempotency). These are not client-implementation blockers but require QA sign-off against a live or staging DB.
- **Port stubs:** Slices C, D, E, and F replace their respective `RepositoryError("not implemented")` stubs with real implementations. After all slices merge, zero stubs remain.
- **No manual `useMemo`/`useCallback`** in new code (React Compiler is active from PR-01).
- **18 Supabase contracts** — all VERIFIED against `legacy-reference/app.js`; do not re-derive.
- **ERP import vs. export symmetry:** `ERP_CARGA_COLUMNS` (25 cols, import only) and `gestionesExport.ts` (13 cols, export only) are distinct — they MUST NOT share one descriptor.

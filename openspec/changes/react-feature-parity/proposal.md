# Proposal: React Feature Parity with Legacy Cobranza App

Close the functional gap between the migrated React 19 app and the full-featured
legacy reference (`legacy-index.html`) by delivering the 17 deferred parity
features, fixing clear defects found while porting, and first introducing a
data-access abstraction layer that decouples Zustand stores from Supabase. This
unblocks a future GCP migration and lets every parity feature be built against a
stable port interface instead of a hard SDK dependency.

## Intent

The React 19 migration delivered a working, testable shell but intentionally
deferred 17 user-visible behaviors that exist in the legacy app. The system is in
daily production use by 7 cobradoras and 1 jefa, who currently lose capability
relative to the legacy tool (no work queue, placeholder sidebar data, static
KPIs, no payments/recaudación, no exports). This change restores full parity.

**Fidelity contract — "parity + obvious fixes":** the React app MUST be a
faithful replica of visible legacy behavior, while fixing clear defects
discovered during porting. This is NOT a bug-for-bug replica, and it is NOT a UX
redesign. Where the legacy app and the current React port disagree and the legacy
behavior is correct, legacy wins; where both are wrong in an obvious, low-risk
way, the fix is folded into the relevant slice.

**Why now:** the base migration was just archived and the main specs were
reconciled to delivered reality, leaving the deferred requirements explicitly
marked for `react-feature-parity`. Building parity on top of the current
store-to-Supabase coupling would harden that coupling across ~7 new feature
areas, making the eventual GCP migration far more expensive. Introducing the
data-access layer first (Phase 0 keystone) is the lowest-cost moment to do it.

## Scope

### In Scope

- **Phase 0 keystone:** a data-access abstraction layer (repository ports +
  Supabase adapter). Stores and modals call port interfaces; a `SupabaseAdapter`
  implements them. No user-visible behavior change in Phase 0.
- The 17 deferred parity features, grouped into 7 reviewable slices (A–G).
- Fold-in defect fixes that surface while porting (see Fold-in Fixes).
- Re-adding the deferred requirements to the affected specs (live wiring for
  FR-002/FR-003/FR-004, and the FR-006 Cola de Gestión behavior).
- XLSX export behavior matching legacy ERP output format where legacy exports.

### Out of Scope

- **Backend / RPC changes** — all 11 RPCs, 7 tables/views, and RLS stay exactly
  as-is. This change consumes the existing Supabase surface; it does not modify
  it.
- **GCP migration** — Phase 0 makes the future swap a one-adapter change, but the
  migration itself is not performed here.
- **Mobile responsiveness** — desktop-only tool, unchanged.
- **UX improvements / redesign** — visual and interaction parity only, plus
  obvious defect fixes. No new product surfaces beyond legacy parity.

## Capabilities

### New Capabilities

- `data-access-layer` — repository/port interfaces (hexagonal ports-and-adapters)
  plus a `SupabaseAdapter` that implements them. This becomes the seam through
  which a future GCP adapter is introduced without touching stores or UI.

### Modified Capabilities

These specs were reconciled to delivered reality during the base archive and
explicitly marked deferred items for this change. They will be modified in the
spec phase to **re-add** the deferred requirements:

- `frontend-architecture` — re-add live data wiring deferred from:
  - **FR-002 Dashboard Cobradora** — live KPI RPC wiring, mora-sortable table.
  - **FR-003 Dashboard Jefatura** — cobradora filtering, aggregate KPI wiring,
    productivity grid per cobradora, live cartera/sidebar data.
  - **FR-004 ClienteModal** — queue advancement after submit ("Guardar y
    siguiente").
  - **FR-006 Cola de Gestión** — re-add the removed requirement: "Siguiente
    cliente" button, queue-advance behavior, and the colaStore UI wiring.
- `design-system` — re-add deferred interaction items where they intersect parity
  (e.g. keyboard shortcut N for next client, table row state styling). Full
  accessibility-audit and E2E-coverage NFR items remain tracked separately and
  are addressed only where a slice touches them.

> The exact requirement text, scenarios, and ADDED/MODIFIED deltas are produced
> in the spec phase. This proposal only declares intent and scope.

## Approach

**Strangler-safe, always-working.** Phase 0 lands the port layer behind the
existing behavior (no UI change), then each slice migrates one feature area onto
the ports while delivering visible parity. Every slice is an independently
reviewable PR targeted at < 400 changed lines.

### Phase 0 — Data-access keystone (must come first)

1. Define repository port interfaces per domain area (clientes, cobradoras,
   resumen/KPI, cola, pagos/recaudación, cargas, gestiones).
2. Implement `SupabaseAdapter` mapping each port method to the existing
   `.from()` / `.rpc()` calls. **No RPC or table changes.**
3. Migrate the currently-coupled units (`authStore`, `carteraStore`,
   `resumenStore`, `colaStore`, `ClienteModal`, `CargaModal`) to depend on ports
   instead of importing `supabase` directly.
4. Keep `src/lib/supabase.ts` as the adapter's single SDK entry point.

The complete Supabase surface below is the **de-facto API contract** the ports
encode. Treating it as a contract is what makes the future **GCP endpoint
contract** a drop-in adapter rather than a rewrite.

### Slices A–G (one PR each, built on the ports)

| Slice | Parity feature(s) | Primary surface |
|-------|-------------------|-----------------|
| A — Work queue | "Siguiente cliente" + "Guardar y siguiente" + "Saltar" + cola-mode indicator; WSP button MUST auto-register a gestión (legacy does; React only opens `wa.me`) | colaStore, ClienteModal, `cascada_siguiente_cliente`, `cascada_registrar_gestion` |
| B — Live sidebar | ATENCIÓN PRIORITARIA 5 clickable buckets wired to table filter; CARTERAS list wired (replace placeholder); ÚLTIMA CARGA timestamp + count | Sidebar, carteraStore, `cascada_cargas_hist` |
| C — Live KPIs | KPI progress bars + card drilldown (segments: críticas / urgentes / promesas) | KPIGrid, resumenStore, `cascada_kpi_gestionados`, `cascada_desglose_segmento` |
| D — Productivity | "Productividad del equipo" daily + monthly per cobradora; inline meta edit with `permanente` flag; per-cobradora desglose on card click | DashboardJefatura, `cascada_setear_meta`, `cascada_resumen_gestiones` |
| E — Payments & collections | Carga de pagos modal; Recaudación dashboard with XLSX export | new modal/view, `cascada_carga_pagos`, `cascada_recaudacion_cobradora`, `cascada_historial_pagos`, `cascada_cuotas_pagadas` |
| F — Exports & Sayorana | Exportar gestiones by date range (ERP-format XLSX); Exportar vista actual (client-side XLSX); Aplicar Sayorana | export utils, `cascada_gestiones_rango`, `cascada_aplicar_sayorana` |
| G — Table polish | mora column sortable; Cobradora column in jefatura view; no-gestionable row class for pool/sayorana | ClienteTable |

### Fold-in Fixes (parity + obvious fixes)

Folded into the slice that touches the same surface, not delivered separately:

- **`p_rut` missing** — `cascada_registrar_gestion` in `ClienteModal.tsx` omits
  the `p_rut` param that legacy passes. Fix within Slice A.
- **CargaModal COL_MAP incomplete** — maps only 13 of legacy's 23 columns.
  Missing: `tipoing_mov`, `nomtip_mov`, `valor_con`, `refere_mov`, `fecha_ges`,
  `accion_acc`, `efecto_efe`, `nota_ges`, `fecprox_ges`, `nombre_ven`, `abogado`,
  `procurador`. These carry ERP history consumed by the gestiones export. Fix
  alongside Slice F (export) or Slice E, wherever carga history is touched.
- **Carry-forward WARNINGs from base verify:** React Compiler
  (`babel-plugin-react-compiler`) not configured in `vite.config.ts`;
  `import * as React` in `src/components/ui/*.tsx`; submit button label
  "Registrar gestion" vs spec "Solo guardar". Fold into the most relevant slice.

### Supabase surface (de-facto API contract → future GCP endpoint contract)

- **Tables / views (7):** `cascada_clientes`, `cascada_cobradoras`,
  `cascada_resumen_dia`, `cascada_cargas_hist`, `cascada_recaudacion_cobradora`,
  `cascada_historial_pagos`, `cascada_cuotas_pagadas`.
- **RPCs (11):** `cascada_mi_perfil`, `cascada_kpi_gestionados`,
  `cascada_siguiente_cliente`, `cascada_registrar_gestion`,
  `cascada_carga_mensual`, `cascada_carga_pagos`, `cascada_gestiones_rango`,
  `cascada_desglose_segmento`, `cascada_resumen_gestiones`,
  `cascada_setear_meta`, `cascada_aplicar_sayorana`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/` (new ports + adapter) | New | Repository port interfaces + `SupabaseAdapter` |
| `src/stores/*.ts` | Modified | Depend on ports instead of importing `supabase` directly |
| `src/components/ClienteModal.tsx` | Modified | Queue advance, WSP auto-gestión, `p_rut` fix |
| `src/components/CargaModal.tsx` | Modified | Full 23-column COL_MAP |
| `src/components/Sidebar.tsx`, `KPIGrid.tsx`, `ClienteTable.tsx` | Modified | Live wiring, drilldown, sort, columns |
| `src/pages/DashboardJefatura.tsx` | Modified | Productivity grid, meta edit, recaudación entry |
| `src/components/` (new) | New | Carga de pagos modal, Recaudación view, export utilities |
| `vite.config.ts` | Modified | React Compiler plugin (carry-forward fix) |
| `openspec/specs/frontend-architecture/spec.md` | Modified | Re-add FR-002/003/004 wiring, FR-006 |
| `openspec/specs/design-system/spec.md` | Modified | Re-add deferred interaction items where slices touch them |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Port abstraction leaks SDK shapes (e.g. `PostgrestError`) into stores | Medium | Ports return domain types/Result, not raw SDK responses; adapter owns mapping |
| Phase 0 churns every store at once (>400 lines) | High | Treat Phase 0 as its own slice; if over budget, chain it per domain port |
| ERP-format XLSX export drifts from legacy expectations | Medium | Derive column order/format directly from legacy export + the 23-column COL_MAP |
| WSP auto-gestión double-registers vs manual save | Medium | Define single registration path in Slice A; cover with a store-level test |
| Live KPI/drilldown RPC shapes differ from assumptions | Medium | Confirm RPC return shapes against legacy calls during spec/design, not at apply |
| Parity scope creep into UX "improvements" | Medium | Fidelity contract is parity + obvious fixes only; defer anything else as out of scope |

## Rollback

- Each slice is an independently revertable PR; reverting one slice leaves the
  rest working (Strangler-safe).
- Phase 0 is behavior-preserving: reverting it restores direct Supabase calls
  without losing any feature, since no feature ships in Phase 0.
- No backend/RPC/RLS changes means rollback is purely frontend — no data
  migration to unwind.

## Success Criteria

Phase 0 keystone:

- [ ] No Zustand store or modal imports `@supabase/supabase-js` directly; all data
      access flows through repository ports.
- [ ] `SupabaseAdapter` is the only implementation; swapping it is the single
      integration point for a future GCP adapter.
- [ ] No user-visible behavior change from Phase 0; existing tests still pass.

17 parity features:

- [ ] A: "Siguiente cliente", "Guardar y siguiente", "Saltar", cola-mode
      indicator work; WSP button auto-registers a gestión.
- [ ] B: 5 ATENCIÓN PRIORITARIA buckets filter the table; CARTERAS list shows real
      data; ÚLTIMA CARGA shows timestamp + count.
- [ ] C: KPI progress bars render live; card drilldown shows
      críticas/urgentes/promesas.
- [ ] D: Productividad del equipo (daily + monthly per cobradora); inline meta edit
      with `permanente` flag; per-cobradora desglose on card click.
- [ ] E: Carga de pagos modal works; Recaudación dashboard renders with XLSX
      export.
- [ ] F: Exportar gestiones by date range (ERP-format XLSX); Exportar vista actual
      (client-side XLSX); Aplicar Sayorana works.
- [ ] G: mora column sortable; Cobradora column shown in jefatura view;
      no-gestionable rows styled for pool/sayorana.

Fold-in fixes:

- [ ] `cascada_registrar_gestion` includes `p_rut`.
- [ ] CargaModal COL_MAP maps all 23 legacy columns.
- [ ] React Compiler configured; `import * as React` removed from `ui/*.tsx`;
      submit label reconciled with spec.

## Delivery Note

This is a large change (~7 slices + Phase 0 keystone, well beyond a single
400-line PR). Cached `delivery_strategy` is **ask-on-risk**: the tasks phase will
forecast review workload and, on high budget risk, stop to confirm the split.
**Chain strategy is to be confirmed at the tasks phase** (`stacked-to-main` vs
`feature-branch-chain`); Phase 0 likely lands first as its own PR, with slices
A–G chained after it.

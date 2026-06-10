# Design: React Feature Parity with Legacy Cobranza App

This document defines the **architecture** for closing the parity gap. The
headline decision is a **ports-and-adapters (hexagonal) data-access layer**
landed first (Phase 0), behind unchanged behavior, so the 17 parity features and
the future GCP migration are built against stable port interfaces instead of a
hard `@supabase/supabase-js` dependency.

> Scope of this doc: the HOW at architectural level — boundaries, port contracts,
> injection seam, per-slice store/component changes, and the four flagged risks.
> It does NOT contain spec requirements (parallel phase) or the task breakdown
> (later phase). It does NOT modify source code.

---

## Source-of-truth gap — RESOLVED (was the gate for Risk 2 and Risk 3)

`legacy-index.html` loads its entire behavior from `./app.js?v=37`
(`legacy-index.html:1403`). **`app.js` (2185 lines) has been RECOVERED from git
history to `legacy-reference/app.js`** and is now the authoritative parity
reference. Every RPC argument list, every return shape, the full ERP column map,
the payment-loading formats, the export format, and the WSP auto-registration
handler have been read directly from it.

Consequence (post-recovery):

- All 12 RPCs and 7 tables/views below are now **VERIFIED** against the legacy
  source (exact args, return keys, and columns selected). See updated tables in
  Risk 2.
- The ERP import column map is **25 columns** (`COL_MAP`,
  `legacy-reference/app.js:1461-1487`) — not 13/23. The export is a **separate**
  13-column `Gestiones_Masivas` format. See Risk 3 for the full reconciliation.
- The WSP handler **auto-registers a gestión** and legacy **does NOT** guard
  against double-registration with the manual save. See Risk 4 — this changes
  the spec constraint from "verified parity" to "product decision".

The config-driven contract boundary (ports + typed mappers) still stands: the
only place the verified shapes live is the adapter mappers and the typed
constants. Stores and UI consume domain types only.

---

## Architecture at a glance

```
            React components / hooks
                     │  (call store actions only)
                     ▼
        Zustand stores  (auth, cartera, resumen, cola,
                         gestion, productividad, pagos, recaudacion)
                     │  import { repositories } from "@/lib/repositories"
                     ▼
        Repository PORTS  (src/lib/ports/*.ts — pure TS interfaces, domain types)
                     │  implemented by exactly one adapter today
                     ▼
        SupabaseAdapter  (src/lib/adapters/supabase/* — owns ALL .from()/.rpc())
                     │
                     ▼
        src/lib/supabase.ts  (the only createClient entry point)
```

The future GCP migration replaces **one box** (`SupabaseAdapter`) with a
`GcpAdapter` implementing the same ports. Stores and UI do not change. That is
the entire point of Phase 0.

### Target file layout

```
src/lib/
  supabase.ts                 # unchanged: single SDK client
  errors.ts                   # RepositoryError (new)
  ports/
    auth.port.ts              # AuthRepository
    cartera.port.ts           # CarteraRepository
    resumen.port.ts           # ResumenRepository
    cola.port.ts              # ColaRepository
    gestion.port.ts           # GestionRepository
    carga.port.ts             # CargaRepository
    recaudacion.port.ts       # RecaudacionRepository
    index.ts                  # re-exports port types + Repositories aggregate
  adapters/supabase/
    supabaseAuthRepository.ts
    supabaseCarteraRepository.ts
    ... one file per port ...
    index.ts                  # SupabaseAdapter: assembles all repos
  repositories.ts             # module-singleton registry (the injection seam)
  export/                     # Slice F: pure XLSX builders (erpColumns.ts, etc.)
```

---

## Key architecture decisions (ADRs)

### ADR-1 — Hexagonal ports-and-adapters for data access

**Decision.** Define one repository **port** (pure TS interface, domain types
only) per domain area. Implement them with a single `SupabaseAdapter`. Stores
depend on the ports, never on the SDK.

**Why.** The proposal's explicit goal is a one-adapter swap for GCP. Today every
store and two modals `import { supabase }` directly (`authStore.ts:4`,
`carteraStore.ts:3`, `resumenStore.ts:3`, `colaStore.ts:3`,
`ClienteModal.tsx:20`, `CargaModal.tsx:5`). That coupling would harden across 7
new feature areas. Ports invert the dependency so the SDK becomes a detail.

**Rejected.** Keep direct SDK calls and "abstract later" — rejected because each
parity slice would add more coupling, making the eventual migration a rewrite
rather than an adapter swap (proposal "Why now").

### ADR-2 — Injection seam: module-singleton registry (not Context, not factory)

**Decision.** `src/lib/repositories.ts` instantiates `SupabaseAdapter` once and
exports a frozen `repositories` aggregate. Stores do
`import { repositories } from "@/lib/repositories"`. A test-only
`__setRepositories(stub)` seam allows overriding in unit tests.

```ts
// src/lib/repositories.ts (shape)
import { SupabaseAdapter } from "@/lib/adapters/supabase"
import type { Repositories } from "@/lib/ports"

let current: Repositories = new SupabaseAdapter()
export const repositories: Repositories = new Proxy({} as Repositories, {
  get: (_t, key) => current[key as keyof Repositories],
})
// test-only
export function __setRepositories(next: Repositories) { current = next }
```

**Why this over the alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **Module singleton (chosen)** | ✅ | Zustand stores live OUTSIDE React; they are themselves module singletons. Lowest churn — mirrors how `supabase` is imported today. Tests already mock the `@/lib/supabase` module (`authStore.test.ts`, `carteraStore.test.ts`); they switch to mocking `@/lib/repositories` with the same `vi.mock` ergonomics. |
| React Context provider | ❌ | A store created by `create()` cannot read React context. The data consumers are the stores, not components, so Context cannot reach them without a major rearchitecture. |
| Factory `createXStore(deps)` | ❌ | Most "pure" DI, but breaks the `useCarteraStore()` singleton pattern used across every component/hook and churns dozens of call sites — violates the behavior-preserving, reviewable Phase 0 constraint. |

The `Proxy` indirection keeps the export reference stable while allowing
`__setRepositories` to swap the live implementation per test without
module-cache gymnastics.

### ADR-3 — Ports return domain types or throw `RepositoryError` (no SDK leakage)

**Decision.** Ports never return `{ data, error }` or `PostgrestError`. The
adapter unwraps every Supabase response: on `error`, it throws a typed
`RepositoryError(message, code?)`; otherwise it returns mapped domain types
(`Cliente`, `Perfil`, `ResumenCobradora`, etc.). Stores keep their existing
`try/catch → set({ error })` pattern unchanged.

**Why.** Directly addresses the "port abstraction leaks SDK shapes" risk. If a
`PostgrestError` reached a store, the GCP adapter would be forced to fake
Supabase error objects. A neutral `RepositoryError` is reproducible by any
backend.

```ts
// src/lib/errors.ts
export class RepositoryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = "RepositoryError"
  }
}
```

### ADR-4 — Phase 0 sub-split into 3 behavior-preserving sub-PRs

Phase 0 touches 6 units at once and will exceed the 400-line budget. Split by
domain so each sub-PR is independently reviewable and revertable. No
user-visible behavior changes in any of them.

| Sub-PR | Adds | Migrates off direct SDK | Est. surface |
|--------|------|--------------------------|--------------|
| **0.1 Foundation + Auth/Cartera** | `errors.ts`, `ports/*` (all interfaces), `repositories.ts`, `SupabaseAdapter` skeleton, `AuthRepository` + `CarteraRepository` impls | `authStore`, `carteraStore` | ~300–380 |
| **0.2 Resumen/Cola** | `ResumenRepository` + `ColaRepository` impls | `resumenStore`, `colaStore` | ~200–280 |
| **0.3 Gestion/Carga** | `GestionRepository` + `CargaRepository` impls | `ClienteModal`, `CargaModal` | ~200–280 |

Defining ALL port interfaces in 0.1 (even those bodies land later) keeps the
contract stable so slices can be planned against it immediately. `Recaudacion`
and the Slice-specific RPC methods are declared as interface members in 0.1 but
implemented in their slice (E/F) to avoid dead code — see "deferred members"
note in each port.

---

## Port contracts (interfaces)

Domain types reuse `src/types/index.ts` (`Cliente`, `Perfil`, `ResumenDia`,
`Gestion`, `Regla`, etc.). New domain types introduced by parity slices are
added there in the owning slice.

```ts
// auth.port.ts
export interface AuthRepository {
  signIn(email: string, password: string): Promise<AuthSession>      // auth.signInWithPassword
  signOut(): Promise<void>                                           // auth.signOut
  onAuthChange(cb: (e: AuthEventKind, userId: string | null) => void): () => void
  getPerfil(): Promise<Perfil | null>                                // rpc cascada_mi_perfil
}

// cartera.port.ts
export interface CarteraRepository {
  listClientes(params?: ListClientesParams): Promise<Cliente[]>      // from cascada_clientes
}
export interface ListClientesParams { cobradoraId?: string }

// resumen.port.ts
export interface ResumenRepository {
  getResumenDia(): Promise<ResumenCobradora[]>                       // view cascada_resumen_dia
  // Slice C (deferred body):
  getKpiGestionados(): Promise<KpiGestionados>                       // rpc cascada_kpi_gestionados — NO args
  getDesgloseSegmento(segmento: SegmentoKind, fecha: string): Promise<DesgloseGestiones> // rpc cascada_desglose_segmento → single object
  // Slice D (deferred body):
  getResumenGestiones(cobradoraId: string, fecha: string): Promise<DesgloseGestiones> // rpc cascada_resumen_gestiones — SAME shape as desglose
  setearMeta(p: SetearMetaParams): Promise<void>                     // rpc cascada_setear_meta
}
// Verified shapes (single objects, NOT arrays):
//   KpiGestionados { criticas_gest, criticas_pct, urgentes_gest, urgentes_pct, promesas_gest, promesas_pct }
//   DesgloseGestiones { total: number; por_efecto: Record<string,number>; por_tipo: Record<string,number> }
//   SegmentoKind = "criticas" | "urgentes" | "promesas"
//   SetearMetaParams { cobradoraId; meta; fecha; aplicarPermanente: boolean; motivo: string | null }

// cola.port.ts
export interface ColaRepository {
  siguienteCliente(): Promise<SiguienteResult>                       // rpc cascada_siguiente_cliente
  countPendientes(): Promise<number>                                 // from cascada_clientes (count)
}

// gestion.port.ts
export interface GestionRepository {
  registrarGestion(input: RegistrarGestionInput): Promise<void>      // rpc cascada_registrar_gestion (input.rut → p_rut)
  gestionesRango(desde: string, hasta: string): Promise<GestionExportRow[]> // rpc cascada_gestiones_rango (Slice F)
}
// GestionExportRow { id; fec_gestion; refere_erp; tipo; efecto; fec_proxima; nota; rut; nombre_cliente; cobradora; nro_contrato; nro_cuota; monto }
// RegistrarGestionInput { rut; cuotaId; tipo; efecto; nota: string | null; fecProxima: string | null }

// carga.port.ts
export interface CargaRepository {
  cargaMensual(registros: CargaRow[], nombreArchivo: string): Promise<CargaResult> // rpc cascada_carga_mensual → { nuevos, actualizados, gestiones_migradas }
  listCargasHist(): Promise<CargaHist[]>                             // from cascada_cargas_hist (Slice B) → { created_at, registros_procesados, registros_nuevos }
  cargaPagos(pagos: PagoRow[], nombreArchivo: string): Promise<CargaPagosResult> // rpc cascada_carga_pagos (Slice E)
  aplicarSayorana(): Promise<AplicarSayoranaResult>                  // rpc cascada_aplicar_sayorana → { movidos_al_pool }
}
// CargaPagosResult { cuotas_marcadas_pagadas; clientes_pagados; no_encontradas }
// AplicarSayoranaResult { movidos_al_pool: number }
// PagoRow is a UNION of 3 formats (erp_can | erp_mov | simple) — see Risk 3

// recaudacion.port.ts
export interface RecaudacionRepository {
  recaudacionCobradora(): Promise<RecaudacionRow[]>                  // view cascada_recaudacion_cobradora (Slice E) → { cobradora, cuotas_pagadas, clientes_pagaron, monto_pagado }
  historialPagos(): Promise<HistorialPagoRow[]>                      // view cascada_historial_pagos (limit 20) → { created_at, nombre_archivo, registros_archivo, cuotas_marcadas, subido_por }
  cuotasPagadas(): Promise<CuotaPagadaRow[]>                         // view cascada_cuotas_pagadas (limit 200) → { nombre, rut, nro_cuota, nro_total_cuotas, monto, cobradora, fec_vencimiento }
}

// index.ts
export interface Repositories {
  auth: AuthRepository
  cartera: CarteraRepository
  resumen: ResumenRepository
  cola: ColaRepository
  gestion: GestionRepository
  carga: CargaRepository
  recaudacion: RecaudacionRepository
}
```

> The proposal named 6 ports "e.g."; this design adds **RecaudacionRepository**
> as a 7th because pagos/recaudación reads (3 views) are a distinct domain from
> the carga RPC writes. This matches the proposal's own Phase-0 enumeration
> ("clientes, cobradoras, resumen/KPI, cola, pagos/recaudación, cargas,
> gestiones").

---

## RISK 2 — RPC / table contract verification

All contracts below are now **VERIFIED** against `legacy-reference/app.js`
(line refs are into that file). Args are the exact RPC parameter names; return
keys are exactly what the legacy code destructures.

### RPCs

| RPC | Args (exact) | Return (exact keys) | Status | Evidence (app.js) |
|-----|--------------|---------------------|--------|-------------------|
| `cascada_mi_perfil` | none | `Perfil { id, nombre, rol, meta_diaria, es_pool, email? }` | **VERIFIED** | `:92` |
| `cascada_registrar_gestion` | `p_rut, p_cuota_id, p_tipo, p_efecto, p_nota, p_fec_proxima` | result destructured but unused → treat as void/ok | **VERIFIED** | `:886-893` (WSP path), `:1326-1333` (manual save) — both pass `p_rut` |
| `cascada_carga_mensual` | `p_registros` (array of COL_MAP-mapped objects), `p_nombre_archivo` | `{ nuevos, actualizados, gestiones_migradas }` (numbers) | **VERIFIED** | `:1645-1650` |
| `cascada_siguiente_cliente` | none | `{ fin_cola: bool, mensaje: string }` when finished; else a **full client row** `{ rut, cuota_id, nombre, regla, dias_mora, monto, ... }` (same shape as a `cascada_clientes` row — used as fallback `c = data`) | **VERIFIED** | `:729-746` |
| `cascada_kpi_gestionados` | none | `{ criticas_gest, criticas_pct, urgentes_gest, urgentes_pct, promesas_gest, promesas_pct }` (all numbers; empty `{}` tolerated) | **VERIFIED** | `:218` (call), `:399-404` (consumed) |
| `cascada_desglose_segmento` | `p_segmento` (`"criticas" \| "urgentes" \| "promesas"`), `p_fecha` (`YYYY-MM-DD`) | `{ total: number, por_efecto: Record<string,number>, por_tipo: Record<string,number> }` | **VERIFIED** | `:586-594` |
| `cascada_resumen_gestiones` | `p_cobradora_id` (string), `p_fecha` (`YYYY-MM-DD`) | `{ total, por_efecto, por_tipo }` — **identical shape to `cascada_desglose_segmento`** | **VERIFIED** | `:655-663` |
| `cascada_setear_meta` | `p_cobradora_id` (string), `p_meta` (number), `p_fecha` (`YYYY-MM-DD`), `p_aplicar_permanente` (bool), `p_motivo` (string \| null) | result destructured but unused → void/ok | **VERIFIED** | `:935-941` |
| `cascada_carga_pagos` | `p_pagos` (array — shape depends on detected format, see Risk 3), `p_nombre_archivo` | `{ cuotas_marcadas_pagadas, clientes_pagados, no_encontradas }` (numbers) | **VERIFIED** | `:2014-2019` |
| `cascada_gestiones_rango` | `p_fecha_desde` (`YYYY-MM-DD`), `p_fecha_hasta` (`YYYY-MM-DD`) | array of rows, each `{ id, fec_gestion, refere_erp, tipo, efecto, fec_proxima, nota, rut, nombre_cliente, cobradora, nro_contrato, nro_cuota, monto }` | **VERIFIED** | `:2081-2111` |
| `cascada_aplicar_sayorana` | none | `{ movidos_al_pool: number }` | **VERIFIED** | `:1667-1669` |

> Note on `cascada_siguiente_cliente`: legacy branches on `data.fin_cola`. When
> truthy it shows `data.mensaje` and stops; otherwise it treats the entire
> payload as a client row (`c = data` fallback). The port `SiguienteResult`
> must model this as a discriminated union on `fin_cola`.

### Tables / views

| Table/View | Columns actually read | Query | Status | Evidence (app.js) |
|------------|----------------------|-------|--------|-------------------|
| `cascada_cobradoras` | `id, nombre, meta_diaria, estado` | `.select('*').eq('estado','activa').order('meta_diaria')` | **VERIFIED** | `:103-107` |
| `cascada_clientes` | full `Cliente` (rut, cuota_id, nombre, regla, dias_mora, monto, nro_cuota, nro_total_cuotas, zona_critica, estado_gestion, estado_cuota, cobradora_id, celular, telefono, movil_efectivo, email, fec_vencimiento, fec_proxima, ultima_gestion_fecha, ultimo_efecto, ultima_gestion_nota) | `.select('*')`; jefatura adds `.eq('cobradora_id', …)`; count query filters `estado_cuota='vigente'`, `regla NOT IN (SAYORANA,PAGADO,R6)`, `estado_gestion NOT IN (gestionado_hoy,compromiso_vigente,verificacion_pendiente)` | **VERIFIED** | `:113-121`, `:758-763` |
| `cascada_resumen_dia` | `cobradora_id, cobradora_nombre, gestiones_hoy, gestiones_mes, meta_diaria, meta_mes_acumulada, meta_mes_total, cartera_total, monto_cartera, es_pool` | `.select('*')` | **VERIFIED** | `:142`, `:153-189` |
| `cascada_cargas_hist` | `created_at, registros_procesados, registros_nuevos` | `.select('*').limit(1)` | **VERIFIED** | `:194`, `:1149-1152` |
| `cascada_recaudacion_cobradora` | `cobradora, cuotas_pagadas, clientes_pagaron, monto_pagado` | `.select('*').order('monto_pagado',{ascending:false})` | **VERIFIED** | `:1691`, `:1748-1754` |
| `cascada_historial_pagos` | `created_at, nombre_archivo, registros_archivo, cuotas_marcadas, subido_por` | `.select('*').limit(20)` | **VERIFIED** | `:1692`, `:1788-1799` |
| `cascada_cuotas_pagadas` | `nombre, rut, nro_cuota, nro_total_cuotas, monto, cobradora, fec_vencimiento` | `.select('*').limit(200)` | **VERIFIED** | `:1693`, `:1822-1830` |

> Two distinct "history" views: `cascada_cargas_hist` = monthly cartera loads
> (used for ÚLTIMA CARGA badge, Slice B). `cascada_historial_pagos` = payment
> file loads (used in the Recaudación modal, Slice E). They are NOT the same
> table and have different columns.

**Mitigation retained:** every RPC/table is consumed ONLY through its port
method. If a future schema change shifts a shape, the only edits are the adapter
mapper + the return type — never the store or component.

---

## RISK 1 — Phase 0 keystone (the core)

Covered structurally above (ADR-1/2/3/4 + port contracts + file layout).
Migration mechanics per unit (behavior must be byte-for-byte equivalent):

| Unit | Today | After Phase 0 |
|------|-------|---------------|
| `authStore` | `supabase.auth.*`, `supabase.rpc('cascada_mi_perfil')` | `repositories.auth.signIn/signOut/onAuthChange/getPerfil`. The `onAuthStateChange` listener maps SDK events → `AuthEventKind` inside the adapter; store keeps the same SIGNED_IN/OUT/INITIAL_SESSION branching via neutral event kinds. |
| `carteraStore` | `supabase.from('cascada_clientes')` + jefatura `.eq('cobradora_id', …)` | `repositories.cartera.listClientes({ cobradoraId })`. Sorting (`zona_critica`→`RULE_PRIORITY`→`dias_mora`) stays in the store (domain logic, not data access). |
| `resumenStore` | `supabase.from('cascada_resumen_dia')` | `repositories.resumen.getResumenDia()`. Aggregation/selection logic stays in store. |
| `colaStore` | `rpc('cascada_siguiente_cliente')` + `from('cascada_clientes').count` | `repositories.cola.siguienteCliente()` + `repositories.cola.countPendientes()`. |
| `ClienteModal` | `rpc('cascada_registrar_gestion')` | `repositories.gestion.registrarGestion(input)` (via gestion action — see Risk 4). |
| `CargaModal` | `rpc('cascada_carga_mensual')` | `repositories.carga.cargaMensual(rows, name)`. |

**Test continuity:** `authStore.test.ts` and `carteraStore.test.ts` currently
`vi.mock('@/lib/supabase')`. They migrate to
`vi.mock('@/lib/repositories')` (or use `__setRepositories`). This is part of
sub-PR 0.1/0.2 and is what proves "no behavior change" (success criterion).

---

## RISK 3 — ERP columns — RESOLVED (import map ≠ export format)

The original "13 vs 23 vs 25" confusion came from conflating **two different ERP
file formats**. Reading `app.js` resolves it: import and export are NOT
symmetric and must NOT share one descriptor.

### Reconciliation (authoritative)

**(A) Carga-mensual IMPORT map — `COL_MAP`, 25 columns**
(`legacy-reference/app.js:1461-1487`). Maps ERP *cartera* headers → internal
field names. The current React `CargaModal` only mapped 13 of these; the other
12 (the gestión-history block) were dropped. Authoritative full set, in legacy
order:

| # | ERP header | internal field | # | ERP header | internal field |
|---|------------|----------------|---|------------|----------------|
| 1 | `rutcli_mov` | `rut` | 14 | `telefono` | `telefono` |
| 2 | `nomcli_mov` | `nombre` | 15 | `celular` | `celular` |
| 3 | `tipoing_mov` | `tipo_ingreso` | 16 | `email` | `email` |
| 4 | `nomtip_mov` | `nombre_tipo` | 17 | `refere_mov` | `refere_mov` |
| 5 | `fecven_mov` | `fec_vencimiento` | 18 | `fecha_ges` | `fecha_ges` |
| 6 | `nrodoc_mov` | `nro_cuota` | 19 | `accion_acc` | `accion_ges` |
| 7 | `monto_mov` | `monto` | 20 | `efecto_efe` | `efecto_ges` |
| 8 | `valor_con` | `valor_contrato` | 21 | `nota_ges` | `nota_ges` |
| 9 | `nrodoc_con` | `nro_total_cuotas` | 22 | `fecprox_ges` | `fecprox_ges` |
| 10 | `folcon_mov` | `nro_contrato` | 23 | `nombre_ven` | `vendedor` |
| 11 | `cobrador_mov` | `cobrador_cod` | 24 | `abogado` | `abogado` |
| 12 | `nombre_cobmov` | `cobradora_nombre` | 25 | `procurador` | `procurador` |
| 13 | `descri_ubi` | `ubicacion` | | | |

Authoritative count = **25** (not 13, not 23). The import ERP folio field is
`refere_mov` (kept identically named internally). Date fields parsed via
`parseDateFlex`: `fec_vencimiento`, `fecha_ges`, `fecprox_ges`. String-forced
fields: `rut`, `nro_contrato`, `telefono`, `celular`. Rows without `rut` are
filtered out.

**(B) Gestiones EXPORT format — `Gestiones_Masivas`, 13 output columns**
(`legacy-reference/app.js:2097-2111`). Built from `cascada_gestiones_rango`
rows, NOT from `COL_MAP`. Output headers in order: `fecha`, `referencia`,
`acciontxt`, `efectotxt`, `proxges`, `obstxt`, `contactado`, `rut`, `nombre`,
`cobradora`, `nro_contrato`, `nro_cuota`, `monto`. Transform rules:

- `referencia` = `g.refere_erp || g.id` (ERP folio if present, else internal id).
  **The export field is `refere_erp` — this is the RPC return key, a different
  name from the import's `refere_mov`.** They are different layers, not a typo:
  import persists `refere_mov`; the RPC exposes it back as `refere_erp`.
- `acciontxt` = `TIPO_TO_ACCION[g.tipo]` (e.g. `whatsapp → "05 ENVIAR WSP"`).
- `efectotxt` = `EFECTO_TO_ERP[g.efecto]` (e.g. `no_contesta → "09 NO CONTESTA"`).
- `proxges` = `fec_proxima` or fallback `fec_gestion`, formatted `DD/MM/YYYY`.
- `obstxt` = `nota` truncated to 200 chars, upper-cased.
- `contactado` = `0` for `no_contesta|ocupado|no_corresponde_numero`, else `1`.

`TIPO_TO_ACCION` (`:2054-2059`) and `EFECTO_TO_ERP` (`:2039-2051`) are fixed
lookup constants — port them verbatim.

### Design — two distinct typed descriptors (NOT one shared list)

The original single-`ERP_COLUMNS` idea is **rejected** — it assumed import↔export
symmetry that does not exist. Instead, two constants in `src/lib/export/`:

```ts
// erpCargaColumns.ts — IMPORT (carga mensual)
interface ErpCargaColumn { erp: string; field: string; type: "string"|"number"|"date" }
export const ERP_CARGA_COLUMNS: readonly ErpCargaColumn[] // the 25 above, ordered

// gestionesExport.ts — EXPORT (Gestiones_Masivas)
export const TIPO_TO_ACCION: Record<string,string>   // verbatim from app.js:2054
export const EFECTO_TO_ERP: Record<string,string>    // verbatim from app.js:2039
export function toExportRow(g: GestionExportRow): Record<string,string|number>
// emits the 13 columns in order with the transforms above
```

- **Import (CargaModal fix / Slice E carga):** map over `ERP_CARGA_COLUMNS` so
  all 25 columns — including the 12 previously-dropped gestión-history fields —
  reach `cascada_carga_mensual` via `p_registros`.
- **Export (Slice F):** map `gestionesRango` rows through `toExportRow` and write
  the 13-column `Gestiones_Masivas_<timestamp>.xlsx`.

**Dependency:** the import fix is still a prerequisite for export fidelity — the
gestión-history fields (`refere_mov`, `fecha_ges`, etc.) must be persisted at
carga time so the RPC can return `refere_erp` on export. Sequence **E → F**.

This risk is now fully specified; nothing remains blocked.

---

## RISK 4 — WSP auto-gestión — legacy DOES double-register (product decision needed)

### Verified legacy behavior (`legacy-reference/app.js`)

The recovery overturns the original premise. Legacy has **two independent
registration paths** and **no idempotency guard between them**:

1. **WSP button** (`enviarWSP`, `:870-903`): opens `wa.me` with a per-regla
   template, then **auto-registers a gestión** via `cascada_registrar_gestion`
   with a FIXED payload: `p_tipo: "whatsapp"`, `p_efecto: "no_contesta"`,
   `p_nota: "WSP enviado: <first 180 chars of template>"`, `p_fec_proxima: null`.
   It optimistically sets the local row to `estado_gestion = "gestionado_hoy"`.
2. **Manual save** (`guardarGestion`, `:1299-1374`): registers a SEPARATE
   gestión with the user-selected `p_tipo`/`p_efecto`/`p_nota`/`p_fec_proxima`.

Nothing disables the save buttons after a WSP send, and there is no
"already registered" check. **A cobradora who clicks WSP and then fills the form
and clicks "Solo guardar" creates TWO gestiones** — by design: WSP logs the
outbound contact attempt (`no_contesta`), the manual save logs the conversation
outcome. They are semantically distinct events in the legacy model.

### Consequence for the spec

The earlier "both paths must funnel through ONE call and cannot
double-register" constraint **contradicts legacy parity**. A single-funnel
idempotency guard would be a deliberate **behavior change**, not parity.

This is a **product decision**, not a contract unknown:

- **Option A — replicate legacy (true parity):** WSP and manual save remain two
  independent registrations. No guard. The only fold-in is `p_rut` on both
  calls (React's `ClienteModal.tsx:148` currently omits it).
- **Option B — intentional improvement:** collapse to one registration with the
  `GestionGuard` design previously sketched. This DEVIATES from legacy and must
  be called out as a behavior change in the spec, with explicit sign-off.

The architecture supports both: both paths call
`repositories.gestion.registrarGestion(input)`. Whether a guard sits in front is
a one-line policy decision in the store action, isolated from the port.

### Design — keep both paths through the port; defer the policy to the spec

```
WSP button  ─► registrarGestion({ tipo:"whatsapp", efecto:"no_contesta", nota, fecProxima:null }) ─► wa.me
Solo guardar ─► registrarGestion({ tipo, efecto, nota, fecProxima })
+ Siguiente  ─► registrarGestion({ ... }) then advance cola
Saltar       ─► no registration
```

- **`p_rut` fold-in (both paths):** `RegistrarGestionInput` carries `rut` so the
  adapter always sends `p_rut`, matching legacy `:887` and `:1327`. This closes
  the React gap regardless of which option the spec picks.
- **WSP default payload** is fixed per legacy: `tipo="whatsapp"`,
  `efecto="no_contesta"`, nota prefixed `"WSP enviado: "`.
- **If the spec chooses Option B**, add the `GestionGuard`
  (`{ gestionRegistrada, registrationInFlight, registeredCuotaId }`, reset on
  modal open per `cuota_id`) in the cola/gestion store action — the guard logic
  is unchanged from the prior sketch, but it is now an OPT-IN behavior change,
  not the default.

**Recommended default: Option A** (parity) unless the product owner explicitly
wants the dedupe. The spec phase MUST resolve this; the design no longer assumes
"no double-register".

---

## Per-slice store & component plan (built on the ports)

| Slice | Store changes | New / modified components |
|-------|---------------|---------------------------|
| **A — Work queue** | `colaStore`: wire `siguienteCliente` to real advancement + cola-mode flag; `submitGestion` calls the port (WSP single-vs-double policy per Risk 4 spec decision — default parity = no guard) | `ClienteModal`: multi-button row (Solo guardar / Guardar y siguiente / Saltar), cola-mode indicator, WSP auto-register (fixed `whatsapp`/`no_contesta` payload); `p_rut` fix on both paths |
| **B — Live sidebar** | `carteraStore`: 5 priority-bucket selectors + bucket→table filter; `carga`: `listCargasHist` for última carga | `Sidebar`: ATENCIÓN PRIORITARIA buckets (clickable), CARTERAS list (replace placeholder), ÚLTIMA CARGA timestamp+count |
| **C — Live KPIs** | `resumenStore` (or new `kpiStore`): `getKpiGestionados` + `getDesgloseSegmento` | `KPIGrid`: progress bars + card drilldown (críticas/urgentes/promesas) |
| **D — Productivity** | new `productividadStore` (or extend resumen): `getResumenGestiones` + `setearMeta` | `DashboardJefatura`: ProductividadGrid (`prod-card`), `MetaModal` (permanente flag + motivo), `DesgloseModal` per cobradora |
| **E — Payments** | new `pagosStore` + `recaudacionStore` | `PagosModal` (mirrors CargaModal pattern, `cargaPagos`), `RecaudacionView/Modal` + XLSX export |
| **F — Exports & Sayorana** | `gestion`: `gestionesRango`; `carga`: `aplicarSayorana` | `GestionesExportModal` (date range), export utils (`src/lib/export/*`), "Exportar vista actual" client-side XLSX |
| **G — Table polish** | `carteraStore` already has `sortMora` + filters — wiring only | `ClienteTable`: sortable mora header, Cobradora column (jefatura), no-gestionable row class for pool/sayorana |

New components confirmed against legacy modals: PagosModal
(`#pagos-modal`), RecaudacionView (`#recaudacion-modal`), MetaModal
(`#meta-modal`), DesgloseModal (`#desglose-modal`), GestionesExportModal
(`#gestiones-modal`), ProductividadGrid (`#productividad` + `.prod-card`).

### ATENCIÓN PRIORITARIA buckets — VERIFIED source & definitions (Slice B)

The 5 buckets are computed **100% client-side** from `state.data` (the
`cascada_clientes` array already in `carteraStore`), NOT from any RPC, not from
`cascada_resumen_dia`, and not from `cascada_desglose_segmento`
(`legacy-reference/app.js:269-311`). They render only for jefatura. Exact
predicates and filter keys:

| Label | Predicate over a cliente row | Filter key / type |
|-------|------------------------------|-------------------|
| Vence hoy | `zona_critica === "CRIT_VENCE_HOY"` | `CRIT_VENCE_HOY` / `zona` |
| R5 · Al límite | `regla === "R5"` | `R5` / `regla` |
| Pre-bloqueo 30+d | `regla === "R2" && dias_mora >= 30` | `R2_BLOQUEO` / `regla` |
| Mora activa 15-29d | `regla === "R2" && dias_mora < 30` | `R2_MORA` / `regla` |
| R1 · Primer contacto | `regla === "R1"` | `R1` / `regla` |

Clicking a bucket toggles `filtroZona`/`filtroRegla` and resets `sortMora`
(`setFiltroPrioritario`, `:338-351`). Total = sum of the 5 counts. This confirms
the design's "5 priority-bucket selectors in `carteraStore`" — they are pure
derived selectors over already-loaded data; no new port method is needed.

CARTERAS list (`:280-292`) sums `cartera_total` per cobradora from
`resumenTodas` (`cascada_resumen_dia`). ÚLTIMA CARGA badge (`:1146-1153`) reads
`created_at`, `registros_procesados`, `registros_nuevos` from
`cascada_cargas_hist` (limit 1).

---

## Carry-forward warning fixes (fold into the most relevant slice)

| Fix | Action | Evidence |
|-----|--------|----------|
| **React Compiler not configured** | Add `babel-plugin-react-compiler` to devDependencies; configure in `vite.config.ts`: `react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } })`. Per react-19 skill, then NO manual `useMemo`/`useCallback` in new code. | `vite.config.ts:6` (`react()` no babel config); plugin absent from `package.json:34-50` |
| **`import * as React`** | Replace with named imports in `ui/label.tsx:3`, `ui/input.tsx:1`, `ui/select.tsx:1`, `ui/textarea.tsx:1` (e.g. `import { forwardRef, type ComponentProps } from "react"`). | Grep-confirmed, 4 files |
| **Submit label** | Reconcile `ClienteModal` "Registrar gestion" (`ClienteModal.tsx:502`) to spec/legacy "Solo guardar" + add "Guardar y siguiente" / "Saltar" buttons. Naturally absorbed by Slice A. | `legacy-index.html:1290-1292` |

> Tradeoff on React Compiler: it adds a Babel pass to the dev/build pipeline and
> changes optimization semantics. Mitigation: it lands in an isolated step with
> the existing test suite as the regression gate; existing components already
> avoid manual memoization, so risk is low.

---

## Architectural risks & assumptions

Resolved by the `app.js` recovery (no longer risks): all 12 RPC arg/return
shapes, all 7 table/view column sets, the ERP import map (25 cols), the export
format (13 cols), the `refere_mov`/`refere_erp` naming, and the
`cascada_siguiente_cliente` shape — all VERIFIED above.

Genuine remaining items:

- **WSP double-registration is a PRODUCT decision, not a contract unknown
  (highest):** legacy registers two separate gestiones (WSP auto + manual save).
  The spec must choose Option A (parity, recommended) or Option B (dedupe guard,
  a deliberate behavior change). Until decided, Slice A's `submitGestion` policy
  is open. The port and both call paths are settled regardless.
- **DB-side semantics not observable from the client:** `app.js` reveals args,
  return keys, and read columns, but NOT server-side behavior of the RPCs
  (e.g. how `cascada_carga_pagos` matches cuotas across the 3 formats, what
  `cascada_aplicar_sayorana` mutates, idempotency of `cascada_carga_mensual`).
  Treated as black boxes behind ports; validate against a live DB or schema dump
  before relying on edge behavior. Not a blocker for client implementation.
- **`por_efecto` / `por_tipo` key domains:** the desglose/resumen RPCs return
  open `Record<string,number>` maps; legacy renders them through
  `EFECTO_LABELS`/`TIPO_LABELS` lookups with raw-key fallback. New keys from the
  backend degrade gracefully (shown raw) — acceptable, mirrors legacy.
- **Assumption:** stores remain the home of domain logic (sorting, filtering,
  aggregation, KPI math, the 5 priority buckets); ports do data access only. If a
  future GCP backend moves aggregation server-side, those store methods become
  thin — acceptable and non-breaking.
- **Assumption:** `__setRepositories` test seam is acceptable vs pure `vi.mock`;
  if the team prefers module mocks only, drop the seam — no architectural impact.

## Design status: COMPLETE

No blocking contract unknowns remain. The single open item (WSP
single-vs-double registration) is a product decision delegated to the spec
phase; it does not block the architecture, the ports, or any other slice.

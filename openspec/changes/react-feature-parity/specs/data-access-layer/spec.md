# Delta Spec: Data Access Layer

## Capability: data-access-layer (NEW)

### Purpose

Defines the repository ports-and-adapters abstraction that decouples all Zustand
stores and React components from the Supabase SDK. Stores and components call typed
port interfaces; a `SupabaseAdapter` implements all ports. This is the Phase 0
keystone: it introduces the seam through which a future backend (e.g., GCP) can be
substituted by replacing only the adapter wiring, without touching stores, components,
or port interface definitions.

---

## Requirements

### Requirement: DAL-001 Repository Port Interfaces

The system MUST define typed repository port interfaces grouped by domain area
(clientes, cobradoras, resumen/KPI, cola, pagos/recaudación, cargas, gestiones).
Port interfaces MUST collectively expose access to all 7 Supabase tables/views
(`cascada_clientes`, `cascada_cobradoras`, `cascada_resumen_dia`,
`cascada_cargas_hist`, `cascada_recaudacion_cobradora`, `cascada_historial_pagos`,
`cascada_cuotas_pagadas`) and all 11 RPCs (`cascada_mi_perfil`,
`cascada_kpi_gestionados`, `cascada_siguiente_cliente`,
`cascada_registrar_gestion`, `cascada_carga_mensual`, `cascada_carga_pagos`,
`cascada_gestiones_rango`, `cascada_desglose_segmento`,
`cascada_resumen_gestiones`, `cascada_setear_meta`, `cascada_aplicar_sayorana`).
Port methods MUST return domain-typed values; they MUST NOT expose raw Supabase SDK
types (e.g., `PostgrestError`, `PostgrestResponse`) in their signatures.

#### Scenario: Store resolves data through a port method

- GIVEN the application is initialized with a `SupabaseAdapter` bound to the port interfaces
- WHEN a Zustand store action calls a port method (e.g., `clientesPort.getClientes()`)
- THEN the port method is invoked and returns a domain-typed result
- AND no Zustand store contains a direct import of `@supabase/supabase-js` or `src/lib/supabase.ts`

#### Scenario: Full Supabase surface is reachable via ports

- GIVEN the port interfaces are fully implemented
- WHEN a developer enumerates all port method signatures
- THEN every table/view and every RPC listed in DAL-001 has at least one corresponding port method
- AND no Supabase table or RPC is accessible from application code outside of port methods

---

### Requirement: DAL-002 SupabaseAdapter Mapping

The `SupabaseAdapter` MUST implement all port interfaces defined in DAL-001.
Each port method in `SupabaseAdapter` MUST map to the corresponding Supabase
`supabase.from(table)` or `supabase.rpc(rpc_name, params)` call.
The adapter MUST be the sole consumer of `src/lib/supabase.ts`.
`src/lib/supabase.ts` MUST remain the single SDK entry point; the adapter MUST NOT
instantiate a second Supabase client elsewhere.
The adapter MUST translate raw Supabase responses into the domain types defined by
the port interfaces before returning them to callers.

#### Scenario: Adapter translates a port call to a Supabase RPC

- GIVEN the `SupabaseAdapter` is initialized with the Supabase client from `src/lib/supabase.ts`
- WHEN a store calls `resumenPort.getKpiGestionados(cobradoraId)` via the adapter
- THEN the adapter calls `supabase.rpc('cascada_kpi_gestionados', { p_cobradora_id: cobradoraId })`
- AND the adapter maps the raw Supabase response to the domain type defined by the port
- AND the raw `PostgrestResponse` is not exposed to the calling store

#### Scenario: Only one Supabase client instance exists at runtime

- GIVEN the application is running with multiple stores and components active
- WHEN all port calls are in flight simultaneously
- THEN all Supabase SDK calls originate from the single client exported by `src/lib/supabase.ts`
- AND no other module constructs a `createClient()` call

---

### Requirement: DAL-003 Backend-Swap Contract

Replacing the Supabase backend with a different data source MUST require modifying only
the adapter implementation binding — no store, component, or port interface definition
MUST need to change. A second adapter that satisfies all port interfaces MUST be
substitutable for `SupabaseAdapter` without changing any store or component.
There MUST be exactly one location in the codebase where the adapter is bound to the
port interfaces (the adapter wiring point); swapping backends MUST require changing
only that location.

#### Scenario: Hypothetical second adapter satisfies all port interfaces

- GIVEN a `MockAdapter` is implemented that satisfies all port interfaces with in-memory data
- WHEN the application wiring is changed to inject `MockAdapter` instead of `SupabaseAdapter`
- THEN all stores and components that consume the ports compile without errors
- AND the application functions correctly with `MockAdapter` providing responses
- AND no store or component references `SupabaseAdapter` or `@supabase/supabase-js` directly

#### Scenario: Single wiring point is sufficient for an adapter swap

- GIVEN the production application runs `SupabaseAdapter`
- WHEN a developer decides to substitute a different adapter
- THEN there is exactly one location in the codebase where the adapter is bound to port interfaces
- AND modifying that single location is sufficient to complete the swap without touching stores or components

---

### Requirement: DAL-004 Phase 0 Behavior Preservation

Phase 0 (introduction of the data-access layer) MUST NOT introduce any user-visible
behavior change. All screens, interactions, and data flows present before Phase 0
MUST continue to function identically after Phase 0 is applied. All existing tests
(unit and E2E) MUST pass without modification after Phase 0 is applied.

#### Scenario: All existing tests pass after Phase 0

- GIVEN Phase 0 has been applied (port interfaces defined, `SupabaseAdapter` implemented, stores migrated)
- WHEN the full Vitest suite runs (`npm test -- --run`)
- THEN all previously passing tests continue to pass
- AND no previously-passing test requires modification to pass

#### Scenario: No user-visible change introduced by Phase 0

- GIVEN Phase 0 has been applied
- WHEN a user logs in and uses all available application features
- THEN all screens, interactions, and data appear identical to the pre-Phase-0 state
- AND no new UI elements, changed labels, or altered behaviors are introduced by Phase 0 alone

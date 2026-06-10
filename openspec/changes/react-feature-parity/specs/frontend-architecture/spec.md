# Delta Spec: Frontend Architecture

## Purpose

This delta re-adds requirements deferred from the react-19-migration baseline and
adds new capabilities for full legacy parity. All requirement blocks below AMEND
`openspec/specs/frontend-architecture/spec.md`. Requirements not referenced here
remain unchanged.

Fidelity contract: the React application MUST be a faithful replica of
visible legacy behavior (`legacy-index.html` + `app.js`), incorporating only
clear defect fixes identified during porting. This is NOT a UX redesign and NOT a
bug-for-bug replica where the legacy itself was wrong.

---

## MODIFIED Requirements

### Requirement: FR-002 Dashboard Cobradora

(Previous baseline text is superseded. Removes "KPI values statically initialized"
and "mora-sort is deferred" limitations. Adds live KPI wiring, KPI card drilldown,
mora sort toggle, and no-gestionable row state.)

The system MUST display a personalized greeting with the user's first name. The
system MUST render a KPIGrid component with 3 cards (Urgentes hoy, Mi meta del día,
Mi meta del mes). KPI values MUST be loaded live from the `cascada_kpi_gestionados`
RPC on dashboard mount. Meta cards MUST display a progress bar reflecting actual
gestión count vs. target. Clicking a KPI card MUST open a drilldown panel showing
per-segment breakdowns (críticas, urgentes, promesas) loaded from the
`cascada_desglose_segmento` RPC. The system MUST display filter pills for each
rule (R1-R7, CRITICO) with client-side counts. The system MUST render a client
table with columns: #, Regla, Cliente, Mora, Cuota, Monto, Acción sugerida,
Última gestión. The Mora column header MUST be interactive: clicking it MUST toggle
sort between ascending and descending days of mora; the active direction MUST be
visually indicated (↑ / ↓) in the column header. Client table rows for clients not
manageable by the current cobradora (pool, sayorana, or pre-desistido status) MUST
receive the `no-gestionable` visual state (see DS-005).

#### Scenario: Dashboard loads with live KPI data

- GIVEN an authenticated cobradora
- WHEN the dashboard loads
- THEN the system calls `cascada_kpi_gestionados`
- AND KPIGrid renders 3 cards with the returned live values
- AND the meta cards render a progress bar scaled to actual/target ratio

#### Scenario: KPI card drilldown

- GIVEN the KPI cards are rendered with live data
- WHEN the user clicks a KPI card
- THEN the system calls `cascada_desglose_segmento` with the relevant segment context
- AND a drilldown panel displays breakdown counts for críticas, urgentes, and promesas segments

#### Scenario: Mora column sort ascending then descending

- GIVEN the client table is displayed with unsorted rows
- WHEN the user clicks the Mora column header
- THEN the table rows sort by ascending days of mora
- AND the header shows an ascending indicator (↑)
- WHEN the user clicks the Mora column header again
- THEN the table rows sort by descending days of mora
- AND the header shows a descending indicator (↓)

#### Scenario: No-gestionable row visual state

- GIVEN the client table contains a client with sayorana or pool status
- WHEN the table renders
- THEN that client's row receives the `no-gestionable` visual state (opacity 0.6, "· solo lectura" suffix on name)
- AND the row remains visible but visually de-emphasized

#### Scenario: Filter by rule

- GIVEN the dashboard is loaded
- WHEN the user clicks a filter pill
- THEN the table filters client-side to show only clients matching that rule
- AND the active pill is visually highlighted

#### Scenario: Open ClienteModal

- GIVEN the client table is displayed
- WHEN the user clicks a row
- THEN ClienteModal opens with that client's details

---

### Requirement: FR-003 Dashboard Jefatura

(Previous baseline text is superseded. Removes "placeholder UI only" limitation.
Adds live CARTERAS sidebar, ÚLTIMA CARGA section, productivity grid with inline meta
edit, per-cobradora desglose, and a Cobradora column in the client table.)

The system MUST display a 280px sidebar with three live data sections: CARTERAS,
ATENCIÓN PRIORITARIA (see FR-007), and ÚLTIMA CARGA. The CARTERAS section MUST render
the list of cobradoras with their current active client counts loaded from
`cascada_resumen_dia`. The ÚLTIMA CARGA section MUST display the timestamp and record
count of the most recent carga, loaded from `cascada_cargas_hist`. The system MUST
render a KPIGrid with 4 aggregate cards loaded from server data. The system MUST
render a "Productividad del equipo" section with per-cobradora productivity cards
showing daily gestión count, monthly gestión count, meta target, and a progress bar.
Productivity data MUST be loaded via `cascada_resumen_gestiones`. Each productivity
card MUST reflect one of three visual states based on progress vs. meta: `cumplida`,
`en-ruta`, or `atrasada` (see DS-006). Hovering a productivity card MUST reveal an
inline edit control (pencil icon or equivalent) for the meta target. Clicking that
control MUST open a meta edit modal. The meta edit modal MUST include: current meta
value display, new meta input field, a `permanente` checkbox, and an optional motivo
text field. When `permanente` is unchecked, submission MUST call `cascada_setear_meta`
with `permanente: false`, applying the change to the current day only. When
`permanente` is checked, submission MUST call `cascada_setear_meta` with
`permanente: true`, updating the cobradora's base daily target. Clicking the body of
a productivity card (not the edit control) MUST open a desglose panel showing that
cobradora's gestión breakdown for today, loaded from `cascada_resumen_gestiones`.
The client table in jefatura view MUST include a Cobradora column showing the
cobradora assigned to each client.

#### Scenario: Jefatura dashboard loads with live sidebar data

- GIVEN an authenticated jefatura user
- WHEN the dashboard loads
- THEN the system reads `cascada_resumen_dia` for sidebar data
- AND the CARTERAS section renders the real cobradora list with active client counts
- AND the ÚLTIMA CARGA section displays the timestamp and count from `cascada_cargas_hist`

#### Scenario: Productivity grid renders live data with visual states

- GIVEN the jefatura dashboard is loaded
- WHEN `cascada_resumen_gestiones` data is received
- THEN each cobradora's card shows daily count, monthly count, and a progress bar
- AND each card receives the visual state matching its progress ratio (cumplida / en-ruta / atrasada)

#### Scenario: Meta edit — today-only change

- GIVEN the jefatura user hovers a productivity card and clicks the edit control
- WHEN the meta edit modal opens and the user enters a new value with `permanente` unchecked
- AND clicks Guardar
- THEN the system calls `cascada_setear_meta` with `permanente: false`
- AND the productivity card refreshes with the updated today-only target

#### Scenario: Meta edit — permanent base change

- GIVEN the meta edit modal is open
- WHEN the user enters a new value and checks `permanente`
- AND clicks Guardar
- THEN the system calls `cascada_setear_meta` with `permanente: true`
- AND the cobradora's base daily target is permanently updated

#### Scenario: Per-cobradora desglose on card click

- GIVEN the productivity grid is rendered
- WHEN the user clicks the body of a cobradora's productivity card (not the edit control)
- THEN a desglose panel opens showing that cobradora's gestión breakdown for today
- AND the data is loaded from `cascada_resumen_gestiones` filtered to that cobradora

#### Scenario: Cobradora column present in jefatura table

- GIVEN an authenticated jefatura user
- WHEN the client table renders
- THEN a Cobradora column is present showing the assigned cobradora name for each client

---

### Requirement: FR-004 ClienteModal

(Previous baseline text is superseded. Removes "queue advancement deferred"
limitation. Adds "Guardar y siguiente" primary action, WSP auto-gestión that
replicates the legacy two-event registration (contact attempt + outcome),
`p_rut` parameter fix, and button label correction.)

The system MUST display client contact info, cuota details, and gestión history.
The system MUST provide a gestión form with tipo, efecto, fecha próxima, and nota
fields. The system MUST show WSP templates based on client rule. The gestión form
MUST provide two submit actions:

- **"Solo guardar"** (secondary): saves the gestión and closes the modal.
- **"Guardar y siguiente →"** (primary, visually prominent): saves the gestión; if
  the modal is in cola mode it MUST advance to the next client in the queue; if the
  modal is NOT in cola mode it MUST close after saving.

When the user clicks the WSP (WhatsApp) button, the system MUST open the `wa.me`
link with the template text AND register a "WSP enviado" gestión with tipo=whatsapp
(the contact-attempt event), replicating legacy behavior. This auto-registered
gestión is INDEPENDENT of any subsequent manual save: a later "Solo guardar" or
"Guardar y siguiente →" MUST register its own separate gestión (the outcome event).
The system MUST NOT introduce a dedup guard between the two — the contact attempt
and the outcome are distinct events by design, matching the legacy app.
Every call to `cascada_registrar_gestion` MUST include the `p_rut` parameter
containing the client's RUT value.

#### Scenario: Solo guardar closes the modal

- GIVEN ClienteModal is open
- WHEN the user fills the form and clicks "Solo guardar"
- THEN the system calls `cascada_registrar_gestion` with all fields including `p_rut`
- AND the modal closes
- AND a success toast appears

#### Scenario: Guardar y siguiente in non-cola mode closes the modal

- GIVEN ClienteModal is open and cola mode is NOT active
- WHEN the user fills the form and clicks "Guardar y siguiente →"
- THEN the system calls `cascada_registrar_gestion` including `p_rut`
- AND the modal closes
- AND a success toast appears

#### Scenario: Guardar y siguiente in cola mode advances to next client

- GIVEN ClienteModal is open in cola mode
- WHEN the user fills the form and clicks "Guardar y siguiente →"
- THEN the system calls `cascada_registrar_gestion` including `p_rut`
- AND the modal loads the next client from the queue (calls `cascada_siguiente_cliente`)
- AND the gestión form resets for the new client
- AND a success toast appears

#### Scenario: WSP button registers a contact-attempt gestión and opens wa.me

- GIVEN ClienteModal is open for a client whose rule maps to a WSP template
- WHEN the user clicks the WSP button
- THEN the system calls `cascada_registrar_gestion` with tipo=whatsapp and p_rut
  (the "WSP enviado" contact-attempt event)
- AND the system opens the `wa.me` link with the populated template text

#### Scenario: Manual save after WSP registers a separate outcome gestión (legacy parity)

- GIVEN the user has already clicked the WSP button for this client (one gestión registered)
- WHEN the user subsequently fills the form and clicks "Solo guardar" or "Guardar y siguiente →"
- THEN the system calls `cascada_registrar_gestion` a SECOND time with the outcome fields and p_rut
- AND both gestiones are persisted as distinct events (no dedup guard)

#### Scenario: p_rut is always present in registrar_gestion payload

- GIVEN ClienteModal is open for a client with RUT "12.345.678-9"
- WHEN a gestión is registered via any path (Solo guardar, Guardar y siguiente, WSP auto)
- THEN the `cascada_registrar_gestion` RPC payload includes `p_rut: "12345678-9"` (or
  the canonical format accepted by the RPC)

#### Scenario: Close modal without saving

- GIVEN ClienteModal is open
- WHEN the user clicks X, the backdrop, or presses Esc
- THEN the modal closes without calling `cascada_registrar_gestion`

---

### Requirement: FR-005 CargaModal (Jefatura)

(Previous baseline text is extended. Adds full 23-column COL_MAP fidelity.)

The system MUST display a dropzone for Excel upload. The system MUST preview the
first 5 rows before processing. The system MUST validate file format. The system
MUST show processing results and carga history. The ERP column mapping (COL_MAP)
used during XLSX parsing MUST cover all 23 ERP columns. The following 12 columns
MUST be added to the existing 13-column mapping: `tipoing_mov`, `nomtip_mov`,
`valor_con`, `refere_mov`, `fecha_ges`, `accion_acc`, `efecto_efe`, `nota_ges`,
`fecprox_ges`, `nombre_ven`, `abogado`, `procurador`. All 23 column values MUST be
forwarded to the `cascada_carga_mensual` RPC call so that ERP history is fully
preserved in the system and available for the gestiones export (FR-010).

#### Scenario: Upload valid file

- GIVEN jefatura has CargaModal open
- WHEN a valid .xlsx file is dropped
- THEN the system parses the file via SheetJS
- AND displays preview of first 5 rows
- AND enables the "Cargar" button

#### Scenario: Full 23-column fidelity on process

- GIVEN an ERP XLSX file containing all 23 columns is previewed
- WHEN the user clicks "Cargar N registros"
- THEN the system maps all 23 ERP columns through COL_MAP
- AND sends all 23 column values to `cascada_carga_mensual`
- AND shows a success toast with the record count
- AND closes the modal

---

## ADDED Requirements

### Requirement: FR-006 Cola de Gestión

(Re-added from baseline. colaStore shell exists; this requirement delivers the
UI, keyboard shortcut, and RPC wiring.)

The system MUST provide a prominent "Siguiente cliente" button in the sidebar,
visible to all authenticated users. Clicking the button MUST call
`cascada_siguiente_cliente` to retrieve the next client in the cobranza queue and
open ClienteModal in cola mode for the returned client. When ClienteModal is in
cola mode, the modal header MUST display a cola-mode indicator badge
("⏭ Modo cola") with a dedicated exit button (×). While in cola mode, the gestión
form MUST additionally display a "Saltar ⏩" button that advances to the next
client without registering a gestión. The keyboard shortcut N MUST trigger
"Siguiente cliente" when cola mode is active and no modal is currently open.
Closing the modal via the cola-mode indicator exit button (×) MUST deactivate cola
mode and MUST NOT load the next client.

#### Scenario: Start cola mode from sidebar

- GIVEN an authenticated user is on the dashboard
- WHEN the user clicks "Siguiente cliente"
- THEN the system calls `cascada_siguiente_cliente`
- AND ClienteModal opens for the returned client
- AND the cola-mode indicator badge is visible in the modal header

#### Scenario: Guardar y siguiente advances the queue

- GIVEN ClienteModal is open in cola mode
- WHEN the user submits the gestión form via "Guardar y siguiente →"
- THEN the gestión is registered via `cascada_registrar_gestion`
- AND the system calls `cascada_siguiente_cliente` for the next client
- AND the modal loads the next client (or closes with an empty-queue message if the queue is empty)

#### Scenario: Saltar skips current client without registering a gestión

- GIVEN ClienteModal is open in cola mode
- WHEN the user clicks "Saltar ⏩"
- THEN no `cascada_registrar_gestion` call is made for the current client
- AND the system calls `cascada_siguiente_cliente` for the next client
- AND the modal loads the next client (or closes if queue is empty)

#### Scenario: Exit cola mode via indicator badge

- GIVEN ClienteModal is open in cola mode
- WHEN the user clicks the × button within the cola-mode indicator badge
- THEN cola mode is deactivated
- AND the modal closes
- AND no further `cascada_siguiente_cliente` calls are triggered

#### Scenario: Keyboard shortcut N advances queue while modal is closed

- GIVEN the user has an active cola session and ClienteModal is closed
- WHEN the user presses the N key
- THEN the system calls `cascada_siguiente_cliente`
- AND ClienteModal opens for the returned client in cola mode

---

### Requirement: FR-007 Atención Prioritaria Sidebar

The sidebar MUST display an ATENCIÓN PRIORITARIA section with exactly 5 priority
attention buckets loaded from server data (sourced from `cascada_resumen_dia`).
Each bucket MUST render a colored priority dot, a label, and a client count.
Clicking a bucket MUST filter the client table to show only clients matching that
priority segment. The clicked bucket MUST receive the active visual state (see
DS-007). Clicking an already-active bucket MUST clear the filter and deactivate
all buckets. The section header MUST display the total count across all 5 buckets.

#### Scenario: Priority buckets load on dashboard

- GIVEN an authenticated user is on the jefatura dashboard
- WHEN sidebar data is loaded from `cascada_resumen_dia`
- THEN the ATENCIÓN PRIORITARIA section renders 5 priority buckets with counts
- AND the total count in the section header equals the sum of all bucket counts

#### Scenario: Click priority bucket filters the table

- GIVEN the ATENCIÓN PRIORITARIA section is rendered
- WHEN the user clicks a priority bucket
- THEN the client table filters to show only clients in that priority segment
- AND the clicked bucket receives the active visual state

#### Scenario: Click active bucket clears the filter

- GIVEN a priority bucket is active and the table is filtered to that segment
- WHEN the user clicks the same active bucket again
- THEN the filter is cleared and the full unfiltered client list is shown
- AND no bucket is in the active state

---

### Requirement: FR-008 Carga de Pagos

The system MUST provide a "Carga de pagos" modal accessible from the sidebar.
The modal MUST accept XLSX files via drag-and-drop or file picker. Accepted input
formats are: (a) the standard ERP XLSX filtered to paid records, or (b) a file with
columns `rut`, `nro_cuota`, `nro_contrato`. If only a `rut` column is present in the
file, the system MUST mark all active cuotas for each RUT as paid. The modal MUST
display an informational notice describing the accepted formats. On confirmation, the
system MUST call the `cascada_carga_pagos` RPC with the parsed payment data and
display the count of cuotas marked as paid in a success toast.

#### Scenario: Upload ERP pagos file and confirm

- GIVEN jefatura opens the Carga de pagos modal
- WHEN a valid XLSX file is dropped containing rut, nro_cuota, nro_contrato columns
- THEN the system parses and previews the records
- WHEN the user clicks "Confirmar pagos"
- THEN the system calls `cascada_carga_pagos` with the parsed data
- AND a success toast displays the count of cuotas marked as paid
- AND the modal closes

#### Scenario: File with only rut column marks all active cuotas

- GIVEN a XLSX file with only a `rut` column is dropped into the Carga de pagos modal
- WHEN the user confirms the upload
- THEN the system marks all active cuotas for each RUT as paid via `cascada_carga_pagos`

---

### Requirement: FR-009 Recaudación Dashboard

The system MUST provide a Recaudación view accessible from the sidebar (jefatura
only). The view MUST display: a 4-cell aggregate KPI header, a per-cobradora
breakdown table with a progress bar per row, and a payment history section.
Data MUST be loaded from `cascada_recaudacion_cobradora`, `cascada_historial_pagos`,
and `cascada_cuotas_pagadas`. All monetary values MUST use `--sage` token color and
JetBrains Mono font (DS-003, DS-008). The view MUST provide an "Exportar XLSX"
button that downloads the displayed recaudación data as an XLSX file.

#### Scenario: Render recaudación view with loaded data

- GIVEN an authenticated jefatura user
- WHEN the user opens the Recaudación view
- THEN the system loads data from `cascada_recaudacion_cobradora`,
  `cascada_historial_pagos`, and `cascada_cuotas_pagadas`
- AND renders 4 aggregate KPI cells in the header
- AND renders a per-cobradora breakdown table with a progress bar per row

#### Scenario: Export recaudación data to XLSX

- GIVEN the Recaudación view is open and data is fully loaded
- WHEN the user clicks "Exportar XLSX"
- THEN the system generates an XLSX file containing the displayed recaudación data
- AND the browser downloads the file

---

### Requirement: FR-010 Exportar Gestiones por Fecha

The system MUST provide an "Exportar gestiones" function accessible from the
sidebar. A modal MUST allow the user to select a date range (desde / hasta date
fields). On export, the system MUST call the `cascada_gestiones_rango` RPC with the
selected date range. The response MUST be serialized to an XLSX file in the ERP
"Gestiones_Masivas" format. The exported file MUST contain all columns produced by
`cascada_gestiones_rango` in the correct ERP column order. A date range selection
MUST be required; exporting without both dates selected MUST be prevented with a
validation message. The modal MUST display an informational notice clarifying that
only gestiones registered in Cascada are included (not ERP historical records).

#### Scenario: Export gestiones for a date range

- GIVEN the user opens the "Exportar gestiones" modal
- WHEN the user selects desde and hasta dates and clicks Exportar
- THEN the system calls `cascada_gestiones_rango` with the selected date range
- AND generates an XLSX file in ERP Gestiones_Masivas format
- AND the browser downloads the file

#### Scenario: Export blocked without a date range

- GIVEN the "Exportar gestiones" modal is open
- WHEN the user clicks Exportar without selecting both dates
- THEN the export does NOT proceed
- AND a validation message is displayed requiring date selection

---

### Requirement: FR-011 Exportar Vista Actual

The system MUST provide an "Exportar vista actual" function accessible from the
sidebar. This function MUST generate an XLSX file from the currently visible
(filtered and sorted) client table rows using in-memory client-side data only,
without any RPC call. The exported file MUST reflect the active filter pill,
search query, and sort state at the moment of export.

#### Scenario: Export reflects active filter state

- GIVEN the client table has a rule filter "R5" applied, showing 12 rows
- WHEN the user clicks "Exportar vista actual"
- THEN the system generates an XLSX file containing exactly those 12 filtered rows
- AND no RPC or network call is made during the export
- AND the browser downloads the file

---

### Requirement: FR-012 Aplicar Sayorana

The system MUST provide an "Aplicar Sayorana" action for applicable clients within
ClienteModal. The action MUST be presented only when the client is in a state that
permits it (as determined by the `cascada_aplicar_sayorana` RPC contract). When
triggered, the system MUST call `cascada_aplicar_sayorana` for the current client.
On success, the modal MUST close with a success toast, and the client's row in the
table MUST receive the `no-gestionable` visual state (see DS-005).

#### Scenario: Apply sayorana to an eligible client

- GIVEN ClienteModal is open for a client eligible for sayorana
- WHEN the user triggers the "Aplicar Sayorana" action
- THEN the system calls `cascada_aplicar_sayorana` with the client's identifier
- AND a success toast appears
- AND the modal closes
- AND the client's row in the client table receives the `no-gestionable` visual state

#### Scenario: Sayorana action not shown for ineligible clients

- GIVEN ClienteModal is open for a client not eligible for sayorana
- WHEN the modal renders
- THEN the "Aplicar Sayorana" action is not presented

---

## ADDED Technical Requirements

### Requirement: NFR-004 Tooling and Code Convention

(Carry-forward from react-19-migration WARNING-1 and WARNING-2.)

The `vite.config.ts` configuration MUST include the `babel-plugin-react-compiler`
plugin so that the React Compiler transform is active for the project. The files
`src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`,
`src/components/ui/select.tsx`, and `src/components/ui/label.tsx` MUST NOT use
`import * as React from "react"`. They MUST use named imports from `"react"`
(e.g., `import type { ComponentProps } from "react"`).

#### Scenario: React Compiler plugin is configured

- GIVEN the project is built with Vite
- WHEN `vite.config.ts` is inspected
- THEN `babel-plugin-react-compiler` is present in the Babel plugin configuration
  passed to `@vitejs/plugin-react`

#### Scenario: Named imports in ui/ components

- GIVEN the ui/ wrapper component files are inspected
- WHEN a search for `import * as React` is run against `src/components/ui/*.tsx`
- THEN zero matches are found
- AND all React API usage in those files uses named imports

# Delta for Frontend Architecture

## MODIFIED Requirements

### Requirement: FR-002 Dashboard Cobradora

The system MUST display a personalized greeting with the user's first name. The system MUST render a KPIGrid component with 3 cards (Urgentes hoy, Mi meta del día, Mi meta del mes); KPI values are statically initialized — live RPC data wiring is deferred to react-feature-parity. The system MUST display filter pills for each rule (R1-R7, CRITICO) with client-side counts. The system MUST render a client table with 8 columns and client-side pagination; mora-sort is deferred to react-feature-parity.

(Previously: stated KPIs display live data from resumenStore and implied table supports mora-sort; KPI live wiring and mora-sort are deferred.)

#### Scenario: Load dashboard

- GIVEN an authenticated cobradora
- WHEN the dashboard loads
- THEN the system renders KPIGrid with 3 static placeholder cards
- AND displays filter pills with client-side rule counts
- AND renders the client table with pagination controls

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

The system MUST display a 280px sidebar with structural layout. The system MUST render a KPIGrid with 4 cards. The sidebar cartera list and cobradora selection are placeholder UI only — cobradora filtering, aggregate KPI wiring, and the productivity grid per cobradora are deferred to react-feature-parity.

(Previously: stated productivity grid per cobradora, cobradora filter, and aggregate KPI wiring as delivered; all three are deferred to react-feature-parity.)

#### Scenario: Render jefatura layout

- GIVEN an authenticated jefatura user
- WHEN the dashboard loads
- THEN the system renders Layout with a 280px sidebar and KPIGrid (4 cards)
- AND the sidebar displays structural placeholders for cartera list and action buttons

---

### Requirement: FR-004 ClienteModal

The system MUST display client contact info, cuota details, and gestión history. The system MUST provide a gestión form with tipo, efecto, fecha próxima, and nota fields. The system MUST show WSP templates based on client rule. The system MUST save gestión via "Solo guardar" — queue advancement after submit is deferred to react-feature-parity.

(Previously: stated gestión submit advances the client queue; cola mode is not implemented in this release.)

#### Scenario: Register gestión

- GIVEN ClienteModal is open
- WHEN the user fills the form and clicks "Solo guardar"
- THEN the system saves the gestión via Supabase RPC
- AND closes the modal
- AND shows a success toast

#### Scenario: Close modal

- GIVEN ClienteModal is open
- WHEN the user clicks X, backdrop, or presses Esc
- THEN the modal closes without saving

---

## REMOVED Requirements

### Requirement: FR-006 Cola de Gestión

(Reason: "Siguiente cliente" button, keyboard shortcut N, and queue-advance behavior are not implemented in this release; colaStore shell exists but has no connected UI.)
(Migration: Implement in react-feature-parity — colaStore is wired; the UI button, keyboard shortcut, and RPC call are pending.)

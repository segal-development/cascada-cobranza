# Frontend Architecture Specification

## Purpose

Defines React 19 component structure, Zustand stores, auth flow, and data fetching patterns for the Cascada Cobranza CRM.

## Requirements

### Requirement: FR-001 Authentication

The system MUST authenticate users via Supabase Auth with email/password. The system MUST persist sessions across browser refreshes. The system MUST detect user role (cobradora vs jefatura) from Supabase metadata. The system MUST clear all session data on logout.

#### Scenario: Successful login

- GIVEN a user with valid Supabase credentials
- WHEN the user submits the login form
- THEN the system authenticates via Supabase
- AND stores the session in authStore
- AND redirects to the appropriate dashboard based on role

#### Scenario: Session persistence

- GIVEN a user with an active session
- WHEN the browser is refreshed
- THEN the system restores the session from Supabase
- AND the user remains authenticated

#### Scenario: Logout

- GIVEN an authenticated user
- WHEN the user clicks logout
- THEN the system calls Supabase signOut
- AND clears authStore
- AND redirects to login

### Requirement: FR-002 Dashboard Cobradora

The system MUST display a personalized greeting with the user's first name. The system MUST render a KPIGrid component with 3 cards (Urgentes hoy, Mi meta del día, Mi meta del mes); KPI values are statically initialized — live RPC data wiring is deferred to react-feature-parity. The system MUST display filter pills for each rule (R1-R7, CRITICO) with client-side counts. The system MUST render a client table with 8 columns and client-side pagination; mora-sort is deferred to react-feature-parity.

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

### Requirement: FR-003 Dashboard Jefatura

The system MUST display a 280px sidebar with structural layout. The system MUST render a KPIGrid with 4 cards. The sidebar cartera list and cobradora selection are placeholder UI only — cobradora filtering, aggregate KPI wiring, and the productivity grid per cobradora are deferred to react-feature-parity.

#### Scenario: Render jefatura layout

- GIVEN an authenticated jefatura user
- WHEN the dashboard loads
- THEN the system renders Layout with a 280px sidebar and KPIGrid (4 cards)
- AND the sidebar displays structural placeholders for cartera list and action buttons

### Requirement: FR-004 ClienteModal

The system MUST display client contact info, cuota details, and gestión history. The system MUST provide a gestión form with tipo, efecto, fecha próxima, and nota fields. The system MUST show WSP templates based on client rule. The system MUST save gestión via "Solo guardar" — queue advancement after submit is deferred to react-feature-parity.

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

### Requirement: FR-005 CargaModal (Jefatura)

The system MUST display a dropzone for Excel upload. The system MUST preview the first 5 rows before processing. The system MUST validate file format. The system MUST show processing results and carga history.

#### Scenario: Upload valid file

- GIVEN jefatura has CargaModal open
- WHEN a valid .xlsx file is dropped
- THEN the system parses via SheetJS
- AND displays preview of first 5 rows
- AND enables the "Cargar" button

#### Scenario: Process carga

- GIVEN a file is previewed
- WHEN the user clicks "Cargar N registros"
- THEN the system sends data to Supabase
- AND shows success toast with count
- AND closes the modal

### Requirement: FR-006 Cola de Gestión

(REMOVED — Reason: "Siguiente cliente" button, keyboard shortcut N, and queue-advance behavior are not implemented in this release; colaStore shell exists but has no connected UI. Migration: Implement in react-feature-parity — colaStore is wired; the UI button, keyboard shortcut, and RPC call are pending.)

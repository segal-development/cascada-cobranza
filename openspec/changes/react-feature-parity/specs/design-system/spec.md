# Delta Spec: Design System

## Purpose

This delta re-adds deferred design system requirements and adds new visual state
requirements that arise from the react-feature-parity capability set. All requirement
blocks below AMEND `openspec/specs/design-system/spec.md`. Requirements not
referenced here remain unchanged.

---

## MODIFIED Requirements

### Requirement: NFR-002 Accessibility

(Previous baseline text is superseded. Re-adds keyboard shortcut N for next
client now that FR-006 Cola de Gestión is being implemented. Retains deferral of
⌘↵ and ⌘K until a dedicated accessibility pass is scheduled.)

The system MUST support keyboard navigation (Tab) for all interactive elements with
visible focus indicators. The system MUST implement focus management in modals: Tab
MUST cycle within the open modal and Esc MUST close it. Lighthouse accessibility
score ≥90 is targeted but not yet verified. When the user has an active cola session
and no modal is open, pressing the N key MUST trigger "Siguiente cliente" (equivalent
to clicking the sidebar button), calling `cascada_siguiente_cliente` and opening
ClienteModal in cola mode. The keyboard shortcuts ⌘↵ (submit gestión) and ⌘K
(search) remain deferred.

#### Scenario: Keyboard navigation through interactive elements

- GIVEN the dashboard is loaded
- WHEN the user presses Tab
- THEN focus moves through interactive elements in logical order
- AND visible focus indicators are displayed

#### Scenario: Modal focus trap

- GIVEN a modal is open
- WHEN the user presses Tab
- THEN focus cycles within the modal without escaping to page content below
- AND pressing Esc closes the modal

#### Scenario: N shortcut triggers Siguiente cliente in cola session

- GIVEN the user has an active cola session and no modal is currently open
- WHEN the user presses the N key
- THEN the system calls `cascada_siguiente_cliente`
- AND ClienteModal opens for the returned client in cola mode

---

### Requirement: NFR-003 Testing

(Previous baseline text is superseded. Removes the "skipped pending test
environment" qualification for gestión E2E tests, now that the gestión submission
path is fully implemented. Adds required coverage for new capabilities.)

The system MUST have unit tests for Zustand stores and business logic, including port
interfaces and the SupabaseAdapter. The system MUST have E2E tests for the login
flow. E2E tests for gestión submission MUST be un-skipped and MUST pass. New E2E
tests MUST be added covering: queue advance via "Guardar y siguiente" in cola mode,
cola mode activation via "Siguiente cliente", and the WSP auto-gestión
single-registration path (one call to `cascada_registrar_gestion` per client
interaction, regardless of whether WSP or form submit was used).

#### Scenario: Gestión E2E tests are active

- GIVEN Playwright is configured with a test environment
- WHEN the gestión submission E2E tests run
- THEN all previously-skipped gestión E2E tests pass (they are no longer skipped)

#### Scenario: WSP single-registration path is covered by tests

- GIVEN the Vitest or Playwright test suite
- WHEN the test for WSP auto-gestión runs
- THEN it asserts that `cascada_registrar_gestion` is called exactly once when the user
  clicks WSP and does NOT call it a second time on subsequent form submission

#### Scenario: Store unit tests cover port interfaces

- GIVEN the Vitest suite
- WHEN tests run
- THEN unit tests cover the SupabaseAdapter method mappings and port interface contracts
- AND all previously passing store tests continue to pass

---

## ADDED Requirements

### Requirement: DS-005 Table Row Visual States

The system MUST implement the following visual states for client table rows, matching
the legacy reference behavior:

**no-gestionable** — applies to clients in pool, sayorana, or pre-desistido status
that the current cobradora cannot manage:
- Row opacity: 0.6 at rest
- Row opacity on hover: 0.85; hover background: `--bg-soft`
- Client name cell: a "· solo lectura" suffix MUST be appended after the name, rendered
  in 10px muted weight (`--ink-mute`, font-weight 400)

**gestionado-hoy** — applies to clients that have already received a gestión today:
- Row opacity: 0.72
- Cell background: `rgba(210, 190, 100, 0.05)` (5% amber tint)
- Client name color: `--ink-mute`

#### Scenario: no-gestionable row renders correctly

- GIVEN the client table contains a row for a client with sayorana or pool status
- WHEN the table renders
- THEN the row displays at 60% opacity
- AND the client name displays a "· solo lectura" suffix in muted styling
- WHEN the user hovers the row
- THEN opacity increases to 85% and the row background becomes `--bg-soft`

#### Scenario: gestionado-hoy row renders correctly

- GIVEN the client table contains a row for a client managed today
- WHEN the table renders
- THEN the row displays at 72% opacity
- AND table cells have a faint amber background tint (`rgba(210, 190, 100, 0.05)`)
- AND the client name uses the `--ink-mute` color

---

### Requirement: DS-006 Productivity Card States

Productivity cards in the jefatura dashboard MUST implement three visual states
computed from the ratio `gestiones_hoy / meta_hoy`:

| State | Condition | Left border | Background | Status text | Progress bar fill |
|-------|-----------|-------------|------------|-------------|-------------------|
| `cumplida` | ratio ≥ 1.0 (≥ 100%) | `--sage` | `#f3f7ef` | `--sage` | `--sage` |
| `en-ruta` | 0.5 ≤ ratio < 1.0 | `--amber` | (panel default) | `--ink-mute` | `--amber` |
| `atrasada` | ratio < 0.5 | `--amber-hot` | `#fdf0ec` | `--amber-hot` | `--amber-hot` |

The productivity card MUST additionally display: a 22px circular avatar with the
cobradora's initials, the cobradora's first name (truncated with ellipsis), the daily
count and meta separated by "/", a 3px-height progress bar, and the status label in
uppercase 10px text.

#### Scenario: cumplida card state

- GIVEN a cobradora with gestiones_hoy = 20 and meta_hoy = 20 (ratio = 1.0)
- WHEN the productivity card renders
- THEN the card displays a sage-colored left border and `#f3f7ef` background
- AND the progress bar fill is `--sage`
- AND the status label text uses `--sage` color

#### Scenario: atrasada card state

- GIVEN a cobradora with gestiones_hoy = 4 and meta_hoy = 20 (ratio = 0.2)
- WHEN the productivity card renders
- THEN the card displays an `--amber-hot` left border and `#fdf0ec` background
- AND the progress bar fill is `--amber-hot`
- AND the status label text uses `--amber-hot` color

#### Scenario: en-ruta card state

- GIVEN a cobradora with gestiones_hoy = 12 and meta_hoy = 20 (ratio = 0.6)
- WHEN the productivity card renders
- THEN the card displays an `--amber` left border and the default panel background
- AND the progress bar fill is `--amber`

---

### Requirement: DS-007 Priority Bucket State

Priority buckets in the ATENCIÓN PRIORITARIA sidebar section MUST implement three
visual states:

- **default**: no background; text color `--ink-soft`; count uses `--ink-mute`
- **hover**: background `--bg-hover`
- **active**: background `--amber-hot`; text color white; count color
  `rgba(255, 255, 255, 0.8)`

Each bucket row MUST include an 8×8 px circular dot whose color identifies the
priority type. Bucket rows MUST render at 12px font size with 8px internal padding.

#### Scenario: Inactive bucket renders in default state

- GIVEN the ATENCIÓN PRIORITARIA section is rendered with no active filter
- WHEN the buckets display
- THEN all buckets show no background and `--ink-soft` text color

#### Scenario: Active bucket renders with amber-hot state

- GIVEN a priority bucket is clicked and becomes active
- WHEN the sidebar re-renders
- THEN the active bucket shows `--amber-hot` background with white text
- AND count text uses `rgba(255, 255, 255, 0.8)`
- AND all other buckets remain in the default state

---

### Requirement: DS-008 Recaudación KPI Variant

The Recaudación view header MUST render 4 KPI cells in a single horizontal row.
Adjacent cells MUST be separated by a 1px right border using `--line`. The rightmost
cell MUST NOT have a right border. Each cell MUST display a label (10px, uppercase,
`--ink-mute`), a primary value (22px, weight 700, tabular-nums), and an optional
sub-label (11px, `--ink-mute`). Monetary values MUST use `--sage` token color.
Per-cobradora progress bars MUST use `--sage` fill on a `--line-soft` track. All
monetary amounts in the recaudación view MUST use JetBrains Mono (DS-003).

#### Scenario: Recaudación KPI cells layout and borders

- GIVEN the Recaudación view is open and data is loaded
- WHEN the header renders
- THEN 4 KPI cells are displayed in a single row
- AND the first 3 cells have a 1px right border using `--line`
- AND the rightmost cell has no right border

#### Scenario: Monetary values use sage color in JetBrains Mono

- GIVEN a recaudación total monetary value is displayed
- WHEN the value renders
- THEN it uses `--sage` token color and JetBrains Mono font

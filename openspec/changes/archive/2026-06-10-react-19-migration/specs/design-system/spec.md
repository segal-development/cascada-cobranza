# Delta for Design System

## MODIFIED Requirements

### Requirement: NFR-001 Performance

The system MUST achieve first contentful paint < 1.5s. The system MUST render 50 table rows without jank. The system MUST NOT cause layout shift on data load. Lighthouse accessibility score ≥90 is targeted but the full audit has not been completed — a TODO-accessibility.md has been added as a tracking item; the audit is deferred to react-feature-parity.

(Previously: implied Lighthouse a11y ≥90 as a verified deliverable in this change; the audit is a pending TODO.)

#### Scenario: Fast initial load

- GIVEN a user navigates to the app
- WHEN the page loads
- THEN FCP is measured < 1.5s on a 3G connection simulation

#### Scenario: Smooth table rendering

- GIVEN the client table has 50 rows
- WHEN the user scrolls the table
- THEN the frame rate stays above 30fps

---

### Requirement: NFR-002 Accessibility

The system MUST support keyboard navigation (Tab) for all interactive elements with visible focus indicators. The system MUST implement focus management in modals — Tab cycles within the modal and Esc closes it. Lighthouse accessibility score ≥90 is targeted but not yet verified. Keyboard shortcuts N (next client), ⌘↵ (submit gestión), and ⌘K (search) are deferred to react-feature-parity.

(Previously: listed N, ⌘↵, and ⌘K as delivered keyboard shortcuts; all three are deferred to react-feature-parity.)

#### Scenario: Keyboard navigation

- GIVEN the dashboard is loaded
- WHEN the user presses Tab
- THEN focus moves through interactive elements in logical order
- AND focus indicators are visible

#### Scenario: Modal focus trap

- GIVEN a modal is open
- WHEN the user presses Tab
- THEN focus cycles within the modal
- AND pressing Esc closes the modal

---

### Requirement: NFR-003 Testing

The system MUST have unit tests for Zustand stores and business logic. The system MUST have E2E tests for the login flow. E2E tests for gestión submission and carga upload are scaffolded but skipped pending a real Supabase test environment — full E2E coverage is deferred to react-feature-parity.

(Previously: stated E2E covers login, gestión, and carga as passing; gestión E2E (4 tests) is skipped and carga E2E is not implemented.)

#### Scenario: Store unit tests

- GIVEN the Vitest suite
- WHEN tests run
- THEN 46 unit/integration tests pass covering authStore, carteraStore, format utils, and component rendering

#### Scenario: E2E login path

- GIVEN Playwright is configured
- WHEN the login flow tests run
- THEN 3 passing tests verify: form render, password toggle, and validation error display

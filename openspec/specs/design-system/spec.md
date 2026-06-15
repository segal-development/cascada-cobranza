# Design System Specification

## Purpose

Defines Tailwind 4 tokens, typography, rule chip system, and UI component patterns from the design handoff.

## Requirements

### Requirement: NFR-001 Performance

The system MUST achieve first contentful paint < 1.5s. The system MUST render 50 table rows without jank. The system MUST NOT cause layout shift on data load. Lighthouse accessibility score ≥90 is targeted but the full audit has not been completed — a TODO-accessibility.md has been added as a tracking item; the audit is deferred to react-feature-parity.

#### Scenario: Fast initial load

- GIVEN a user navigates to the app
- WHEN the page loads
- THEN FCP is measured < 1.5s on a 3G connection simulation

#### Scenario: Smooth table rendering

- GIVEN the client table has 50 rows
- WHEN the user scrolls the table
- THEN the frame rate stays above 30fps

### Requirement: NFR-002 Accessibility

The system MUST support keyboard navigation (Tab) for all interactive elements with visible focus indicators. The system MUST implement focus management in modals — Tab cycles within the modal and Esc closes it. Lighthouse accessibility score ≥90 is targeted but not yet verified. Keyboard shortcuts N (next client), ⌘↵ (submit gestión), and ⌘K (search) are deferred to react-feature-parity.

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

### Requirement: NFR-003 Testing

The system MUST have unit tests for Zustand stores and business logic. The system MUST have E2E tests for the login flow. E2E tests for gestión submission and carga upload are scaffolded but skipped pending a real Supabase test environment — full E2E coverage is deferred to react-feature-parity.

#### Scenario: Store unit tests

- GIVEN the Vitest suite
- WHEN tests run
- THEN 46 unit/integration tests pass covering authStore, carteraStore, format utils, and component rendering

#### Scenario: E2E login path

- GIVEN Playwright is configured
- WHEN the login flow tests run
- THEN 3 passing tests verify: form render, password toggle, and validation error display

### Requirement: DS-001 Token System

The system MUST use Tailwind 4 CSS variables for all design tokens. Tokens MUST match the handoff: `--bg`, `--ink`, `--amber`, `--sage`, rule colors `--r1` through `--r7`, `--sayorana`.

#### Scenario: Token consistency

- GIVEN the tailwind.config.ts
- WHEN tokens are defined
- THEN all handoff colors are mapped as CSS variables
- AND components use only token references

### Requirement: DS-002 Rule Chip System

The system MUST render rule chips with correct colors per rule (R1-R7, S9). R5 MUST use solid background (white text on red). Other rules MUST use tinted variant (10% bg, 30% border).

#### Scenario: R5 chip rendering

- GIVEN a client with rule R5
- WHEN the chip renders
- THEN background is `--r5` solid
- AND text is white

#### Scenario: R1 chip rendering

- GIVEN a client with rule R1
- WHEN the chip renders
- THEN background is `--r1` at 10% opacity
- AND border is `--r1` at 30% opacity
- AND text is `--r1`

### Requirement: DS-003 Typography

The system MUST use Inter for UI text and JetBrains Mono for all numeric values. Mono MUST apply to: money, RUT, dates, cuotas, IDs, kbd hints.

#### Scenario: Numeric formatting

- GIVEN a money value like 125000
- WHEN displayed
- THEN format is "$125.000" in JetBrains Mono

#### Scenario: RUT formatting

- GIVEN a RUT "12345678-9"
- WHEN displayed
- THEN format shows "12.345.678-9" in mono

### Requirement: DS-004 Component Library

The system MUST implement reusable components: KPICard, FilterPill, RuleChip, StatusDot, ClienteTable, Modal, Toast.

#### Scenario: Toast notification

- GIVEN a gestión is registered
- WHEN the action completes
- THEN a toast appears at bottom-center
- AND auto-dismisses after 2.2s

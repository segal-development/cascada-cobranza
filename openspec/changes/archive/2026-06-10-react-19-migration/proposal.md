# Proposal: React 19 Migration with Tailwind 4 Design System

## Intent

Migrate the production Cascada Cobranza CRM from vanilla JS (2185-line `app.js` + 1028-line inline CSS) to React 19 + TypeScript + Tailwind 4 with Zustand state management. The system is actively used by 7 cobradoras + 1 jefa daily. Goal: 100% functional parity, better maintainability, testable architecture.

## Scope

### In Scope
- Complete frontend rewrite using Strangler Fig pattern (incremental, always-working)
- Port design handoff tokens to Tailwind 4 config
- Extract business rules into typed modules (R1-R7, Sayorana)
- Add Vitest + Playwright test coverage from Phase 0
- Move hardcoded Supabase credentials to `.env`
- Zustand stores for auth, cartera, resumen, UI state

### Out of Scope
- Backend/RPC changes (Supabase functions stay as-is)
- New features or UX improvements (parity only)
- Mobile responsiveness (desktop-only tool)
- Performance optimizations beyond natural React benefits

## Capabilities

### New Capabilities
- `frontend-architecture`: React 19 component structure, Zustand stores, hooks pattern
- `design-system`: Tailwind 4 tokens from design handoff, rule chip system, typography

### Modified Capabilities
- None (no existing specs)

## Approach

**Strangler Fig** — Mount React shell alongside existing vanilla JS, migrate one component at a time. Each PR delivers working, testable code. Phases:

1. **Foundation**: Vite + React 19 + TS + Tailwind 4 + Zustand scaffold
2. **Shell + Auth**: LoginScreen, Header, Layout, authStore
3. **Data Layer**: Stores + hooks (cartera, resumen, UI)
4. **Core Views**: KPIs, FilterPills, ClienteTable
5. **Modals**: ClienteModal, CargaModal, smaller modals
6. **Cleanup**: Remove legacy code, final style polish

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `/` (root) | New | Vite config, package.json, tsconfig, tailwind.config |
| `/src/` | New | All React components, hooks, stores |
| `/app.js` | Removed | 2185 lines → deleted in cleanup phase |
| `/index.html` | Modified | Strip 1028 inline CSS lines, add Vite entry |
| `/.env` | New | Supabase credentials (moved from app.js) |
| `/tests/` | New | Vitest unit + Playwright E2E |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Feature regression | Medium | E2E tests capture all user flows before migration; verify parity each phase |
| Business rule bugs | Medium | Extract rules to typed module first; test with fixtures |
| SheetJS bundle size | Low | Dynamic import; same API surface |
| Supabase auth session drift | Low | Mirror exact SDK patterns; test auth flows first |

## Rollback Plan

Each PR is independently revertable. Full rollback: revert to pre-migration commit, restore original `app.js` and inline styles. Git tags at each phase boundary for checkpoint recovery.

## Dependencies

- Design handoff already available at `/Users/marcelo/Downloads/design_handoff_cascada_cobranza/`
- Supabase project unchanged (same RPC functions, same RLS)
- No backend changes required

## Success Criteria

- [ ] All 7 cobradoras can login and work their queue
- [ ] Jefatura can view team productivity and run carga mensual
- [ ] All 8 rule types render with correct colors and WSP templates
- [ ] ClienteModal gestión form works end-to-end
- [ ] Carga Excel modal processes SheetJS uploads
- [ ] No console errors in production build
- [ ] Lighthouse accessibility ≥90
- [ ] E2E tests cover: login, queue navigation, gestión, carga

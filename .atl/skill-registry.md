# Skill Registry — cascada-cobranza

Generated: 2026-06-05

## Compact Rules

### React 19 (react-19)
- React Compiler handles optimization automatically
- No useMemo, useCallback, or React.memo needed
- Just write straightforward components

### TypeScript (typescript)
- Create const object first, then extract type with `typeof`
- Use discriminated unions for complex state
- Prefer interfaces for objects, types for unions

### Zustand 5 (zustand-5)
- Use `create<Store>()` with interface defining state + actions
- Select minimal state with selectors: `useStore(s => s.count)`
- Use `immer` middleware for complex nested updates

### Tailwind CSS 4 (tailwind-4)
- Use cn() for conditional styles only
- Use style prop for dynamic values: `style={{ width: \`${x}%\` }}`
- Theme via CSS variables in @theme directive

### Zod 4 (zod-4)
- Import validators: `import { email, uuid, url } from "zod/v4/mini"`
- Use `z.string().check(email())` instead of `z.string().email()`
- Error handling: `z.prettifyError(result.issues)`

### Playwright (playwright)
- Use MCP tools first: navigate, snapshot, interact
- Page Object Model for reusable selectors
- Prefer role/label selectors over test IDs

### Branch PR (branch-pr)
- Check for existing issue before creating PR
- Use conventional commit format
- Link PR to issue with "Closes #N"

### Work Unit Commits (work-unit-commits)
- One deliverable work unit per commit
- Keep tests/docs with the code they verify
- Target 400 lines max per PR

### Chained PR (chained-pr)
- Split PRs over 400 changed lines
- Include dependency diagram with current PR marked
- State start, end, prior deps, follow-up

### Comment Writer (comment-writer)
- Warm, direct, and helpful tone
- Actionable feedback with examples
- Acknowledge good work

### Issue Creation (issue-creation)
- Check for duplicates before creating
- Include reproduction steps for bugs
- Clear acceptance criteria for features

### PR Review (pr-review)
- Review code, not the person
- Structured analysis with findings
- Actionable recommendations

## User Skills

| Skill | Trigger | Path | Scope |
|-------|---------|------|-------|
| react-19 | React components, hooks, React 19 patterns | ~/.config/opencode/skills/react-19/SKILL.md | user |
| typescript | TypeScript code, types, interfaces, generics | ~/.config/opencode/skills/typescript/SKILL.md | user |
| zustand-5 | React state with Zustand, stores, selectors | ~/.config/opencode/skills/zustand-5/SKILL.md | user |
| tailwind-4 | Tailwind styling, cn(), theme variables | ~/.config/opencode/skills/tailwind-4/SKILL.md | user |
| zod-4 | Zod validation, schemas, breaking changes v3→v4 | ~/.config/opencode/skills/zod-4/SKILL.md | user |
| playwright | E2E tests, Page Objects, selectors | ~/.config/opencode/skills/playwright/SKILL.md | user |
| branch-pr | Creating PRs, opening PRs, preparing for review | ~/.config/opencode/skills/branch-pr/SKILL.md | user |
| work-unit-commits | Commit splitting, reviewable units, chained PRs | ~/.config/opencode/skills/work-unit-commits/SKILL.md | user |
| chained-pr | PRs over 400 lines, stacked PRs, review slices | ~/.config/opencode/skills/chained-pr/SKILL.md | user |
| comment-writer | PR feedback, issue replies, reviews, GitHub comments | ~/.config/opencode/skills/comment-writer/SKILL.md | user |
| issue-creation | GitHub issues, bug reports, feature requests | ~/.config/opencode/skills/issue-creation/SKILL.md | user |
| pr-review | Review PRs, analyze issues, audit backlog | ~/.config/opencode/skills/pr-review/SKILL.md | user |
| ai-sdk-5 | AI chat features with Vercel AI SDK 5 | ~/.config/opencode/skills/ai-sdk-5/SKILL.md | user |
| go-testing | Go tests, coverage, Bubbletea teatest | ~/.config/opencode/skills/go-testing/SKILL.md | user |
| nextjs-15 | Next.js App Router, Server Actions, data fetching | ~/.config/opencode/skills/nextjs-15/SKILL.md | user |
| django-drf | Django REST APIs, ViewSets, Serializers | ~/.config/opencode/skills/django-drf/SKILL.md | user |
| dotnet | .NET 9, ASP.NET Core, EF Core, Minimal APIs | ~/.config/opencode/skills/dotnet/SKILL.md | user |
| pytest | Python tests, fixtures, mocking, markers | ~/.config/opencode/skills/pytest/SKILL.md | user |
| jira-epic | Jira epics, large features, multi-task initiatives | ~/.config/opencode/skills/jira-epic/SKILL.md | user |
| jira-task | Jira tasks, tickets, issues | ~/.config/opencode/skills/jira-task/SKILL.md | user |
| homebrew-release | Release, bump version, update homebrew | ~/.config/opencode/skills/homebrew-release/SKILL.md | user |
| stream-deck | Slide-deck presentations, course material | ~/.config/opencode/skills/stream-deck/SKILL.md | user |
| technical-review | Technical exercises, candidate submissions | ~/.config/opencode/skills/technical-review/SKILL.md | user |
| judgment-day | Dual review, adversarial review | ~/.config/opencode/skills/judgment-day/SKILL.md | user |
| skill-creator | New skills, agent instructions | ~/.config/opencode/skills/skill-creator/SKILL.md | user |
| skill-improver | Improve skills, audit skills, refactor skills | ~/.config/opencode/skills/skill-improver/SKILL.md | user |
| cognitive-doc-design | Writing guides, READMEs, RFCs, onboarding docs | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md | user |
| scope-rule-architect-angular | Angular 20+, Screaming Architecture, signals | ~/.config/opencode/skills/angular/SKILL.md | user |

## Project Skills

None detected.

## Project Conventions

None detected.

## Migration-Relevant Skills

For the React 19 + TypeScript + Zustand migration target:
- **react-19**: Core React patterns without manual memoization
- **typescript**: Type-first development with const patterns
- **zustand-5**: State management replacing current global `state` object
- **tailwind-4**: Styling (if adopted) to replace inline CSS
- **zod-4**: Runtime validation for Supabase responses
- **playwright**: E2E testing for the migrated app

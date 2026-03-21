@AGENTS.md

## Web App Development (web/)

### Operational Commands

```bash
cd web
pnpm install              # Install dependencies
pnpm run typecheck        # TypeScript type checking
pnpm run lint             # ESLint (Clean Architecture boundaries enforced)
pnpm run test             # Vitest unit + integration tests
pnpm run test:e2e         # Playwright E2E tests (requires chromium)
pnpm run build            # Production build
pnpm run dev              # Dev server
```

### Quality Gate — MANDATORY before every commit

Every commit to the web app MUST pass through this checklist **in order**:

1. **`pnpm run typecheck`** — zero errors
2. **`pnpm run test`** — all tests pass
3. **Self-review via Agent** — launch a review agent that checks every applicable item in `web/GUARDRAILS.md` against the diff, plus bugs, security issues, architecture violations, React anti-patterns, and missing test coverage. Fix ALL issues rated HIGH or CRITICAL before committing. If review discovers a new pattern, add it to GUARDRAILS.md.
4. **`pnpm run build`** — production build succeeds

Do NOT skip step 3. The review agent catches issues that typecheck and tests miss (stale closures, race conditions, security holes, missing edge cases). Run it EVERY time, not just when you feel like it.

### Architecture Rules (web/)

- **Clean Architecture**: L1 Entities → L2 Use Cases → L3 Adapters → L4 UI/Controller
- L1 (`entities/`) must NOT import from L2, L3, or L4
- L2 (`use-cases/`) must NOT import from L3 or L4; ports are defined here as interfaces
- L3 (`adapters/`) implements L2 ports; must NOT import from L4
- L4 (`ui/`, `controller/`) may import from any lower layer
- Enforced by `eslint-plugin-boundaries` — `pnpm run lint` will catch violations

### Testing Strategy (web/)

- **Unit tests**: Pure functions and classes (entities, use-cases, adapters with mocked fetch/IndexedDB)
- **Integration tests**: React components rendered with `@testing-library/react`, verifying rendering + interactions
- **E2E tests**: Playwright in CI — full browser tests against dev server
- **Mocking rules**: Same as Python — use protocol-conforming fakes for L2 tests, library mocking only at L3 boundary
- **New features**: Must include tests. If a component is added, add corresponding integration test.

### Guardrails (web/)

- **`web/GUARDRAILS.md`**: Single source of truth for known pitfalls — used by both development and review
- Development: scan relevant sections before writing new code
- Review (step 3 of quality gate): check each applicable guardrail against the diff
- When review finds a new pattern: fix it, then add a guardrail entry (see Meta section in the file)
- Prefer automated enforcement (ESLint rules, TS strict options) over manual checklist items

### Continuous Improvement

- **FEATURES.md**: Living document tracking feature parity. Update after every feature addition.
- **GUARDRAILS.md**: Evolving guardrail checklist. Update after every review finding (see Meta section).
- **Upstream sync**: When Python app adds features, check FEATURES.md and assess web parity.

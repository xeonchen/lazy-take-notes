# Guardrails

Unified checklist for development and review. Every item here was learned from a real bug or review finding.

**How to use:**
- **Development**: Scan relevant sections before writing new code
- **Review**: Check each applicable item against the diff
- **Evolution**: See [Meta](#meta) for how to add new guardrails

---

## React Hooks

- [ ] Callbacks registered once (e.g., passed to `start()`) MUST use ref pattern — the closure captures the initial value, so without a ref the handler goes stale. (`useAudioCapture` finding)
- [ ] Refs for values used inside long-lived closures (`isReady`, `language`, `hints` in `useTranscription`) — state/props accessed in callbacks that outlive a single render must use `useRef` + sync
- [ ] `useEffect` cleanup: clear `setInterval`/`setTimeout` on unmount — leaked timers cause state updates on unmounted components (`notify()` finding)
- [ ] Async operations in callbacks need `.catch()` — unhandled rejections silently swallow errors (transcription pipeline finding)
- [ ] Re-entrancy guards for async hooks — use `useRef<boolean>` to prevent overlapping calls from rapid triggers (`useTranscription` finding)
- [ ] `useEffect` dependency arrays must include all referenced values — use ref pattern to break the dependency when including the value would cause unwanted re-fires (`handleStop` finding)

## Security

- [ ] LLM output MUST render through `SafeMarkdown` — blocks `<img>` tags (data exfiltration vector), validates link URLs (only `http:`/`https:` allowed), opens external links with `rel="noopener"`
- [ ] Clipboard API calls need `.catch()` — `navigator.clipboard.writeText` throws in non-secure contexts (HTTP, iframes)
- [ ] No user-controlled strings in `dangerouslySetInnerHTML` — always use a sanitizing component

## Architecture (Clean Architecture)

- [ ] Constants and shared types belong in L1 (`entities/`) — e.g., `AVAILABLE_MODELS` was incorrectly placed in L3 adapter and imported by L4 UI
- [ ] L1 must NOT import from L2, L3, or L4
- [ ] L2 must NOT import from L3 or L4; ports are defined here as interfaces
- [ ] L3 implements L2 ports; must NOT import from L4
- [ ] Controller (L3) must NOT import from adapters or UI directly — communicate through ports
- [ ] `eslint-plugin-boundaries` enforces these rules — `pnpm run lint` catches violations

## Data Integrity

- [ ] Deep-copy mutable config objects before editing — use `structuredClone()` to prevent mutations leaking back to the caller (`SettingsModal` finding)
- [ ] Guard utility functions against invalid input — e.g., `formatElapsed` should handle negative values
- [ ] `.filter(Boolean)` on string arrays removes empty strings — if blank lines are intentional, use a more specific filter
- [ ] Locale→model mappings (`TranscriptionConfig.models`) use `Record<string, string>` — values are not type-checked against `WhisperModelName`. A typo silently falls through to a raw HF model ID lookup that 404s at runtime. Consider tightening to `Record<string, WhisperModelName>` when deserialization paths allow it. (`modelForLocale` review finding)
- [ ] IndexedDB operations MUST have try-catch with user-visible error notifications — silent failures cause data loss and confusing UX (`template-persistence` finding)
- [ ] Template format variables MUST be validated against allowed sets per field — unknown `{vars}` crash at runtime when `.format()` is called during live recording. Use `validateTemplate()` from `entities/template.ts` (`template-editor` finding)
- [ ] Markdown code fences wrapping user content must use dynamic fence length — scan content for longest backtick sequence and use N+1 backticks to prevent rendering breakage (`TemplatePreview` finding)

## Unused Code

- [ ] `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` — prefix intentionally unused parameters with underscore
- [ ] Remove unused props from component interfaces — dead props confuse consumers (`StatusBar.audioLevel` finding)
- [ ] Remove unused dependencies from `package.json` — run `pnpm install` to regenerate lock file after removal

## Testing

- [ ] ESLint and TypeScript must cover `tests/` directory (not just `src/`)
- [ ] Vitest config should NOT set `globals: true` — tests use explicit imports from `vitest`
- [ ] New components must have corresponding integration tests
- [ ] Adapter tests should mock at the boundary (e.g., `msw` for HTTP, `fake-indexeddb` for storage)

## E2E (Playwright)

- [ ] `getByText()` locators MUST be unique — adding help text or tooltips can cause existing `getByText('X')` to match multiple elements (Playwright strict mode rejects ambiguous locators). Use `locator('tag', { hasText })` or `getByRole()` instead. (`OLLAMA_ORIGINS` matched 3 elements after adding setup instructions)
- [ ] Modal overlays block pointer events — any `position: fixed; inset: 0` overlay (consent notice, onboarding modal) intercepts all clicks. E2E tests for non-overlay features must seed localStorage flags via `addInitScript` to dismiss overlays before testing. (ConsentNotice blocked 4 E2E tests in CI)
- [ ] z-index stacking: when adding new overlays, verify they don't stack above elements that need to remain clickable (e.g., header buttons). Test manually and in E2E. (`app-header` needed higher z-index than `modal-overlay`)
- [ ] CI browsers start with empty state — never assume localStorage, IndexedDB, or cookies are pre-populated. First-run flows (onboarding, consent) will trigger unless explicitly suppressed in test setup.

---

## Meta

**When review finds an issue not covered above:**

1. Fix the issue in code
2. Add a guardrail entry in the appropriate section (with a short note referencing the finding)
3. Evaluate: can this be enforced automatically?
   - **Yes** → Add an ESLint rule, TypeScript strict option, or test pattern
   - **No** → The guardrail entry is the enforcement mechanism
4. Automated rules are always preferred over manual checklist items — delete the guardrail entry once the rule is in place

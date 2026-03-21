# Agent Context for lazy-take-notes

> For usage, installation, and configuration see [README.md](README.md).

## Operational Commands (Primary Instructions)

Use `uv` for all project management tasks.

- **Setup/Sync**:
```bash
uv sync
```

* **Run App**:
```bash
uv run lazy-take-notes
```


* **Run Tests**:
```bash
uv run pytest tests/ -v
```


* **Verify Architecture (Import Contracts)**:
```bash
uv run lint-imports
```

* **Linux Smoke Test** (requires Docker):
```bash
docker build -f scripts/linux-smoke/Dockerfile -t ltn-linux-smoke .
docker run --rm ltn-linux-smoke
```
Runs the full pytest suite on Linux (Debian bookworm) with PulseAudio, then exercises `SoundCardLoopbackSource` against a real PulseAudio null-sink loopback device. Verifies device discovery, audio capture, and clean shutdown.


## Code Style

* **`noqa` must include a reason**: Every `# noqa: XXXX` comment **MUST** have a `--` reason suffix explaining why the suppression is justified.
  * Good: `# noqa: S603 -- fixed arg list, not shell=True`
  * Bad: `# noqa: S603`


## Testing Guidelines

* **Architecture**: The project follows **Clean Architecture** (L1 Entities -> L2 Use Cases -> L3 Adapters -> L4 Frameworks).
* **Test directory convention**: `tests/` mirrors the source tree one-to-one. Each source subdirectory has a corresponding test subdirectory (e.g. `l3_interface_adapters/gateways/` → `tests/l3_interface_adapters/gateways/`). New test files go in the matching subdir.
* **Mocking Strategy**:
* Do **NOT** use `@patch` on concrete libraries (e.g., `ollama`, `openai`, `sounddevice`) in L2 tests.
* **MUST** use the provided protocol-conforming fakes located in `tests/conftest.py` (e.g., `FakeLLMClient`, `FakeTranscriber`).
* Library mocking is only permitted at the L3 (Adapter) boundary.


## Concurrency Model

```
Audio Worker (thread)          Digest Task (async)          Query Task (async)
  AudioSource + whisper          LLM heavy model              LLM fast model
        │                              │                           │
        │ TranscriptChunk              │ DigestReady               │ QueryResult
        │ AudioWorkerStatus            │ DigestError               │
        │ AudioLevel                   │                           │
        ▼                              ▼                           ▼
  ┌─────────────────────── App (event loop) ───────────────────────┐
  │ on_transcript_chunk → update panel, buffer lines, trigger      │
  │ on_digest_ready → update panel, persist to disk                │
  │ on_query_result → show modal                                   │
  │ Digest trigger: buffer >= min_lines AND elapsed >= min_interval│
  │                 OR buffer >= max_lines (force-trigger)         │
  │ Mutual exclusion: digest + query tasks run exclusive=True      │
  └────────────────────────────────────────────────────────────────┘
```

Digest and query are on-demand async tasks (`self.run_worker(..., exclusive=True, group=...)`) — not persistent background workers. `_digest_running` / `_query_running` flags prevent double-firing.

## Audio Modes

Selected at startup via template picker (all platforms):

- **MIC_ONLY** — `SounddeviceAudioSource` (PortAudio, cross-platform)
- **SYSTEM_ONLY** — macOS: `CoreAudioTapSource` (ScreenCaptureKit); Linux/Windows: `SoundCardLoopbackSource` (PulseAudio/WASAPI loopback)
- **MIX** — `MixedAudioSource` (mic + system blended, 0.5 attenuation anti-clipping)

`DependencyContainer._build_audio_source()` selects the system audio backend by platform.

## Data Flow

1. **Audio capture**: AudioSource → numpy float32 buffer → VAD trigger → whisper transcribe (off-thread) → TranscriptSegment
2. **Transcript buffering**: App receives TranscriptChunk → updates panel, persists to disk, appends to DigestState.buffer
3. **Digest trigger**: When buffer >= min_lines AND elapsed >= min_interval, or buffer >= max_lines (force) → launch async digest task
4. **Digest cycle**: Template-driven prompt (with user session context) → LLMClient.chat → JSON parse → DigestData → persist + update panel
5. **Token compaction**: When prompt_tokens exceeds threshold, conversation history is compacted to 3 messages (system, compressed state, last response)
6. **Quick actions**: Positional keybinding (1–5) → format prompt from template with current digest + recent transcript → LLM fast model → modal display
7. **File transcription**: `lazy-take-notes transcribe <file>` → TemplatePicker (no audio mode) → ffmpeg decode → chunked transcription via `FileTranscriptionWorker` (thread) → streaming TUI output + auto-trigger final digest on completion
8. **Session viewer**: `lazy-take-notes view` → SessionPicker (browse saved sessions) → ViewApp (read-only, standalone TextualApp — no controller/workers)
9. **Recording**: When `save_audio: true`, WAV is written alongside output — mic mode records at native sample rate, system/mixed mode records processed 16 kHz int16

## Design Decisions

- **Thread worker for audio**: sounddevice and whisper.cpp are blocking C libraries, cannot run in asyncio. Transcription runs in a `ThreadPoolExecutor` within the audio worker thread.
- **Async tasks for LLM**: LLMClient (Ollama or OpenAI-compatible) integrates with Textual's event loop via async methods. Digest and query are spawned on-demand with `exclusive=True` to prevent overlapping calls.
- **Single-threaded state**: DigestState lives on the controller, only mutated on event loop — no locks needed
- **Template-driven**: All prompts, labels, and quick actions are defined in YAML templates — core logic is locale-agnostic
- **Message passing**: Workers communicate with the App exclusively through Textual Messages — clean separation of concerns
- **Transcriber** and **LLMClient** are fully isolated behind L2 ports — `OllamaLLMClient` and `OpenAICompatLLMClient` are interchangeable; new implementations can be added with zero L2 changes
- **AudioSource** protocol: `SounddeviceAudioSource`, `CoreAudioTapSource`, `SoundCardLoopbackSource`, and `MixedAudioSource` are interchangeable behind a common interface; `DependencyContainer` selects per platform + audio mode
- **SessionController** (L3) owns all business state (DigestState, segments, latest_digest, user_context); App (L4) is thin compose + routing
- **DependencyContainer** (L4) is the composition root — inject fakes for testing
- **Template picker**: Interactive TUI launched before the main app; selects template + audio mode to configure the session. `record` shows audio mode selector; `transcribe` hides it (input is a file, not a device)
- **Session picker**: Interactive TUI for `view` subcommand; lists saved session directories and loops back after each ViewApp exit
- **Session context**: User-editable text area in the digest column; included in digest prompts and persisted on final digest

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

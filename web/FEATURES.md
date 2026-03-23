# Feature Parity Checklist: Desktop → Web

Tracking document for feature parity between the Python/Textual desktop app and the React web app.

**Legend:** ✅ Done | 🔲 Not yet | ➖ Not applicable to web

---

## Core Recording & Transcription

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Microphone capture (MIC_ONLY) | ✅ | getUserMedia + AudioWorklet |
| 2 | System audio capture (SYSTEM_ONLY) | ➖ | Requires native APIs; not available in browser |
| 3 | Mixed audio (MIC + system) | ➖ | Depends on system audio |
| 4 | Audio mode selector at startup | ➖ | MIC_ONLY only for web; UI notes this |
| 5 | Whisper local transcription | ✅ | @huggingface/transformers (WebGPU + WASM) |
| 6 | Whisper cloud transcription (API) | ✅ | OpenAI Whisper API fallback |
| 7 | Recognition hints passed to transcriber | ✅ | Included in transcription call |
| 8 | Real-time transcript display | ✅ | TranscriptPanel with auto-scroll |
| 9 | Transcript timestamps | ✅ | Wall-clock timestamps per segment |
| 10 | Audio level meter | ✅ | RMS metering in StatusBar |
| 11 | Pause/resume recording | ✅ | Space key or button |
| 12 | Stop recording | ✅ | S key or button |
| 13 | VAD / silence detection | ✅ | Via transcriber (configurable threshold) |
| 14 | Chunk duration configurable | ✅ | Settings modal |
| 15 | WebGPU acceleration | ✅ | Auto-detected, WASM fallback |
| 16 | Model download with progress | ✅ | DownloadProgress overlay |
| 17 | Model caching (IndexedDB) | ✅ | Via @huggingface/transformers cache |
| 18 | Save audio (WAV recording) | 🔲 | Future: MediaRecorder API |

## LLM Digest

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 19 | Auto-trigger digest (min lines + interval) | ✅ | shouldTriggerDigest logic |
| 20 | Force-trigger digest (max lines) | ✅ | maxLines cap |
| 21 | Manual digest trigger (D key) | ✅ | Keyboard shortcut |
| 22 | Final digest on stop | ✅ | Includes full transcript |
| 23 | Digest markdown display | ✅ | DigestPanel with react-markdown |
| 24 | Digest count in status bar | ✅ | StatusBar shows count |
| 25 | Buffer line count in status bar | ✅ | StatusBar shows buffer size |
| 26 | Last digest time ago | ✅ | StatusBar shows elapsed |
| 27 | Token compaction (conversation pruning) | ✅ | CompactMessagesUseCase |
| 28 | Compact token threshold configurable | ✅ | Settings modal |
| 29 | Consecutive failure tracking | ✅ | DigestState.consecutiveFailures |
| 30 | Empty response handling | ✅ | Pops user message, increments failures |
| 31 | Digest error display | ✅ | Notification system |

## LLM Providers

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 32 | OpenAI API support | ✅ | OpenAILLMClient (fetch-based) |
| 33 | OpenAI-compatible APIs (Groq, Together) | ✅ | Configurable baseUrl |
| 34 | Ollama local support | ✅ | OllamaLLMClient |
| 35 | CORS error detection for Ollama | ✅ | Explicit error message with OLLAMA_ORIGINS hint |
| 36 | Test connection button | ✅ | SettingsModal checkConnectivity |
| 37 | Model selection | ✅ | Settings modal |
| 38 | Separate digest/interactive models | ✅ | AppConfig.digest.model vs interactive.model |

## Quick Actions

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 39 | Quick action buttons (1–5) | ✅ | QuickActionBar + keyboard 1-5 |
| 40 | Quick action from template | ✅ | Template-driven prompts |
| 41 | Quick action result modal | ✅ | QueryModal with copy button |
| 42 | Copy result to clipboard | ✅ | Navigator.clipboard API |
| 43 | Recent transcript included in prompt | ✅ | Last 50 segments |

## Templates

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 44 | Bundled YAML templates | ✅ | Vite import.meta.glob |
| 45 | Template selector at startup | ✅ | TemplateSelector split-pane (list + preview) |
| 46 | Template metadata (name, description, locale) | ✅ | TemplateMetadata interface |
| 47 | System prompt from template | ✅ | SessionTemplate.systemPrompt |
| 48 | Digest user template | ✅ | digestUserTemplate with placeholders |
| 49 | Final digest template | ✅ | finalUserTemplate with full_transcript |
| 50 | Quick actions from template | ✅ | Up to 5 per template |
| 51 | Recognition hints from template | ✅ | Passed to transcriber |
| 52 | Custom user templates | ✅ | IndexedDB storage via template-persistence adapter |
| 52a | Template preview pane | ✅ | Live preview in selector and editor |
| 52b | Edit template (all fields) | ✅ | TemplateEditor modal with Edit/Preview tabs |
| 52c | Duplicate template | ✅ | Clone with unique UUID key |
| 52d | Delete user template | ✅ | With confirmation dialog |
| 52e | Format variable validation | ✅ | Mirrors Python template_validator |
| 53 | default_en template | ✅ | Bundled |
| 54 | default_zh_tw template | ✅ | Bundled |
| 55 | daily_standup_en template | ✅ | Bundled |
| 56 | daily_standup_zh_tw template | ✅ | Bundled |
| 57 | lecture_notes_en template | ✅ | Bundled |
| 58 | lecture_notes_zh_tw template | ✅ | Bundled |
| 59 | podcast_shownotes_en template | ✅ | Bundled |
| 60 | podcast_shownotes_zh_tw template | ✅ | Bundled |
| 61 | sprint_retro_en template | ✅ | Bundled |
| 62 | sprint_retro_zh_tw template | ✅ | Bundled |

## Session Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 63 | Auto-save session to IndexedDB | ✅ | Fire-and-forget persistence |
| 64 | Session context (user-editable text) | ✅ | ContextInput textarea |
| 65 | Context included in digest prompts | ✅ | {user_context} placeholder |
| 66 | Context persisted on save | ✅ | SessionData.context |
| 67 | Session list/browse | 🔲 | Future: session picker UI |
| 68 | Session load/resume | 🔲 | Future: load from IndexedDB |
| 69 | Session delete | 🔲 | Future: delete UI |
| 70 | Export notes to file | 🔲 | Future: download or File System Access API |

## UI / UX

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 71 | Dark theme | ✅ | CSS variables, dark-first |
| 72 | Responsive layout (desktop) | ✅ | Flex-based two-column layout |
| 72a | Mobile responsive layout | 🔲 | Future: media queries, vertical stacking, touch targets |
| 73 | Status bar with all indicators | ✅ | Recording state, timer, buffer, digest count |
| 74 | Elapsed time counter | ✅ | HH:MM:SS format, pauses excluded |
| 75 | Keyboard shortcuts (Space, S, D, H, 1-5) | ✅ | Global key handler |
| 76 | Help modal (H key) | ✅ | HelpModal with shortcuts list |
| 77 | Consent notice (first recording) | ✅ | ConsentNotice with "don't show again" |
| 78 | Notification system | ✅ | Timed notifications for errors/info |
| 79 | Transcribing indicator | ✅ | StatusBar spinning indicator |
| 80 | Digesting indicator | ✅ | StatusBar spinning indicator |
| 81 | Settings modal | ✅ | Full config editing |
| 82 | Reset settings to defaults | ✅ | Button in SettingsModal |
| 83a | First-run setup wizard | ✅ | Auto-opens SettingsModal with "Getting Started" banner |
| 83b | Ollama auto-detection | ✅ | Probes localhost on settings open, suggests switch |
| 83c | Enhanced provider help tips | ✅ | Step-by-step Ollama setup, OpenAI API key link |

## Infrastructure / Deployment

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 83 | Vercel deployment | ✅ | vercel.json with COOP/COEP headers |
| 84 | GitHub Pages deployment | 🔲 | Future: coi-serviceworker for COOP/COEP |
| 85 | COOP/COEP headers (SharedArrayBuffer) | ✅ | Vercel headers + Vite dev server |
| 86 | GitHub Actions CI (web) | ✅ | web-ci.yml: typecheck, lint, test, build |
| 87 | Clean Architecture enforcement (eslint) | ✅ | eslint-plugin-boundaries |

## Testing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 88 | Entity unit tests | ✅ | types, digest-state |
| 89 | Use case unit tests | ✅ | digest, compact, quick-action, prompt-builder |
| 90 | Adapter unit tests | ✅ | openai-llm, ollama-llm, persistence, whisper-api |
| 91 | Controller unit tests | ✅ | session-controller |
| 92 | E2E tests (Playwright) | ✅ | Smoke tests: startup, template select, settings, help, status bar, consent |

## File Transcription Mode

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 93 | Transcribe existing audio file | ➖ | Desktop-only (ffmpeg + file I/O) |
| 94 | FileTranscriptionWorker | ➖ | Desktop-only |

## Session Viewer

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 95 | Read-only session viewer | 🔲 | Future: view saved sessions |
| 96 | Session picker UI | 🔲 | Future: browse sessions |

---

## Summary

| Category | ✅ Done | 🔲 TODO | ➖ N/A |
|----------|---------|---------|--------|
| Core Recording | 16 | 1 | 3 |
| LLM Digest | 13 | 0 | 0 |
| LLM Providers | 7 | 0 | 0 |
| Quick Actions | 5 | 0 | 0 |
| Templates | 17 | 1 | 0 |
| Session Mgmt | 4 | 4 | 0 |
| UI/UX | 12 | 1 | 0 |
| Infra/Deploy | 4 | 1 | 0 |
| Testing | 5 | 0 | 0 |
| File Transcription | 0 | 0 | 2 |
| Session Viewer | 0 | 2 | 0 |
| **Total** | **83** | **10** | **5** |

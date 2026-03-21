# Getting Started

This guide walks you through setting up lazy-take-notes from scratch. No prior experience with Ollama, OpenAI, or terminal tools is assumed.

lazy-take-notes is available in two versions:

- **[Desktop (Python TUI)](#desktop-python-tui)** — runs in your terminal, supports mic + system audio, uses whisper.cpp for transcription
- **[Web App](#web-app)** — runs in any modern browser, uses local Whisper via WebGPU/WASM or cloud transcription

---

## Desktop (Python TUI)

### 1. Install Python

You need Python 3.11 or newer.

**Check if you already have it:**

```bash
python --version
# or on some systems:
python3 --version
```

If the output shows `3.11` or higher, you're good. Otherwise:

| Platform | How to install                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| macOS    | `brew install python@3.12` (requires [Homebrew](https://brew.sh))                                                                         |
| Linux    | `sudo apt install python3.12` (Ubuntu/Debian) or your distro's package manager                                                            |
| Windows  | `winget install Python.Python.3.12` or download from [python.org](https://www.python.org/downloads/) (check "Add to PATH" during install) |

### 2. Install lazy-take-notes

#### Recommended: one-line setup (macOS / Linux)

This installs all dependencies, picks your AI provider, and creates a `take-note` shortcut:

```bash
curl -fsSL https://raw.githubusercontent.com/CJHwong/lazy-take-notes/main/setup.sh | bash
```

After it finishes, skip to [Step 4](#4-first-run) — the script handles everything in between.

#### Manual install

If you prefer to set things up yourself, use [uv](https://docs.astral.sh/uv/getting-started/installation/):

```bash
# install uv (one-time)
curl -LsSf https://astral.sh/uv/install.sh | sh

# try without installing
uvx --from git+https://github.com/CJHwong/lazy-take-notes.git lazy-take-notes

# or clone and install locally
git clone https://github.com/CJHwong/lazy-take-notes.git
cd lazy-take-notes
uv sync
```

If you prefer pip:

```bash
pip install -e .
```

### 3. Set up an LLM backend

lazy-take-notes needs a large language model to generate digests and answer questions. You have two options.

You can edit settings with `take-note config` or manually in `config.yaml` — see [Config in the README](README.md#config) for the path on your OS.

#### Option A: Ollama (default, local, free, private)

Ollama runs models on your machine. Nothing leaves your computer.

1. **Install Ollama** by following the [official quickstart](https://docs.ollama.com/quickstart):
   - macOS: `brew install ollama` or download from [ollama.com](https://ollama.com)
   - Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - Windows: download from [ollama.com](https://ollama.com)

2. **Start the Ollama server** (it may already be running after install):

   ```bash
   ollama serve
   ```

3. **Pull the default model** (downloads it — ~14 GB):

   ```bash
   ollama pull gpt-oss:20b
   ```

4. **Verify it works:**

   ```bash
   ollama run gpt-oss:20b "Say hello"
   ```

5. **That's it** — the default config already uses `gpt-oss:20b`. No `config.yaml` needed.

> **Want more power?** Ollama also offers [cloud-hosted models](https://docs.ollama.com/cloud) that run on their servers — no GPU required. Sign in with `ollama signin`, then set the models in your config:
>
> ```yaml
> digest:
>   model: "gpt-oss:120b-cloud"
> interactive:
>   model: "gpt-oss:20b-cloud"
> ```

#### Option B: OpenAI-compatible API (cloud)

Use OpenAI, Groq, Together, Google Gemini, or any provider with an OpenAI-compatible API. Requires an internet connection and an API key.

1. **Get an API key** from your provider:
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (see [quickstart guide](https://platform.openai.com/docs/quickstart))

2. **Set your API key** as an environment variable (so it's not stored in config files):

   ```bash
   # add to your shell profile (~/.zshrc, ~/.bashrc, etc.) for persistence
   export OPENAI_API_KEY="sk-your-key-here"
   ```

3. **Configure lazy-take-notes:**

   ```yaml
   llm_provider: openai
   openai:
     base_url: "https://api.openai.com/v1"   # change for other providers
   digest:
     model: "gpt-4o"
   interactive:
     model: "gpt-4o-mini"
   ```

### 4. First run

```bash
take-note record
```

You'll see:

1. **Template picker** — choose a template (e.g. `default_en` for English). Use arrow keys and Enter.
2. **Audio mode picker** — choose how to capture audio:
   - **Mic only** — records your microphone
   - **System only** — records system audio (what you hear through speakers)
   - **Mix** — records both mic and system audio together
3. **The main TUI** — two panels appear:
   - Left: live transcript (updates as you speak)
   - Right: digest (generated periodically from the transcript)

**While recording:**

| Key     | Action                          |
| ------- | ------------------------------- |
| `Space` | Pause / resume recording        |
| `s`     | Stop recording                  |
| `c`     | Copy focused panel to clipboard |
| `Tab`   | Switch panel focus              |
| `h`     | Help (shows all keys)           |
| `q`     | Quit                            |

When you quit, your session is saved to the `output/` directory.

**Want to change settings later?** Run `take-note config` to open the built-in settings editor.

### 5. Troubleshooting

#### "LLM provider not reachable"

- **Ollama (local):** Make sure `ollama serve` is running. Test with `ollama list`.
- **Ollama (cloud):** Make sure you've signed in with `ollama signin`. If using the API directly, check that `OLLAMA_API_KEY` is set.
- **OpenAI:** Check that `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`. Make sure it starts with `sk-`.

#### "No input audio devices found"

- Check that your microphone is connected and not muted.
- On macOS, grant Terminal/iTerm microphone access in System Settings > Privacy & Security > Microphone.
- On Linux, check PulseAudio/PipeWire is running: `pactl info`.

#### Model not found (Ollama)

If you see a warning about missing models, pull them first:

```bash
ollama pull <model-name>
```

For cloud models, make sure you're signed in (`ollama signin`) before pulling.

#### Model not found (OpenAI)

Check for typos in your `config.yaml` model names. Valid OpenAI model names include `gpt-4o`, `gpt-4o-mini`, etc. Check your provider's docs for available models.

#### Digests are slow or low quality

The default model (`gpt-oss:20b`) needs ~14 GB of RAM/VRAM. If your machine struggles to load it or the output quality isn't good enough:

- **Try a smaller model:** `ollama pull llama3.2`, then set `model: "llama3.2"` in your config.
- **Use cloud models instead:** Sign in with `ollama signin` and switch to `gpt-oss:120b-cloud` — see the cloud option in [Step 3](#3-set-up-an-llm-backend).
- **Use an OpenAI-compatible API:** Switch to [Option B](#option-b-openai-compatible-api-cloud) for cloud-hosted models like `gpt-4o`.

#### "Permission denied" on system audio (macOS)

System audio capture requires Screen Recording permission. macOS will prompt you on first use — click Allow, then restart the app.

#### Nothing happens when I speak

- Check that recording isn't paused (press `Space` to resume).
- Speak louder or closer to the mic — the app uses voice activity detection and ignores quiet noise.
- Try lowering `silence_threshold` in your config (default: `0.01`).

---

## Web App

The web version runs entirely in the browser. No Python or whisper.cpp install needed — transcription runs locally via WebGPU/WASM, or you can use the OpenAI Whisper API.

### 1. Install Node.js and pnpm

You need Node.js 18+ and pnpm.

**Check if you already have them:**

```bash
node --version   # should show v18 or higher
pnpm --version   # should show a version number
```

If not installed:

| Tool   | How to install                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------ |
| Node.js | [nodejs.org](https://nodejs.org/) or `brew install node` (macOS)                                 |
| pnpm   | `npm install -g pnpm` or `corepack enable` (Node.js 16.17+) or see [pnpm.io](https://pnpm.io/) |

### 2. Start the web app

```bash
cd web
pnpm install
pnpm run dev
```

Open **http://localhost:5173** in your browser (Chrome or Edge recommended for best performance).

### 3. Configure on first run

The **Settings modal** opens automatically the first time you visit:

1. **Choose your LLM provider:**
   - **Ollama** (local, free, private) — make sure Ollama is running (`ollama serve`). See the [Ollama setup instructions](#option-a-ollama-default-local-free-private) above.
   - **OpenAI** — enter your API key.
   - **OpenAI-compatible** — enter your API key and base URL.

2. **Choose your transcription backend:**
   - **Local (WebGPU/WASM)** — runs Whisper locally in your browser. Uses GPU acceleration on Chrome/Edge, falls back to CPU (WASM) on other browsers.
   - **Cloud** — sends audio to the OpenAI Whisper API. Requires an OpenAI API key.

3. **Test your connection** — click the "Test Connection" button to verify your LLM is reachable.

4. **Close settings** and select a template from the grid. Click **Start Recording** — the browser will ask for microphone permission.

### 4. Keyboard shortcuts

| Key     | Action               |
| ------- | -------------------- |
| `Space` | Pause / resume       |
| `s`     | Stop recording       |
| `d`     | Trigger digest       |
| `h`     | Help                 |
| `1`–`5` | Quick actions        |

### 5. Troubleshooting (Web)

#### Ollama not reachable from the browser

If Ollama is running locally but the web app can't connect, you likely need to enable CORS. Set the environment variable before starting Ollama:

```bash
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

The web app will show a CORS detection hint if it detects this issue.

#### Whisper model download is slow

Local Whisper models are downloaded from Hugging Face on first use (~50–150 MB depending on model size). If it's too slow, switch to the **Cloud** transcription backend in Settings (requires an OpenAI API key).

#### No microphone access

- Make sure you clicked "Allow" when the browser asked for mic permission.
- Check your browser's site settings (click the lock icon in the address bar).
- HTTPS is required for mic access on deployed sites (localhost is exempt).

#### "SharedArrayBuffer is not defined"

Local Whisper requires special headers (COOP/COEP). The Vite dev server sets these automatically. If you're deploying, make sure your server sends:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

See `web/vercel.json` for an example.

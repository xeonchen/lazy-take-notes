import { useEffect, useState } from 'react';
import { DEFAULT_APP_CONFIG, DEFAULT_INFRA_CONFIG, AVAILABLE_WHISPER_MODELS, SUGGESTED_MODELS, MODEL_NAMES, type AppConfig, type InfraConfig, type LLMProvider } from '../../entities/config';

interface Props {
  appConfig: AppConfig;
  infraConfig: InfraConfig;
  isFirstRun?: boolean;
  onSave: (app: AppConfig, infra: InfraConfig) => void;
  onTestConnection: (infra: InfraConfig) => Promise<{ ok: boolean; error: string }>;
  onClose: () => void;
}

export function SettingsModal({ appConfig, infraConfig, isFirstRun, onSave, onTestConnection, onClose }: Props) {
  const [app, setApp] = useState<AppConfig>(structuredClone(appConfig));
  const [infra, setInfra] = useState<InfraConfig>(structuredClone(infraConfig));
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [ollamaDetected, setOllamaDetected] = useState<boolean | null>(null);

  // Auto-probe Ollama on mount using the configured host
  useEffect(() => {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 3000);
    const host = infraConfig.ollama.host || 'http://localhost:11434';
    fetch(`${host}/api/tags`, { signal: ctrl.signal })
      .then((r) => setOllamaDetected(r.ok))
      .catch(() => setOllamaDetected(false))
      .finally(() => clearTimeout(timeoutId));
    return () => { ctrl.abort(); clearTimeout(timeoutId); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- probe once on mount with initial config

  const handleSave = () => {
    onSave(app, infra);
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(infra);
      setTestResult(result.ok ? 'Connection OK!' : `Failed: ${result.error}`);
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    setApp(structuredClone(DEFAULT_APP_CONFIG));
    setInfra(structuredClone(DEFAULT_INFRA_CONFIG));
  };

  const switchToOllama = () => {
    setInfra({ ...infra, llmProvider: 'ollama' });
    const suggested = SUGGESTED_MODELS.ollama;
    setApp((prev) => ({
      ...prev,
      digest: { ...prev.digest, model: suggested.digest },
      interactive: { ...prev.interactive, model: suggested.interactive },
    }));
  };

  const modelPlaceholder = infra.llmProvider === 'ollama'
    ? `e.g. ${MODEL_NAMES.OLLAMA_DEFAULT}, ${MODEL_NAMES.OLLAMA_CLOUD_DIGEST}`
    : `e.g. ${MODEL_NAMES.OPENAI_DEFAULT}, ${MODEL_NAMES.OPENAI_LARGE}`;

  return (
    <div className="modal-overlay" onClick={isFirstRun ? undefined : onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{isFirstRun ? 'Getting Started' : 'Settings'}</span>
          {!isFirstRun && <button className="btn btn-sm" onClick={onClose}>✕</button>}
        </div>
        <div className="modal-body">
          {/* First-run welcome banner */}
          {isFirstRun && (
            <div className="setup-banner">
              <strong>Welcome to lazy-take-notes</strong>
              <p>Configure your AI provider to get started. You can change these settings anytime.</p>
            </div>
          )}

          {/* AI Provider */}
          <div className="settings-section">
            <h3>AI Provider</h3>
            <div className="field-group">
              <label>Provider</label>
              <select
                value={infra.llmProvider}
                onChange={(e) => {
                  const provider = e.target.value as LLMProvider;
                  setInfra({ ...infra, llmProvider: provider });
                  // Auto-suggest models for the new provider
                  const suggested = SUGGESTED_MODELS[provider];
                  setApp((prev) => ({
                    ...prev,
                    digest: { ...prev.digest, model: suggested.digest },
                    interactive: { ...prev.interactive, model: suggested.interactive },
                  }));
                }}
              >
                <option value="openai">OpenAI / Compatible API</option>
                <option value="ollama">Ollama (local)</option>
              </select>
              {infra.llmProvider === 'ollama' ? (
                <div className="help-text">
                  Runs models on your computer (free, private).
                  <ol className="setup-steps">
                    <li>Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a></li>
                    <li>Start with CORS: <code>OLLAMA_ORIGINS=* ollama serve</code></li>
                    <li>Pull a model: <code>ollama pull {MODEL_NAMES.OLLAMA_DEFAULT}</code></li>
                    <li>Click &quot;Test Connection&quot; below to verify</li>
                  </ol>
                  <span className="help-detail">On macOS with Ollama.app, set OLLAMA_ORIGINS=* as an environment variable and restart.</span>
                </div>
              ) : (
                <div className="help-text">
                  Uses a cloud API. Works with OpenAI, Groq, Together, vLLM, or any OpenAI-compatible endpoint.
                </div>
              )}
            </div>

            {/* Ollama detected hint */}
            {ollamaDetected === true && infra.llmProvider !== 'ollama' && (
              <div className="help-text" style={{ color: 'var(--success)' }}>
                Ollama detected at localhost:11434.{' '}
                <button className="btn-link" onClick={switchToOllama}>Switch to Ollama</button>
              </div>
            )}
            {ollamaDetected === false && infra.llmProvider === 'ollama' && (
              <div className="help-text" style={{ color: 'var(--warning, #e8a838)' }}>
                Ollama not detected at {infra.ollama.host}. Make sure it is running with OLLAMA_ORIGINS=*.
              </div>
            )}

            {infra.llmProvider === 'openai' && (
              <>
                <div className="field-group">
                  <label>API Base URL</label>
                  <input
                    value={infra.openai.baseUrl}
                    onChange={(e) => setInfra({ ...infra, openai: { ...infra.openai, baseUrl: e.target.value } })}
                    placeholder="https://api.openai.com/v1"
                  />
                  <div className="help-text">Change for Groq, Together, vLLM, LiteLLM, etc.</div>
                </div>
                <div className="field-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={infra.openai.apiKey}
                    onChange={(e) => setInfra({ ...infra, openai: { ...infra.openai, apiKey: e.target.value } })}
                    placeholder="sk-..."
                  />
                  <div className="help-text">
                    Stored locally in your browser only.
                    Get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a>.
                  </div>
                </div>
              </>
            )}

            {infra.llmProvider === 'ollama' && (
              <div className="field-group">
                <label>Ollama Server Address</label>
                <input
                  value={infra.ollama.host}
                  onChange={(e) => setInfra({ ...infra, ollama: { ...infra.ollama, host: e.target.value } })}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn" onClick={handleTest} disabled={testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <span style={{ fontSize: '0.8rem', color: testResult.startsWith('Connection') ? 'var(--success)' : 'var(--error)' }}>
                  {testResult}
                </span>
              )}
            </div>
          </div>

          {/* Models */}
          <div className="settings-section">
            <h3>AI Models</h3>
            <div className="field-group">
              <label>Summary Model</label>
              <input
                value={app.digest.model}
                onChange={(e) => setApp({ ...app, digest: { ...app.digest, model: e.target.value } })}
                placeholder={modelPlaceholder}
              />
            </div>
            <div className="field-group">
              <label>Quick-Action Model</label>
              <input
                value={app.interactive.model}
                onChange={(e) => setApp({ ...app, interactive: { ...app.interactive, model: e.target.value } })}
                placeholder={modelPlaceholder}
              />
            </div>
          </div>

          {/* Transcription */}
          <div className="settings-section">
            <h3>Speech-to-Text</h3>
            <div className="field-group">
              <label>Transcription Backend</label>
              <select
                value={infra.transcriptionBackend}
                onChange={(e) => setInfra({ ...infra, transcriptionBackend: e.target.value as 'webgpu' | 'wasm' | 'cloud' })}
              >
                <option value="webgpu">Local (WebGPU/WASM) — Free, private</option>
                <option value="cloud">Cloud (OpenAI Whisper API) — Fast, requires API key</option>
              </select>
            </div>
            {infra.transcriptionBackend !== 'cloud' && (
              <div className="field-group">
                <label>Whisper Model</label>
                <select
                  value={app.transcription.model}
                  onChange={(e) => setApp({ ...app, transcription: { ...app.transcription, model: e.target.value } })}
                >
                  {AVAILABLE_WHISPER_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="help-text">Larger models are more accurate but slower. base is recommended for real-time.</div>
              </div>
            )}
          </div>

          {/* Digest Settings */}
          <div className="settings-section">
            <h3>Summary Trigger</h3>
            <div className="field-group">
              <label>After at least N lines</label>
              <input
                type="number"
                value={app.digest.minLines}
                onChange={(e) => setApp({ ...app, digest: { ...app.digest, minLines: parseInt(e.target.value) || 15 } })}
              />
            </div>
            <div className="field-group">
              <label>Wait at least N seconds</label>
              <input
                type="number"
                value={app.digest.minInterval}
                onChange={(e) => setApp({ ...app, digest: { ...app.digest, minInterval: parseInt(e.target.value) || 60 } })}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={handleReset}>Reset to Defaults</button>
          <button className="btn" onClick={onClose}>{isFirstRun ? 'Skip' : 'Cancel'}</button>
          <button className="btn btn-primary" onClick={handleSave}>{isFirstRun ? 'Save & Start' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

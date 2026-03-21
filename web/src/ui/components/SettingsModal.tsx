import { useState } from 'react';
import { DEFAULT_APP_CONFIG, DEFAULT_INFRA_CONFIG, AVAILABLE_WHISPER_MODELS, type AppConfig, type InfraConfig } from '../../entities/config';

interface Props {
  appConfig: AppConfig;
  infraConfig: InfraConfig;
  onSave: (app: AppConfig, infra: InfraConfig) => void;
  onTestConnection: (infra: InfraConfig) => Promise<{ ok: boolean; error: string }>;
  onClose: () => void;
}

export function SettingsModal({ appConfig, infraConfig, onSave, onTestConnection, onClose }: Props) {
  const [app, setApp] = useState<AppConfig>(structuredClone(appConfig));
  const [infra, setInfra] = useState<InfraConfig>(structuredClone(infraConfig));
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Settings</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* AI Provider */}
          <div className="settings-section">
            <h3>AI Provider</h3>
            <div className="field-group">
              <label>Provider</label>
              <select
                value={infra.llmProvider}
                onChange={(e) => setInfra({ ...infra, llmProvider: e.target.value as 'ollama' | 'openai' })}
              >
                <option value="openai">OpenAI / Compatible API</option>
                <option value="ollama">Ollama (local)</option>
              </select>
              <div className="help-text">
                {infra.llmProvider === 'ollama'
                  ? 'Runs models on your computer (free, private). Requires OLLAMA_ORIGINS=* for browser access.'
                  : 'Uses a cloud API (needs an API key).'}
              </div>
            </div>

            {infra.llmProvider === 'openai' && (
              <>
                <div className="field-group">
                  <label>API Base URL</label>
                  <input
                    value={infra.openai.baseUrl}
                    onChange={(e) => setInfra({ ...infra, openai: { ...infra.openai, baseUrl: e.target.value } })}
                    placeholder="https://api.openai.com/v1"
                  />
                  <div className="help-text">Change for Groq, Together, vLLM, etc.</div>
                </div>
                <div className="field-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={infra.openai.apiKey}
                    onChange={(e) => setInfra({ ...infra, openai: { ...infra.openai, apiKey: e.target.value } })}
                    placeholder="sk-..."
                  />
                  <div className="help-text">Stored in browser localStorage. Do not use on shared computers.</div>
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
                <div className="help-text">Set OLLAMA_ORIGINS=* and restart Ollama for browser access.</div>
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
                placeholder="gpt-4o-mini"
              />
            </div>
            <div className="field-group">
              <label>Quick-Action Model</label>
              <input
                value={app.interactive.model}
                onChange={(e) => setApp({ ...app, interactive: { ...app.interactive, model: e.target.value } })}
                placeholder="gpt-4o-mini"
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
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

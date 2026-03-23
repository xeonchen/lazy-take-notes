import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_APP_CONFIG, DEFAULT_INFRA_CONFIG, type AppConfig, type InfraConfig, modelForLocale } from './entities/config';
import type { SessionTemplate } from './entities/template';
import { IndexedDBPersistence } from './adapters/persistence';
import { OpenAILLMClient } from './adapters/openai-llm';
import { OllamaLLMClient } from './adapters/ollama-llm';
import { WhisperTransformersTranscriber } from './adapters/whisper-transformers';
import { WhisperApiTranscriber } from './adapters/whisper-api';
import type { LLMClient, Transcriber } from './use-cases/ports';
import { useAudioCapture } from './ui/hooks/useAudioCapture';
import { useTranscription } from './ui/hooks/useTranscription';
import { useSession } from './ui/hooks/useSession';
import { useTemplates } from './ui/hooks/useTemplates';
import { TranscriptPanel } from './ui/components/TranscriptPanel';
import { DigestPanel } from './ui/components/DigestPanel';
import { ContextInput } from './ui/components/ContextInput';
import { StatusBar, type RecordingState } from './ui/components/StatusBar';
import { SettingsModal } from './ui/components/SettingsModal';
import { TemplateSelector } from './ui/components/TemplateSelector';
import { TemplateEditor } from './ui/components/TemplateEditor';
import { QueryModal } from './ui/components/QueryModal';
import { ConsentNotice } from './ui/components/ConsentNotice';
import { HelpModal } from './ui/components/HelpModal';
import { DownloadProgress } from './ui/components/DownloadProgress';

type AppScreen = 'template-select' | 'recording' | 'stopped';

const persistence = new IndexedDBPersistence();

function buildLLMClient(infra: InfraConfig): LLMClient {
  if (infra.llmProvider === 'openai') {
    return new OpenAILLMClient(infra.openai.apiKey, infra.openai.baseUrl);
  }
  return new OllamaLLMClient(infra.ollama.host);
}

function buildTranscriber(infra: InfraConfig): Transcriber {
  if (infra.transcriptionBackend === 'cloud') {
    return new WhisperApiTranscriber(infra.openai.apiKey, infra.openai.baseUrl);
  }
  return new WhisperTransformersTranscriber();
}

export default function App() {
  // Config
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [infraConfig, setInfraConfig] = useState<InfraConfig>(DEFAULT_INFRA_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  // UI state
  const [screen, setScreen] = useState<AppScreen>('template-select');
  const [template, setTemplate] = useState<SessionTemplate | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [notification, setNotification] = useState<{ text: string; type: 'info' | 'warning' | 'error' | 'success' } | null>(null);

  // Notifications — cleanup timeout to avoid setting state on unmounted component
  const notifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string, type: 'info' | 'warning' | 'error' | 'success') => {
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    setNotification({ text, type });
    notifyTimerRef.current = setTimeout(() => setNotification(null), 5000);
  }, []);
  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    };
  }, []);

  // Templates
  const { templates, editingTemplate, actions: templateActions } = useTemplates(notify);

  // Timing
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastDigestAgo, setLastDigestAgo] = useState<number | null>(null);
  const startTimeRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const lastDigestTimeRef = useRef<number | null>(null);
  const [levelHistory, setLevelHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const handleStopRef = useRef<() => void>(() => {});

  // Build adapters
  const llmClient = useMemo(() => buildLLMClient(infraConfig), [infraConfig]);
  const transcriber = useMemo(() => buildTranscriber(infraConfig), [infraConfig]);

  // Hooks
  const transcription = useTranscription(
    transcriber,
    template?.metadata.locale?.split('-')[0]?.toLowerCase() ?? 'en',
    [...(appConfig.recognitionHints ?? []), ...(template?.recognitionHints ?? [])],
  );

  const session = useSession(appConfig, template, llmClient, persistence);

  // Audio callbacks
  const handleAudioData = useCallback(
    (chunk: Float32Array) => {
      const promise = transcription.feedAudio(chunk);
      if (promise) {
        promise
          .then((segments) => {
            if (segments.length > 0) {
              session.onSegments(segments);
            }
          })
          .catch((err) => {
            console.error('Transcription pipeline error:', err);
          });
      }
    },
    [transcription, session],
  );

  const handleAudioLevel = useCallback((rms: number) => {
    setLevelHistory((prev) => [...prev.slice(1), rms]);
  }, []);

  const [audioState, audioActions] = useAudioCapture(handleAudioData, handleAudioLevel);

  // Load config + user templates on mount
  useEffect(() => {
    (async () => {
      const saved = await persistence.loadConfig<{ app: AppConfig; infra: InfraConfig }>();
      if (saved) {
        setAppConfig(saved.app);
        setInfraConfig(saved.infra);
      } else if (!localStorage.getItem('ltn-setup-completed')) {
        // First run — auto-open settings to guide user
        setIsFirstRun(true);
        setShowSettings(true);
      }

      setConfigLoaded(true);

      // Check consent
      const consentDismissed = localStorage.getItem('ltn-consent-dismissed');
      if (!consentDismissed) {
        setShowConsent(true);
      }
    })();
  }, []);

  // Timer tick
  useEffect(() => {
    if (screen !== 'recording') return;
    const interval = setInterval(() => {
      if (!audioState.isCapturing) return;
      const now = performance.now() / 1000;
      let paused = pausedTotalRef.current;
      if (pauseStartRef.current !== null) {
        paused += now - pauseStartRef.current;
      }
      setElapsedSeconds(now - startTimeRef.current - paused);

      if (lastDigestTimeRef.current !== null) {
        setLastDigestAgo(now - lastDigestTimeRef.current);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [screen, audioState.isCapturing]);

  // Update lastDigestTime when digest completes
  useEffect(() => {
    if (session.digestMarkdown) {
      lastDigestTimeRef.current = performance.now() / 1000;
    }
  }, [session.digestMarkdown]);

  // Track pause time
  useEffect(() => {
    if (audioState.isPaused) {
      pauseStartRef.current = performance.now() / 1000;
    } else if (pauseStartRef.current !== null) {
      pausedTotalRef.current += performance.now() / 1000 - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [audioState.isPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSettings || showHelp || session.queryResult || editingTemplate) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if (key === ' ' && screen === 'recording') {
        e.preventDefault();
        if (audioState.isPaused) audioActions.resume();
        else audioActions.pause();
      } else if (key === 's' && screen === 'recording' && audioState.isCapturing) {
        e.preventDefault();
        handleStopRef.current();
      } else if (key === 'd' && screen !== 'template-select') {
        e.preventDefault();
        if (!session.isDigesting && session.bufferCount > 0) {
          session.runDigest(false);
        }
      } else if (key === 'h') {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (key >= '1' && key <= '5') {
        if (!session.isDigesting && !session.isQuerying && template) {
          const idx = parseInt(key);
          if (idx <= (template.quickActions?.length ?? 0)) {
            session.runQuickAction(key);
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, audioState, showSettings, showHelp, editingTemplate, session, audioActions, template]);

  // Template selection
  const handleTemplateSelect = (t: SessionTemplate) => {
    setTemplate(t);
    setScreen('recording');
  };

  // Start recording
  const handleStartRecording = async () => {
    session.initSession();
    startTimeRef.current = performance.now() / 1000;
    pausedTotalRef.current = 0;
    pauseStartRef.current = null;
    lastDigestTimeRef.current = null;
    setElapsedSeconds(0);
    setLastDigestAgo(null);

    // Load whisper model
    const locale = template?.metadata.locale ?? 'en';
    const modelId = modelForLocale(appConfig.transcription, locale);
    await transcription.loadModel(modelId);

    // Start audio
    await audioActions.start();
  };

  // Stop recording
  const handleStop = async () => {
    audioActions.stop();

    // Flush remaining audio
    const segments = await transcription.flush();
    if (segments.length > 0) {
      await session.onSegments(segments);
    }

    // Final digest
    if (session.bufferCount > 0 || session.segments.length > 0) {
      await session.runDigest(true);
    }

    setScreen('stopped');
    notify('Recording stopped. Final digest generated.', 'info');
  };
  handleStopRef.current = handleStop;

  // New session — go back to template selection
  const handleNewSession = () => {
    session.resetSession();
    setScreen('template-select');
    setTemplate(null);
    setElapsedSeconds(0);
    setLastDigestAgo(null);
    setLevelHistory([0, 0, 0, 0, 0, 0]);
    setUserContext('');
  };

  // Settings
  const handleSaveSettings = async (app: AppConfig, infra: InfraConfig) => {
    setAppConfig(app);
    setInfraConfig(infra);
    await persistence.saveConfig({ app, infra });
    localStorage.setItem('ltn-setup-completed', '1');
    setIsFirstRun(false);
    notify('Settings saved', 'success');
  };

  const handleTestConnection = async (infra: InfraConfig) => {
    const client = buildLLMClient(infra);
    return client.checkConnectivity();
  };

  // Compute recording state
  const recordingState: RecordingState = (() => {
    if (screen === 'stopped') return 'stopped';
    if (audioState.error) return 'error';
    if (transcription.downloadProgress !== null) return 'loading';
    if (audioState.isPaused) return 'paused';
    if (audioState.isCapturing) return 'recording';
    return 'idle';
  })();

  if (!configLoaded) return null;

  // Template selection screen
  if (screen === 'template-select') {
    return (
      <div className="app">
        <div className="app-header">
          <span className="logo">lazy-<span>take-notes</span></span>
          <div className="actions">
            <button className="btn" onClick={() => setShowSettings(true)}>Settings</button>
          </div>
        </div>
        <TemplateSelector
          templates={templates}
          selected={template?.metadata.key ?? null}
          onSelect={handleTemplateSelect}
          onEdit={templateActions.edit}
          onDuplicate={templateActions.duplicate}
          onDelete={templateActions.delete}
          onCreate={templateActions.create}
        />
        {editingTemplate && (
          <TemplateEditor
            template={editingTemplate}
            onSave={templateActions.save}
            onCancel={templateActions.cancelEdit}
          />
        )}
        {showSettings && (
          <SettingsModal
            appConfig={appConfig}
            infraConfig={infraConfig}
            isFirstRun={isFirstRun}
            onSave={handleSaveSettings}
            onTestConnection={handleTestConnection}
            onClose={() => { setShowSettings(false); setIsFirstRun(false); }}
          />
        )}
        {showConsent && !showSettings && (
          <ConsentNotice
            onDismiss={() => setShowConsent(false)}
            onNeverShow={() => {
              localStorage.setItem('ltn-consent-dismissed', '1');
              setShowConsent(false);
            }}
          />
        )}
      </div>
    );
  }

  // Recording / stopped screen
  return (
    <div className="app">
      {/* Header */}
      <div className="app-header">
        <span className="logo">lazy-<span>take-notes</span></span>
        {template && (
          <span className="template-info">
            {template.metadata.name}
            {template.metadata.locale && ` [${template.metadata.locale}]`}
          </span>
        )}
        <div className="actions">
          {screen === 'recording' && !audioState.isCapturing && recordingState === 'idle' && (
            <button className="btn btn-primary" onClick={handleStartRecording}>
              Start Recording
            </button>
          )}
          {screen === 'recording' && audioState.isCapturing && !audioState.isPaused && (
            <button className="btn" onClick={audioActions.pause}>Pause</button>
          )}
          {screen === 'recording' && audioState.isPaused && (
            <button className="btn btn-primary" onClick={audioActions.resume}>Resume</button>
          )}
          {screen === 'recording' && audioState.isCapturing && (
            <button className="btn btn-danger" onClick={handleStop}>Stop</button>
          )}
          {screen === 'stopped' && (
            <button className="btn btn-primary" onClick={handleNewSession}>New Session</button>
          )}
          {!session.isDigesting && session.bufferCount > 0 && (
            <button className="btn" onClick={() => session.runDigest(false)}>Digest</button>
          )}
          <button className="btn" onClick={() => setShowSettings(true)}>Settings</button>
          <button className="btn" onClick={() => setShowHelp(true)}>Help</button>
        </div>
      </div>

      {/* Error banner */}
      {audioState.error && (
        <div className="reload-banner" style={{ background: 'var(--error)', color: 'white' }}>
          {audioState.error}
        </div>
      )}

      {/* Main content */}
      <div className="main-panels">
        <TranscriptPanel segments={session.segments} />
        <div className="digest-col" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <DigestPanel markdown={session.digestMarkdown} isLoading={session.isDigesting} />
          <ContextInput
            value={userContext}
            onChange={(v) => {
              setUserContext(v);
              session.setUserContext(v);
            }}
            disabled={screen === 'stopped'}
          />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        state={recordingState}
        bufferCount={session.bufferCount}
        bufferMax={appConfig.digest.minLines}
        elapsedSeconds={elapsedSeconds}
        lastDigestAgo={lastDigestAgo}
        levelHistory={levelHistory}
        isTranscribing={transcription.isTranscribing}
        activity={session.isDigesting ? 'Digesting...' : session.isQuerying ? 'Running action...' : ''}
        downloadProgress={transcription.downloadProgress}
        downloadModel={appConfig.transcription.model}
        modeLabel="Record"
        quickActions={(template?.quickActions ?? []).map((qa, i) => ({ label: qa.label, index: i }))}
        onQuickAction={(key) => session.runQuickAction(key)}
      />

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          appConfig={appConfig}
          infraConfig={infraConfig}
          isFirstRun={isFirstRun}
          onSave={handleSaveSettings}
          onTestConnection={handleTestConnection}
          onClose={() => { setShowSettings(false); setIsFirstRun(false); }}
        />
      )}

      {showHelp && template && (
        <HelpModal template={template} config={appConfig} onClose={() => setShowHelp(false)} />
      )}

      {session.queryResult && (
        <QueryModal
          title={session.queryResult.label}
          body={session.queryResult.result}
          isError={session.queryResult.result.startsWith('Error:')}
          onClose={session.clearQueryResult}
        />
      )}

      {transcription.downloadProgress !== null && transcription.downloadProgress < 100 && (
        <DownloadProgress
          modelName={appConfig.transcription.model}
          progress={transcription.downloadProgress}
        />
      )}

      {showConsent && !showSettings && (
        <ConsentNotice
          onDismiss={() => setShowConsent(false)}
          onNeverShow={() => {
            localStorage.setItem('ltn-consent-dismissed', '1');
            setShowConsent(false);
          }}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.text}
        </div>
      )}
    </div>
  );
}

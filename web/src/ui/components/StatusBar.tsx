import { formatElapsed } from '../../entities/types';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'loading' | 'error';

interface Props {
  state: RecordingState;
  bufferCount: number;
  bufferMax: number;
  elapsedSeconds: number;
  lastDigestAgo: number | null;
  levelHistory: number[];
  isTranscribing: boolean;
  activity: string;
  downloadProgress: number | null;
  downloadModel: string;
  modeLabel: string;
  quickActions: Array<{ label: string; index: number }>;
  onQuickAction: (key: string) => void;
}

const WAVE_CHARS = '▁▂▃▄▅▆▇█';

function rmsToBarHeight(rms: number): number {
  if (rms < 1e-7) return 1;
  const db = 20 * Math.log10(Math.min(rms, 1));
  const normalized = (db + 60) / 49; // -60 to -11
  return Math.max(1, Math.min(14, Math.round(normalized * 14)));
}

function rmsToChar(rms: number): string {
  if (rms < 1e-7) return WAVE_CHARS[0]!;
  const db = 20 * Math.log10(Math.min(rms, 1));
  const idx = Math.floor(((db + 60) / 49) * 7);
  return WAVE_CHARS[Math.max(0, Math.min(7, idx))]!;
}

function StateIndicator({ state }: { state: RecordingState }) {
  switch (state) {
    case 'recording':
      return <span className="recording-indicator">● Rec</span>;
    case 'paused':
      return <span className="paused-indicator">❚❚ Paused</span>;
    case 'stopped':
      return <span className="stopped-indicator">■ Stopped</span>;
    case 'loading':
      return <span className="idle-indicator">⟳ Loading</span>;
    case 'error':
      return <span style={{ color: 'var(--error)' }}>✗ Error</span>;
    default:
      return <span className="idle-indicator">○ Idle</span>;
  }
}

export function StatusBar({
  state,
  bufferCount,
  bufferMax,
  elapsedSeconds,
  lastDigestAgo,
  levelHistory,
  isTranscribing,
  activity,
  downloadProgress,
  downloadModel,
  modeLabel,
  quickActions,
  onQuickAction,
}: Props) {
  return (
    <div className="status-bar">
      {modeLabel && (
        <>
          <span className="status-item">{modeLabel}</span>
          <span className="separator">│</span>
        </>
      )}

      <span className="status-item">
        <StateIndicator state={state} />
      </span>

      <span className="separator">│</span>
      <span className="status-item">buf {bufferCount}/{bufferMax}</span>

      <span className="separator">│</span>
      <span className="status-item">{formatElapsed(elapsedSeconds)}</span>

      {lastDigestAgo !== null && (
        <>
          <span className="separator">│</span>
          <span className="status-item">
            last {lastDigestAgo < 60 ? `${Math.floor(lastDigestAgo)}s` : `${Math.floor(lastDigestAgo / 60)}m`} ago
          </span>
        </>
      )}

      {state === 'recording' && levelHistory.length > 0 && (
        <>
          <span className="separator">│</span>
          <span className="status-item level-meter" title="Audio level">
            {levelHistory.map((rms, i) => (
              <span
                key={i}
                className="bar"
                style={{ height: `${rmsToBarHeight(rms)}px` }}
              />
            ))}
          </span>
          <span className="status-item" style={{ fontSize: '0.7rem' }}>
            {levelHistory.map((rms) => rmsToChar(rms)).join('')}
          </span>
        </>
      )}

      {isTranscribing && (
        <>
          <span className="separator">│</span>
          <span className="status-item" style={{ color: 'var(--accent-secondary)' }}>
            ⟳ Transcribing…
          </span>
        </>
      )}

      {activity && (
        <>
          <span className="separator">│</span>
          <span className="status-item" style={{ color: 'var(--accent-secondary)' }}>
            ⟳ {activity}
          </span>
        </>
      )}

      {downloadProgress !== null && (
        <>
          <span className="separator">│</span>
          <span className="status-item">
            ⟳ Downloading {downloadModel}… {downloadProgress}%
          </span>
        </>
      )}

      {quickActions.length > 0 && (
        <span className="quick-actions">
          {quickActions.map((qa) => (
            <button
              key={qa.index}
              className="btn btn-sm"
              onClick={() => onQuickAction(String(qa.index + 1))}
              title={`Quick Action ${qa.index + 1}: ${qa.label}`}
            >
              [{qa.index + 1}] {qa.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

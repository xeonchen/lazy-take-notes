import { SafeMarkdown } from './SafeMarkdown';

interface Props {
  markdown: string;
  isLoading: boolean;
}

export function DigestPanel({ markdown, isLoading }: Props) {
  return (
    <div className="panel digest-panel">
      <div className="panel-header">
        Notes
        {isLoading && <span style={{ marginLeft: '0.5rem', color: 'var(--accent-secondary)' }}>Digesting...</span>}
      </div>
      <div className="panel-content">
        {!markdown && !isLoading && (
          <div style={{ color: 'var(--text-muted)' }}>
            Notes will appear here after enough transcript is collected.
          </div>
        )}
        {markdown && <SafeMarkdown>{markdown}</SafeMarkdown>}
      </div>
    </div>
  );
}

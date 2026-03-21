import { SafeMarkdown } from './SafeMarkdown';

interface Props {
  title: string;
  body: string;
  isError?: boolean;
  onClose: () => void;
}

export function QueryModal({ title, body, isError = false, onClose }: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      // Clipboard API may fail in non-secure contexts; ignore
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span style={isError ? { color: 'var(--error)' } : undefined}>{title}</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {isError ? (
            <pre style={{ color: 'var(--error)', whiteSpace: 'pre-wrap' }}>{body}</pre>
          ) : (
            <SafeMarkdown>{body}</SafeMarkdown>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={handleCopy}>Copy</button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

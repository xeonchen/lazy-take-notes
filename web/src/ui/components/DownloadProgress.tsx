interface Props {
  modelName: string;
  progress: number;
  isLoading?: boolean;
}

export function DownloadProgress({ modelName, progress, isLoading = false }: Props) {
  return (
    <div className="download-overlay">
      <div className="download-modal">
        <h3 style={{ marginBottom: '0.5rem' }}>
          {isLoading ? 'Loading Model...' : 'Downloading Model'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {modelName}
        </p>
        {!isLoading && (
          <>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {progress}% — This only happens once. The model will be cached.
            </p>
          </>
        )}
        {isLoading && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Initializing transcription engine...
          </p>
        )}
      </div>
    </div>
  );
}

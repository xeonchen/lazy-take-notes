import { useEffect, useRef } from 'react';
import { formatWallTime, type TranscriptSegment } from '../../entities/types';

interface Props {
  segments: TranscriptSegment[];
}

export function TranscriptPanel({ segments }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments.length]);

  return (
    <div className="panel transcript-panel">
      <div className="panel-header">Transcript</div>
      <div className="panel-content">
        {segments.length === 0 && (
          <div style={{ color: 'var(--text-muted)' }}>
            Waiting for audio...
          </div>
        )}
        {segments.map((seg, i) => (
          <div key={i} className="segment">
            <span className="timestamp">{formatWallTime(seg.wallStart)}</span>
            {seg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

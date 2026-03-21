import { SafeMarkdown } from './SafeMarkdown';
import type { SessionTemplate } from '../../entities/template';
import type { AppConfig } from '../../entities/config';

interface Props {
  template: SessionTemplate;
  config: AppConfig;
  onClose: () => void;
}

export function HelpModal({ template, config, onClose }: Props) {
  const meta = template.metadata;
  const minLines = config.digest.minLines;

  const helpText = [
    meta.name ? `**Template:** ${meta.name}` : '',
    meta.description ? `**Description:** ${meta.description}` : '',
    meta.locale ? `**Locale:** ${meta.locale}` : '',
    '',
    '### Status Bar',
    '| Indicator | Meaning |',
    '|-----------|---------|',
    '| `● Rec` `❚❚ Paused` `■ Stopped` `○ Idle` | Recording state |',
    `| \`buf N/${minLines}\` | Lines buffered toward next digest |`,
    '| `00:00:00` | Recording time, pauses excluded |',
    '| `last Xs ago` | Time since last digest |',
    '| Level bars | Mic input level |',
    '| `⟳ Transcribing…` | Speech-to-text in progress |',
    '| `⟳ Digesting…` | LLM digest in progress |',
    '',
    '### Keyboard Shortcuts',
    '| Key | Action |',
    '|-----|--------|',
    '| `Space` | Pause / Resume |',
    '| `S` | Stop recording |',
    '| `D` | Force digest now |',
    '| `1-5` | Quick actions |',
    '| `H` | Toggle help |',
    '| `Esc` | Close modal |',
  ]
    .join('\n');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Help</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <SafeMarkdown>{helpText}</SafeMarkdown>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

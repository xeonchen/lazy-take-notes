import type { SessionTemplate } from '../../entities/template';

interface Props {
  templates: SessionTemplate[];
  selected: string | null;
  onSelect: (template: SessionTemplate) => void;
}

export function TemplateSelector({ templates, selected, onSelect }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <span>Select a Template</span>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Choose a template to define the AI's behavior and summary format.
          </p>
          <div className="template-grid">
            {templates.map((t) => (
              <div
                key={t.metadata.key}
                className={`template-card ${selected === t.metadata.key ? 'selected' : ''}`}
                onClick={() => onSelect(t)}
              >
                <div className="name">{t.metadata.name}</div>
                <div className="description">{t.metadata.description}</div>
                <div className="locale">{t.metadata.locale}</div>
                {t.quickActions.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {t.quickActions.length} quick action{t.quickActions.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

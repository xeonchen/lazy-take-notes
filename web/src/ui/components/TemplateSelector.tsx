import { useState } from 'react';
import type { SessionTemplate } from '../../entities/template';
import { TemplatePreview } from './TemplatePreview';

interface Props {
  templates: SessionTemplate[];
  selected: string | null;
  onSelect: (template: SessionTemplate) => void;
  onEdit: (template: SessionTemplate) => void;
  onDuplicate: (template: SessionTemplate) => void;
  onDelete: (template: SessionTemplate) => void;
  onCreate: () => void;
}

export function TemplateSelector({
  templates,
  selected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: Props) {
  const [highlighted, setHighlighted] = useState<string | null>(selected ?? templates[0]?.metadata.key ?? null);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? templates.filter(
        (t) =>
          t.metadata.name.toLowerCase().includes(filter.toLowerCase()) ||
          t.metadata.description.toLowerCase().includes(filter.toLowerCase()),
      )
    : templates;

  // If the highlighted item is not in the filtered list, fall back to the first filtered item
  const highlightedInFiltered = filtered.find((t) => t.metadata.key === highlighted);
  const highlightedTemplate = highlightedInFiltered ?? filtered[0] ?? null;

  return (
    <div className="modal-overlay">
      <div className="modal template-selector-modal">
        <div className="modal-header">
          <span>Select a Template</span>
          <button className="btn btn-sm" onClick={onCreate}>
            + New
          </button>
        </div>
        <div className="template-selector-body">
          {/* Left: Template list */}
          <div className="template-list-pane">
            <div className="template-filter">
              <input
                type="text"
                placeholder="Filter templates..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="template-list">
              {filtered.map((t) => (
                <div
                  key={t.metadata.key}
                  className={`template-list-item ${highlightedTemplate?.metadata.key === t.metadata.key ? 'highlighted' : ''} ${selected === t.metadata.key ? 'selected' : ''}`}
                  onClick={() => setHighlighted(t.metadata.key)}
                  onDoubleClick={() => onSelect(t)}
                >
                  <div className="template-list-item-info">
                    <div className="name">
                      {t.metadata.name}
                      {t.isUserTemplate && <span className="user-badge">user</span>}
                    </div>
                    <div className="description">{t.metadata.description}</div>
                    <div className="meta-row">
                      <span className="locale">{t.metadata.locale}</span>
                      {t.quickActions.length > 0 && (
                        <span className="qa-count">
                          {t.quickActions.length} action{t.quickActions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="template-list-empty">No templates match your filter</div>
              )}
            </div>
          </div>

          {/* Right: Preview pane */}
          <div className="template-preview-pane">
            <TemplatePreview template={highlightedTemplate} />
          </div>
        </div>
        <div className="modal-footer">
          <div className="template-actions-left">
            <button
              className="btn btn-sm"
              onClick={() => {
                if (!highlightedTemplate) return;
                if (!highlightedTemplate.isUserTemplate) {
                  if (!window.confirm('This will create a user copy that overrides the built-in template. Continue?')) return;
                }
                onEdit(highlightedTemplate);
              }}
              disabled={!highlightedTemplate}
            >
              Edit
            </button>
            <button
              className="btn btn-sm"
              onClick={() => highlightedTemplate && onDuplicate(highlightedTemplate)}
              disabled={!highlightedTemplate}
            >
              Duplicate
            </button>
            {highlightedTemplate?.isUserTemplate && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(highlightedTemplate)}
              >
                Delete
              </button>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => highlightedTemplate && onSelect(highlightedTemplate)}
            disabled={!highlightedTemplate}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useState } from 'react';
import type { SessionTemplate, QuickAction } from '../../entities/template';
import { validateTemplate } from '../../entities/template';
import { TemplatePreview } from './TemplatePreview';

interface Props {
  template: SessionTemplate;
  onSave: (template: SessionTemplate) => void;
  onCancel: () => void;
}

function QuickActionEditor({
  action,
  index,
  onChange,
  onRemove,
}: {
  action: QuickAction;
  index: number;
  onChange: (index: number, action: QuickAction) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="qa-editor">
      <div className="qa-editor-header">
        <span className="qa-editor-index">{index + 1}</span>
        <input
          type="text"
          value={action.label}
          onChange={(e) => onChange(index, { ...action, label: e.target.value })}
          placeholder="Label"
          className="qa-label-input"
        />
        <button className="btn btn-sm btn-danger" onClick={() => onRemove(index)} type="button">
          Remove
        </button>
      </div>
      <div className="field-group">
        <label>Description</label>
        <input
          type="text"
          value={action.description}
          onChange={(e) => onChange(index, { ...action, description: e.target.value })}
          placeholder="What this action does"
        />
      </div>
      <div className="field-group">
        <label>Prompt Template</label>
        <textarea
          value={action.promptTemplate}
          onChange={(e) => onChange(index, { ...action, promptTemplate: e.target.value })}
          placeholder="Use {digest_markdown}, {recent_transcript}, {user_context}"
          rows={3}
        />
        <div className="help-text">
          Variables: {'{digest_markdown}'}, {'{recent_transcript}'}, {'{user_context}'}
        </div>
      </div>
    </div>
  );
}

export function TemplateEditor({ template, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<SessionTemplate>(() => structuredClone(template));
  const [errors, setErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const updateMeta = useCallback(
    (field: 'name' | 'description' | 'locale', value: string) => {
      setDraft((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, [field]: value },
      }));
    },
    [],
  );

  const updateField = useCallback(
    (field: 'systemPrompt' | 'digestUserTemplate' | 'finalUserTemplate', value: string) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateHints = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      recognitionHints: value
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean),
    }));
  }, []);

  const updateQuickAction = useCallback((index: number, action: QuickAction) => {
    setDraft((prev) => ({
      ...prev,
      quickActions: prev.quickActions.map((qa, i) => (i === index ? action : qa)),
    }));
  }, []);

  const removeQuickAction = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      quickActions: prev.quickActions.filter((_, i) => i !== index),
    }));
  }, []);

  const addQuickAction = useCallback(() => {
    setDraft((prev) => {
      if (prev.quickActions.length >= 5) return prev;
      return {
        ...prev,
        quickActions: [
          ...prev.quickActions,
          { label: '', description: '', promptTemplate: '' },
        ],
      };
    });
  }, []);

  const handleSave = () => {
    const validationErrors = validateTemplate(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setTab('edit'); // F4 fix: switch to Edit tab so errors are visible
      return;
    }
    setErrors([]);
    onSave(draft);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal template-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Edit Template</span>
          <div className="editor-tabs">
            <button
              className={`editor-tab ${tab === 'edit' ? 'active' : ''}`}
              onClick={() => setTab('edit')}
            >
              Edit
            </button>
            <button
              className={`editor-tab ${tab === 'preview' ? 'active' : ''}`}
              onClick={() => setTab('preview')}
            >
              Preview
            </button>
          </div>
          <button className="btn btn-sm" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {tab === 'preview' ? (
            <TemplatePreview template={draft} />
          ) : (
            <>
          {errors.length > 0 && (
            <div className="editor-error">
              {errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}

          <div className="settings-section">
            <h3>Metadata</h3>
            <div className="field-group">
              <label>Name</label>
              <input
                type="text"
                value={draft.metadata.name}
                onChange={(e) => updateMeta('name', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Description</label>
              <input
                type="text"
                value={draft.metadata.description}
                onChange={(e) => updateMeta('description', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Locale</label>
              <input
                type="text"
                value={draft.metadata.locale}
                onChange={(e) => updateMeta('locale', e.target.value)}
                placeholder="en, zh-TW, etc."
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>Prompts</h3>
            <div className="field-group">
              <label>System Prompt</label>
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => updateField('systemPrompt', e.target.value)}
                rows={8}
              />
              <div className="help-text">Instructions for the AI summarizer</div>
            </div>
            <div className="field-group">
              <label>Digest User Template</label>
              <textarea
                value={draft.digestUserTemplate}
                onChange={(e) => updateField('digestUserTemplate', e.target.value)}
                rows={5}
              />
              <div className="help-text">
                Variables: {'{line_count}'}, {'{new_lines}'}, {'{user_context}'}
              </div>
            </div>
            <div className="field-group">
              <label>Final User Template</label>
              <textarea
                value={draft.finalUserTemplate}
                onChange={(e) => updateField('finalUserTemplate', e.target.value)}
                rows={5}
              />
              <div className="help-text">
                Variables: {'{line_count}'}, {'{new_lines}'}, {'{user_context}'},{' '}
                {'{full_transcript}'}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Recognition Hints</h3>
            <div className="field-group">
              <input
                type="text"
                value={draft.recognitionHints.join(', ')}
                onChange={(e) => updateHints(e.target.value)}
                placeholder="standup, blocker, sprint"
              />
              <div className="help-text">Comma-separated words for speech recognition</div>
            </div>
          </div>

          <div className="settings-section">
            <h3>
              Quick Actions
              <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                ({draft.quickActions.length}/5)
              </span>
            </h3>
            {draft.quickActions.map((qa, i) => (
              <QuickActionEditor
                key={i}
                action={qa}
                index={i}
                onChange={updateQuickAction}
                onRemove={removeQuickAction}
              />
            ))}
            {draft.quickActions.length < 5 && (
              <button className="btn btn-sm" onClick={addQuickAction} type="button">
                + Add Quick Action
              </button>
            )}
          </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

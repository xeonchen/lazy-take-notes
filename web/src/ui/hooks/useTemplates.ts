import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionTemplate } from '../../entities/template';
import { loadBundledTemplates, mergeTemplates } from '../../adapters/template-loader';
import { saveUserTemplate, loadUserTemplates, deleteUserTemplate } from '../../adapters/template-persistence';

type Notify = (text: string, type: 'info' | 'warning' | 'error' | 'success') => void;

export interface TemplateActions {
  edit: (t: SessionTemplate) => void;
  duplicate: (t: SessionTemplate) => void;
  delete: (t: SessionTemplate) => void;
  create: () => void;
  save: (t: SessionTemplate) => Promise<void>;
  cancelEdit: () => void;
}

export function useTemplates(notify: Notify) {
  const bundled = useMemo(() => loadBundledTemplates(), []);
  const [userTemplates, setUserTemplates] = useState<SessionTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);

  const templates = useMemo(
    () => mergeTemplates(bundled, userTemplates),
    [bundled, userTemplates],
  );

  // F1 fix: Load user templates on mount with .catch()
  useEffect(() => {
    loadUserTemplates()
      .then(setUserTemplates)
      .catch((err) => {
        // F7 fix: surface load errors to user
        console.error('Failed to load user templates:', err);
        notify('Failed to load saved templates', 'error');
      });
  }, [notify]);

  const edit = useCallback((t: SessionTemplate) => {
    setEditingTemplate(structuredClone(t));
  }, []);

  const duplicate = useCallback((t: SessionTemplate) => {
    const clone = structuredClone(t);
    clone.metadata.key = `${t.metadata.key}_copy_${crypto.randomUUID()}`;
    clone.metadata.name = `${t.metadata.name} (Copy)`;
    clone.isUserTemplate = true;
    setEditingTemplate(clone);
  }, []);

  const del = useCallback(async (t: SessionTemplate) => {
    if (!t.isUserTemplate) return;
    if (!window.confirm(`Delete template "${t.metadata.name}"?`)) return;
    try {
      await deleteUserTemplate(t.metadata.key);
      setUserTemplates((prev) => prev.filter((ut) => ut.metadata.key !== t.metadata.key));
      notify('Template deleted', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete template', 'error');
    }
  }, [notify]);

  const create = useCallback(() => {
    const newTemplate: SessionTemplate = {
      metadata: { key: `custom_${crypto.randomUUID()}`, name: '', description: '', locale: 'en' },
      systemPrompt: '',
      digestUserTemplate: 'New transcript ({line_count} lines):\n{new_lines}\n\n{user_context}\n\nPlease update the summary.',
      finalUserTemplate: 'Meeting has ended. Final transcript ({line_count} lines):\n{new_lines}\n\n{user_context}\n\n---\nFull transcript:\n{full_transcript}\n---\nPlease produce the final summary.',
      recognitionHints: [],
      quickActions: [],
      isUserTemplate: true,
    };
    setEditingTemplate(newTemplate);
  }, []);

  // F2 fix: deep copy to prevent shared mutable references
  const save = useCallback(async (t: SessionTemplate) => {
    const saved: SessionTemplate = { ...structuredClone(t), isUserTemplate: true };
    try {
      await saveUserTemplate(saved);
      setUserTemplates((prev) => {
        const without = prev.filter((ut) => ut.metadata.key !== saved.metadata.key);
        return [...without, saved];
      });
      setEditingTemplate(null);
      notify('Template saved', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save template', 'error');
    }
  }, [notify]);

  const cancelEdit = useCallback(() => setEditingTemplate(null), []);

  // F3 fix: memoize actions object to prevent unnecessary re-renders
  const actions: TemplateActions = useMemo(
    () => ({ edit, duplicate, delete: del, create, save, cancelEdit }),
    [edit, duplicate, del, create, save, cancelEdit],
  );

  return { templates, editingTemplate, actions };
}

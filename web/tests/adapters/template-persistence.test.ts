import { describe, it, expect, beforeEach } from 'vitest';
import { saveUserTemplate, loadUserTemplates, deleteUserTemplate } from '../../src/adapters/template-persistence';
import type { SessionTemplate } from '../../src/entities/template';

function makeTemplate(key: string, name = `Template ${key}`): SessionTemplate {
  return {
    metadata: { key, name, description: 'test', locale: 'en' },
    systemPrompt: 'You are a helper.',
    digestUserTemplate: '{line_count} {new_lines}',
    finalUserTemplate: '{full_transcript}',
    recognitionHints: [],
    quickActions: [],
    isUserTemplate: true,
  };
}

describe('template-persistence', () => {
  beforeEach(async () => {
    // Clear all templates
    const existing = await loadUserTemplates();
    for (const t of existing) {
      await deleteUserTemplate(t.metadata.key);
    }
  });

  it('saves and loads a template', async () => {
    await saveUserTemplate(makeTemplate('test_1'));
    const loaded = await loadUserTemplates();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.metadata.key).toBe('test_1');
    expect(loaded[0]!.metadata.name).toBe('Template test_1');
  });

  it('overwrites existing template with same key', async () => {
    await saveUserTemplate(makeTemplate('key_a', 'Original'));
    await saveUserTemplate(makeTemplate('key_a', 'Updated'));
    const loaded = await loadUserTemplates();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.metadata.name).toBe('Updated');
  });

  it('loads multiple templates', async () => {
    await saveUserTemplate(makeTemplate('a'));
    await saveUserTemplate(makeTemplate('b'));
    await saveUserTemplate(makeTemplate('c'));
    const loaded = await loadUserTemplates();
    expect(loaded).toHaveLength(3);
  });

  it('deletes a template', async () => {
    await saveUserTemplate(makeTemplate('to_delete'));
    await deleteUserTemplate('to_delete');
    const loaded = await loadUserTemplates();
    expect(loaded).toHaveLength(0);
  });

  it('delete is idempotent for non-existent key', async () => {
    await expect(deleteUserTemplate('nonexistent')).resolves.toBeUndefined();
  });

  it('returns empty array when no templates exist', async () => {
    const loaded = await loadUserTemplates();
    expect(loaded).toEqual([]);
  });
});

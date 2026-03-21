import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBPersistence } from '../../src/adapters/persistence';
import type { SessionData } from '../../src/use-cases/ports';

function makeSession(id: string, updatedAt = Date.now()): SessionData {
  return {
    id,
    label: `Session ${id}`,
    templateKey: 'default_en',
    createdAt: updatedAt - 10000,
    updatedAt,
    segments: [{ text: 'hello', wallStart: 0, wallEnd: 1 }],
    digestMarkdown: '# Notes',
    digestHistory: [],
    context: '',
  };
}

// Use a single persistence instance and clear data between tests
const persistence = new IndexedDBPersistence();

describe('IndexedDBPersistence', () => {
  beforeEach(async () => {
    // Clear all sessions and config by listing and deleting
    const sessions = await persistence.listSessions();
    for (const s of sessions) {
      await persistence.deleteSession(s.id);
    }
    // Reset config by saving null-ish value then relying on tests
    // Actually, we can use the raw DB to clear stores
    // Simpler: just use unique IDs per test to avoid collision
  });

  it('saves and loads a session', async () => {
    const session = makeSession('save-load-1');
    await persistence.saveSession(session);

    const loaded = await persistence.loadSession('save-load-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('save-load-1');
    expect(loaded!.segments).toHaveLength(1);
  });

  it('returns null for missing session', async () => {
    const loaded = await persistence.loadSession('nonexistent');
    expect(loaded).toBeNull();
  });

  it('lists sessions sorted by date descending', async () => {
    // Clear first
    const existing = await persistence.listSessions();
    for (const s of existing) await persistence.deleteSession(s.id);

    await persistence.saveSession(makeSession('list-old', 1000));
    await persistence.saveSession(makeSession('list-new', 2000));

    const list = await persistence.listSessions();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe('list-new');
    expect(list[1]!.id).toBe('list-old');
  });

  it('deletes a session', async () => {
    await persistence.saveSession(makeSession('to-delete'));
    await persistence.deleteSession('to-delete');

    const loaded = await persistence.loadSession('to-delete');
    expect(loaded).toBeNull();
  });

  it('saves and loads config', async () => {
    const config = { llmProvider: 'openai', apiKey: 'sk-test-config' };
    await persistence.saveConfig(config);

    const loaded = await persistence.loadConfig<typeof config>();
    expect(loaded).toEqual(config);
  });

  it('loadConfig returns saved data (overwrites previous)', async () => {
    await persistence.saveConfig({ a: 1 });
    await persistence.saveConfig({ b: 2 });
    const loaded = await persistence.loadConfig<{ b: number }>();
    expect(loaded).toEqual({ b: 2 });
  });
});

/**
 * L3 Adapter — IndexedDB persistence for user-created templates.
 *
 * User templates are stored in a dedicated IndexedDB database separate from
 * session data, so schema upgrades don't interfere with each other.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { SessionTemplate } from '../entities/template';

const DB_NAME = 'lazy-take-notes-templates';
const DB_VERSION = 1;
const STORE = 'user-templates';

interface TemplateRow {
  key: string;
  template: SessionTemplate;
  updatedAt: number;
}

interface TemplateDB {
  [STORE]: {
    key: string;
    value: TemplateRow;
  };
}

async function getDB(): Promise<IDBPDatabase<TemplateDB>> {
  return openDB<TemplateDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    },
  });
}

/** Save a user template (create or update). */
export async function saveUserTemplate(template: SessionTemplate): Promise<void> {
  try {
    const db = await getDB();
    const row: TemplateRow = {
      key: template.metadata.key,
      template,
      updatedAt: Date.now(),
    };
    await db.put(STORE, row);
  } catch (err) {
    throw new Error(`Failed to save template: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Load all user templates. */
export async function loadUserTemplates(): Promise<SessionTemplate[]> {
  try {
    const db = await getDB();
    const rows = await db.getAll(STORE);
    return rows.map((r) => r.template);
  } catch (err) {
    console.error('Failed to load user templates:', err);
    return []; // Graceful degradation — show bundled templates only
  }
}

/** Delete a user template by key. */
export async function deleteUserTemplate(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE, key);
  } catch (err) {
    throw new Error(`Failed to delete template: ${err instanceof Error ? err.message : String(err)}`);
  }
}

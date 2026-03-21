/**
 * L3 Adapter — IndexedDB persistence for sessions and config.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { PersistenceGateway, SessionData, SessionSummary } from '../use-cases/ports';

const DB_NAME = 'lazy-take-notes';
const DB_VERSION = 1;

interface LtnDB {
  sessions: {
    key: string;
    value: SessionData;
    indexes: { 'by-date': number };
  };
  config: {
    key: string;
    value: { key: string; data: unknown };
  };
}

async function getDB(): Promise<IDBPDatabase<LtnDB>> {
  return openDB<LtnDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('by-date', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    },
  });
}

export class IndexedDBPersistence implements PersistenceGateway {
  private dbPromise = getDB();

  async saveSession(session: SessionData): Promise<void> {
    const db = await this.dbPromise;
    await db.put('sessions', session);
  }

  async loadSession(id: string): Promise<SessionData | null> {
    const db = await this.dbPromise;
    return (await db.get('sessions', id)) ?? null;
  }

  async listSessions(): Promise<SessionSummary[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('sessions', 'by-date');
    return all.reverse().map((s) => ({
      id: s.id,
      label: s.label,
      templateKey: s.templateKey,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      segmentCount: s.segments.length,
      hasDigest: s.digestMarkdown.length > 0,
    }));
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('sessions', id);
  }

  async saveConfig(config: unknown): Promise<void> {
    const db = await this.dbPromise;
    await db.put('config', { key: 'app-config', data: config });
  }

  async loadConfig<T>(): Promise<T | null> {
    const db = await this.dbPromise;
    const row = await db.get('config', 'app-config');
    return row ? (row.data as T) : null;
  }
}

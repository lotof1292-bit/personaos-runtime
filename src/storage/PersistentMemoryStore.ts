import { MemoryEntry } from '../types';
import { MemoryStore } from '../memory/MemoryStore';
import { getDb } from '../storage/Database';

export class PersistentMemoryStore implements MemoryStore {
  async load(identityId: string): Promise<MemoryEntry[]> {
    const db = getDb();
    const rows = db.prepare('SELECT role, content, timestamp FROM memories WHERE identity_id = ? ORDER BY timestamp ASC').all(identityId) as any[];
    return rows.map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
      timestamp: new Date(r.timestamp)
    }));
  }

  async update(identityId: string, userMessage: string, assistantReply: string): Promise<void> {
    const db = getDb();
    const insert = db.prepare('INSERT INTO memories (identity_id, role, content) VALUES (?, ?, ?)');
    db.transaction(() => {
      insert.run(identityId, 'user', userMessage);
      insert.run(identityId, 'assistant', assistantReply);
    })();
  }
}

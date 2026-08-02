import { getDb } from './Database';

export interface Relationship {
  id: string;
  identityId: string;
  targetIdentityId: string;
  type: string; // 'friend', 'mentor', 'rival', etc.
  strength: number; // 0..1
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class RelationshipStore {
  set(identityId: string, targetId: string, type: string, strength: number, metadata: Record<string, any> = {}): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO relationships (identity_id, target_identity_id, type, strength, metadata, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(identity_id, target_identity_id) DO UPDATE SET
        type = excluded.type,
        strength = excluded.strength,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(identityId, targetId, type, strength, JSON.stringify(metadata), now);
  }

  get(identityId: string, targetId: string): Relationship | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM relationships WHERE identity_id = ? AND target_identity_id = ?').get(identityId, targetId) as any;
    if (!row) return null;
    return this.rowToRelationship(row);
  }

  list(identityId: string): Relationship[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM relationships WHERE identity_id = ? ORDER BY strength DESC').all(identityId) as any[];
    return rows.map(r => this.rowToRelationship(r));
  }

  delete(identityId: string, targetId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM relationships WHERE identity_id = ? AND target_identity_id = ?').run(identityId, targetId);
  }

  private rowToRelationship(row: any): Relationship {
    return {
      id: row.id,
      identityId: row.identity_id,
      targetIdentityId: row.target_identity_id,
      type: row.type,
      strength: row.strength,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Inicializar tabla si no existe (se llama desde Database.ts)
  static initTable(): void {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identity_id TEXT NOT NULL,
        target_identity_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'friend',
        strength REAL NOT NULL DEFAULT 0.5,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(identity_id, target_identity_id),
        FOREIGN KEY (identity_id) REFERENCES identities(id),
        FOREIGN KEY (target_identity_id) REFERENCES identities(id)
      );
    `);
  }
}

import { getDb } from './Database';
import { v4 as uuidv4 } from 'uuid';

export interface Snapshot {
  id: string;
  identityId: string;
  snapshotData: any;
  createdAt: Date;
}

export class SnapshotStore {
  save(identityId: string, snapshotData: any): string {
    const db = getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO snapshots (id, identity_id, snapshot_data) VALUES (?, ?, ?)').run(id, identityId, JSON.stringify(snapshotData));
    return id;
  }

  load(id: string): Snapshot | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      identityId: row.identity_id,
      snapshotData: JSON.parse(row.snapshot_data),
      createdAt: new Date(row.created_at)
    };
  }

  list(identityId: string): Snapshot[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM snapshots WHERE identity_id = ? ORDER BY created_at DESC').all(identityId) as any[];
    return rows.map(r => ({
      id: r.id,
      identityId: r.identity_id,
      snapshotData: JSON.parse(r.snapshot_data),
      createdAt: new Date(r.created_at)
    }));
  }
}

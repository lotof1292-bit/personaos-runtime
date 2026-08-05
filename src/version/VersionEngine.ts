import { getDb } from '../storage/Database';
import { v4 as uuidv4 } from 'uuid';

export class VersionEngine {
  save(identityId: string, snapshot: any, message: string) { 
    const db = getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO versions (id, identity_id, version_number, snapshot, message) VALUES (?, ?, (SELECT COALESCE(MAX(version_number),0)+1 FROM versions WHERE identity_id=?), ?, ?)').run(id, identityId, identityId, JSON.stringify(snapshot), message);
    return { id, identityId, versionNumber: 0, snapshot, message, createdAt: new Date() };
  }
  getLatest(identityId: string) { return null; }
  listVersions(identityId: string) { return []; }
  rollback(identityId: string, versionNumber: number) { return null; }
}

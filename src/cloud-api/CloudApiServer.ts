import express from 'express';
import { IdentityManager } from '../IdentityManager';
import { PersistentMemoryStore } from '../storage/PersistentMemoryStore';
import { SnapshotStore } from '../storage/SnapshotStore';
import { RelationshipStore } from '../storage/RelationshipStore';
import { VersionEngine } from '../version/VersionEngine';
import { getDb } from '../storage/Database';

export class CloudApiServer {
  private app: express.Application;
  private identityManager: IdentityManager;
  private memory: PersistentMemoryStore;
  private snapshotStore: SnapshotStore;
  private relationshipStore: RelationshipStore;
  private versionEngine: VersionEngine;
  private server: any;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.identityManager = new IdentityManager();
    this.memory = new PersistentMemoryStore();
    this.snapshotStore = new SnapshotStore();
    this.relationshipStore = new RelationshipStore();
    this.versionEngine = new VersionEngine();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Identidades
    this.app.post('/v1/identities', (req, res) => {
      const { id, name, traits } = req.body;
      if (!id || !name) return res.status(400).json({ error: 'id and name required' });
      const db = getDb();
      db.prepare('INSERT OR REPLACE INTO identities (id, name, genome) VALUES (?, ?, ?)').run(id, name, JSON.stringify(traits || {}));
      this.identityManager.load({ id, name, traits: traits || {} });
      res.status(201).json({ id, name });
    });

    this.app.get('/v1/identities/:id', (req, res) => {
      const db = getDb();
      const row = db.prepare('SELECT * FROM identities WHERE id = ?').get(req.params.id) as any;
      if (!row) return res.status(404).json({ error: 'Identity not found' });
      res.json({ id: row.id, name: row.name, genome: JSON.parse(row.genome || '{}'), createdAt: row.created_at });
    });

    this.app.delete('/v1/identities/:id', (req, res) => {
      const db = getDb();
      db.prepare('DELETE FROM identities WHERE id = ?').run(req.params.id);
      this.identityManager.unload(req.params.id);
      res.json({ ok: true });
    });

    this.app.get('/v1/identities', (_, res) => {
      const db = getDb();
      const rows = db.prepare('SELECT id, name, created_at FROM identities ORDER BY created_at DESC').all();
      res.json(rows);
    });

    // Memorias
    this.app.get('/v1/identities/:id/memories', async (req, res) => {
      const memories = await this.memory.load(req.params.id);
      res.json(memories);
    });

    this.app.post('/v1/identities/:id/memories', async (req, res) => {
      const { userMessage, assistantReply } = req.body;
      if (!userMessage || !assistantReply) return res.status(400).json({ error: 'userMessage and assistantReply required' });
      await this.memory.update(req.params.id, userMessage, assistantReply);
      res.status(201).json({ ok: true });
    });

    // Snapshots
    this.app.post('/v1/identities/:id/snapshots', async (req, res) => {
      const memories = await this.memory.load(req.params.id);
      const snapshotData = { memories, timestamp: new Date().toISOString() };
      const snapshotId = this.snapshotStore.save(req.params.id, snapshotData);
      // Guardar versión automáticamente
      this.versionEngine.save(req.params.id, snapshotData, 'Snapshot automático');
      res.status(201).json({ snapshotId });
    });

    this.app.get('/v1/snapshots/:id', (req, res) => {
      const snapshot = this.snapshotStore.load(req.params.id);
      if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });
      res.json(snapshot);
    });

    this.app.get('/v1/identities/:id/snapshots', (req, res) => {
      const snapshots = this.snapshotStore.list(req.params.id);
      res.json(snapshots);
    });

    // Relaciones
    this.app.post('/v1/identities/:id/relationships', (req, res) => {
      const { targetId, type, strength, metadata } = req.body;
      if (!targetId) return res.status(400).json({ error: 'targetId required' });
      this.relationshipStore.set(req.params.id, targetId, type || 'friend', strength || 0.5, metadata || {});
      res.status(201).json({ ok: true });
    });

    this.app.get('/v1/identities/:id/relationships', (req, res) => {
      const relationships = this.relationshipStore.list(req.params.id);
      res.json(relationships);
    });

    // Versiones
    this.app.get('/v1/identities/:id/versions', (req, res) => {
      const versions = this.versionEngine.listVersions(req.params.id);
      res.json(versions);
    });

    this.app.post('/v1/identities/:id/rollback', (req, res) => {
      const { versionNumber } = req.body;
      if (!versionNumber) return res.status(400).json({ error: 'versionNumber required' });
      try {
        const snapshot = this.versionEngine.rollback(req.params.id, versionNumber);
        res.json({ snapshot });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    // Salud
    this.app.get('/v1/health', (_, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  start(port: number = 4871): void {
    this.server = this.app.listen(port, () => {
      console.log(`Persona Cloud API v1.0 running on port ${port}`);
      console.log('Endpoints:');
      console.log('  GET    /v1/health');
      console.log('  POST   /v1/identities');
      console.log('  GET    /v1/identities');
      console.log('  GET    /v1/identities/:id');
      console.log('  DELETE /v1/identities/:id');
      console.log('  GET    /v1/identities/:id/memories');
      console.log('  POST   /v1/identities/:id/memories');
      console.log('  POST   /v1/identities/:id/snapshots');
      console.log('  GET    /v1/identities/:id/snapshots');
      console.log('  POST   /v1/identities/:id/relationships');
      console.log('  GET    /v1/identities/:id/relationships');
      console.log('  GET    /v1/identities/:id/versions');
      console.log('  POST   /v1/identities/:id/rollback');
    });
  }

  stop(): void {
    if (this.server) this.server.close();
  }
}

// Si se ejecuta directamente como script
if (require.main === module) {
  const server = new CloudApiServer();
  const port = parseInt(process.env.CLOUD_API_PORT || '4871');
  server.start(port);
}

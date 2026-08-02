import express from 'express';
import { PersonaRuntime } from './Runtime';
import { IdentityManager } from './IdentityManager';
import { MockDriver } from './MockDriver';
import { SimpleEngine } from './engine/SimpleEngine';
import { ConversationCompiler } from './compiler/ConversationCompiler';
import { Persona, Session } from './types';
import { v4 as uuidv4 } from 'uuid';
import { PersistentSessionManager } from './session/PersistentSessionManager';
import { IdentityCache } from './cache/IdentityCache';
import { OpenAIDriver } from './OpenAIDriver';
import { PersistentMemoryStore } from './storage/PersistentMemoryStore';
import { SecureMemoryStore } from './security/SecureMemoryStore';
import { SnapshotStore } from './storage/SnapshotStore'
import { BridgeManager } from './bridges/BridgeManager';
import { TelegramBridge } from './bridges/TelegramBridge';
import { BridgeManager } from './bridges/BridgeManager';
import { TelegramBridge } from './bridges/TelegramBridge';;
import { getDb, closeDb } from './storage/Database';

const app = express()
mountStudio(app);
app.use(express.json())
// Middleware de autenticación (excepto para endpoints públicos)
app.use((req, res, next) => {
  // Endpoints públicos
  const publicPaths = ['/runtime/status', '/studio', '/'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  // Verificar API key
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey || !authService.validate(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized. Provide x-api-key header.' });
  }
  next();
});;

const PORT = process.env.PORT || 4870;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const USE_OPENAI = OPENAI_API_KEY.length > 0;

const identityManager = new IdentityManager();
const sessionManager = new PersistentSessionManager();
const identityCache = new IdentityCache(300000);
const memory = new PersistentMemoryStore()
const secureMemory = new SecureMemoryStore(memory)
const authService = new AuthService();
const rateLimiter = new RateLimiter(60000, 60);
rateLimiter.startCleanup();
const versionEngine = new VersionEngine()
const syncEngine = new SyncEngine('instance-' + Math.random().toString(36).substr(2, 9));
syncEngine.start(5000);;;;
const snapshotStore = new SnapshotStore()
const relationshipStore = new RelationshipStore()
const bridgeManager = new BridgeManager(runtime);
bridgeManager.register(new TelegramBridge());
const relationshipStore = new RelationshipStore()
const bridgeManager = new BridgeManager(runtime);
bridgeManager.register(new TelegramBridge());;
const engine = new SimpleEngine();
const compiler = new ConversationCompiler();
const driver = USE_OPENAI ? new OpenAIDriver(OPENAI_API_KEY) : new MockDriver();

const runtime = new PersonaRuntime(identityManager, sessionManager, secureMemory, engine, compiler, driver);

app.post('/identity/load', (req, res) => {
  const persona: Persona = req.body;
  if (!persona.id || !persona.name) {
    return res.status(400).json({ error: 'id and name required' });
  }
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO identities (id, name, genome) VALUES (?, ?, ?)').run(persona.id, persona.name, JSON.stringify(persona.traits || {}));
  identityManager.load(persona);
  identityCache.invalidate(persona.id);
  res.json({ ok: true });
});

app.post('/identity/unload', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  identityManager.unload(id);
  identityCache.invalidate(id);
  res.json({ ok: true });
});

app.post('/session/create', (req, res) => {
  const { identityId } = req.body;
  if (!identityId) return res.status(400).json({ error: 'identityId required' });
  const session: Session = { id: uuidv4(), identityId, createdAt: new Date() };
  sessionManager.create(session);
  res.json({ session });
});

app.post('/session/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  sessionManager.delete(id);
  res.json({ ok: true });
});

app.post('/chat', rateLimiter.middleware.bind(rateLimiter), async (req, res) => {
  const { session, message } = req.body;
  if (!session || !message) {
    return res.status(400).json({ error: 'session and message required' });
  }
  try {
    const ses = sessionManager.resolve(session);
    if (!ses) return res.status(404).json({ error: 'session not found' });
    let persona = identityCache.get(ses.identityId);
    if (!persona) {
      persona = identityManager.resolve(ses.identityId);
      if (persona) identityCache.set(ses.identityId, persona);
    }
    if (!persona) return res.status(404).json({ error: 'identity not loaded' });

    const reply = await runtime.chat(session, message);
    res.json({ reply });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/snapshot/create', async (req, res) => {
  const { identityId } = req.body;
  if (!identityId) return res.status(400).json({ error: 'identityId required' });
  try {
    const memoryData = await memory.load(identityId);
    const snapshotData = {
      identityId,
      memories: memoryData,
      timestamp: new Date().toISOString()
    };
    const snapshotId = snapshotStore.save(identityId, snapshotData);
    res.json({ snapshotId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/snapshot/:id', (req, res) => {
  const snapshot = snapshotStore.load(req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'snapshot not found' });
  res.json(snapshot);
});

app.get('/snapshot/list/:identityId', (req, res) => {
  const snapshots = snapshotStore.list(req.params.identityId);
  res.json(snapshots);
});


app.get("/genome/:identityId", (req, res) => {
  // Por ahora devuelve el genoma por defecto (Alex)
  const { alexGenome } = require('./genome/alexGenome');
  res.json(alexGenome);
});
app.get('/runtime/status', (_, res) => {
  const db = getDb();
  const identityCount = db.prepare('SELECT COUNT(*) as count FROM identities').get() as any;
  res.json({
    status: 'running',
    driver: driver.id,
    identities: identityCount.count,
    sessions: sessionManager.size,
    cache: identityCache.size,
    storage: 'sqlite (encrypted)', encryption: process.env.ENCRYPTION_KEY ? 'AES-256-GCM' : 'none (auto-generated)'
  });
});

const server = app.listen(PORT, () => {
  console.log(\Persona Runtime v1.0\);
  console.log(\Kernel.............READY\);
  console.log(\Dictionary.........READY\);
  console.log(\Engine.............READY\);
  console.log(\Memory.............READY (SQLite)\);
  console.log(\Drivers............READY\);
  console.log(\Snapshots..........READY
   Relationships.......READY
   Relationships.......READY\);
  console.log(\Listening..........localhost:\\);
  if (USE_OPENAI) {
    console.log(\OpenAI Driver: ACTIVE\);
  } else {
    console.log(\Mock Driver: ACTIVE (set OPENAI_API_KEY for OpenAI)\);
  }
});

process.on('SIGINT', async () => {
  console.log('\\nShutting down...');
  await (sessionManager as any).close?.();
  closeDb();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await (sessionManager as any).close?.();
  closeDb();
  server.close();
  process.exit(0);
});










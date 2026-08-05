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
import { SnapshotStore } from './storage/SnapshotStore';
import { RelationshipStore } from './storage/RelationshipStore';
import { VersionEngine } from './version/VersionEngine';
import { getDb, closeDb } from './storage/Database';
import { mountStudio } from './studio';
import { BridgeManager } from './bridges/BridgeManager';
import { TelegramBridge } from './bridges/TelegramBridge';
import { DiscordBridge } from './bridges/DiscordBridge';
import { WhatsAppBridge } from './bridges/WhatsAppBridge';
import { MessengerBridge } from './bridges/MessengerBridge';
import { SlackBridge } from './bridges/SlackBridge';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '4870');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const USE_OPENAI = OPENAI_API_KEY.length > 0;

const identityManager = new IdentityManager();
const sessionManager = new PersistentSessionManager();
const identityCache = new IdentityCache(300000);
const memory = new PersistentMemoryStore();
const snapshotStore = new SnapshotStore();
const relationshipStore = new RelationshipStore();
const versionEngine = new VersionEngine();
const engine = new SimpleEngine();
const compiler = new ConversationCompiler();
const driver = USE_OPENAI ? new OpenAIDriver(OPENAI_API_KEY) : new MockDriver();

const runtime = new PersonaRuntime(identityManager, sessionManager as any, memory, engine, compiler, driver);
const bridgeManager = new BridgeManager(runtime);
bridgeManager.register(new TelegramBridge());
bridgeManager.register(new DiscordBridge());
bridgeManager.register(new WhatsAppBridge());
bridgeManager.register(new MessengerBridge());
bridgeManager.register(new SlackBridge());

mountStudio(app);

app.post('/identity/load', (req, res) => {
  const persona: Persona = req.body;
  if (!persona.id || !persona.name) return res.status(400).json({ error: 'id and name required' });
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

app.post('/chat', async (req, res) => {
  const { session, message } = req.body;
  if (!session || !message) return res.status(400).json({ error: 'session and message required' });
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
    const snapshotData = { identityId, memories: memoryData, timestamp: new Date().toISOString() };
    const snapshotId = snapshotStore.save(identityId, snapshotData);
    versionEngine.save(identityId, snapshotData, 'Snapshot automatico');
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

app.post('/relationship/set', (req, res) => {
  const { identityId, targetId, type, strength, metadata } = req.body;
  if (!identityId || !targetId) return res.status(400).json({ error: 'identityId and targetId required' });
  relationshipStore.set(identityId, targetId, type || 'friend', strength || 0.5, metadata || {});
  res.json({ ok: true });
});

app.get('/relationship/list/:identityId', (req, res) => {
  const relationships = relationshipStore.list(req.params.identityId);
  res.json(relationships);
});

app.delete('/relationship/delete', (req, res) => {
  const { identityId, targetId } = req.body;
  if (!identityId || !targetId) return res.status(400).json({ error: 'identityId and targetId required' });
  relationshipStore.delete(identityId, targetId);
  res.json({ ok: true });
});

app.post('/version/save', (req, res) => {
  const { identityId, snapshot, message } = req.body;
  if (!identityId || !snapshot) return res.status(400).json({ error: 'identityId and snapshot required' });
  const version = versionEngine.save(identityId, snapshot, message || '');
  res.json(version);
});

app.get('/version/list/:identityId', (req, res) => {
  const versions = versionEngine.listVersions(req.params.identityId);
  res.json(versions);
});

app.post('/version/rollback', (req, res) => {
  const { identityId, versionNumber } = req.body;
  if (!identityId || !versionNumber) return res.status(400).json({ error: 'identityId and versionNumber required' });
  try {
    const snapshot = versionEngine.rollback(identityId, versionNumber);
    res.json({ snapshot });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/genome/:identityId', (req, res) => {
  const { alexGenome } = require('./genome/alexGenome');
  res.json(alexGenome);
});

app.post('/bridge/start', async (req, res) => {
  const { platform, config } = req.body;
  if (!platform || !config) return res.status(400).json({ error: 'platform and config required' });
  try {
    await bridgeManager.startBridge(platform, config);
    res.json({ ok: true, platform });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/bridge/stop', async (req, res) => {
  const { platform } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform required' });
  try {
    await bridgeManager.stopBridge(platform);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/bridge/list', (_, res) => {
  res.json({ bridges: bridgeManager['registry'].list() });
});

app.post('/webhook/whatsapp', (req, res) => {
  const bridge = bridgeManager['registry'].get('whatsapp');
  if (bridge) { (bridge as any).handleWebhook(req, res); } else { res.status(404).json({ error: 'WhatsApp bridge not active' }); }
});

app.get('/webhook/whatsapp', (req, res) => {
  const bridge = bridgeManager['registry'].get('whatsapp');
  if (bridge) { (bridge as any).handleWebhook(req, res); } else { res.status(404).json({ error: 'WhatsApp bridge not active' }); }
});

app.post('/webhook/messenger', (req, res) => {
  const bridge = bridgeManager['registry'].get('messenger');
  if (bridge) { (bridge as any).handleWebhook(req, res); } else { res.status(404).json({ error: 'Messenger bridge not active' }); }
});

app.get('/webhook/messenger', (req, res) => {
  const bridge = bridgeManager['registry'].get('messenger');
  if (bridge) { (bridge as any).handleWebhook(req, res); } else { res.status(404).json({ error: 'Messenger bridge not active' }); }
});

app.post('/webhook/slack', (req, res) => {
  const bridge = bridgeManager['registry'].get('slack');
  if (bridge) { (bridge as any).handleWebhook(req, res); } else { res.status(404).json({ error: 'Slack bridge not active' }); }
});

app.get('/runtime/status', (_, res) => {
  const db = getDb();
  const identityCount = db.prepare('SELECT COUNT(*) as count FROM identities').get() as any;
  res.json({
    status: 'running',
    driver: driver.id,
    identities: identityCount ? identityCount.count : 0,
    sessions: sessionManager.size,
    cache: identityCache.size,
    storage: 'sqlite'
  });
});

const server = app.listen(PORT, () => {
  console.log('Persona Runtime v1.0');
  console.log('Kernel.............READY');
  console.log('Dictionary.........READY');
  console.log('Engine.............READY');
  console.log('Memory.............READY (SQLite)');
  console.log('Drivers............READY');
  console.log('Snapshots..........READY');
  console.log('Bridges............READY');
  console.log('Versions...........READY');
  console.log('Listening..........localhost:' + PORT);
  if (USE_OPENAI) console.log('OpenAI Driver: ACTIVE');
  else console.log('Mock Driver: ACTIVE (set OPENAI_API_KEY for OpenAI)');
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
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

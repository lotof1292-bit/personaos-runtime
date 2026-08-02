import express from "express";
import { PersonaRuntime } from "./Runtime";
import { IdentityManager } from "./IdentityManager";
import { SessionManager } from "./SessionManager";
import { MockDriver } from "./MockDriver";
import { InMemoryMemoryStore } from "./memory/InMemoryMemoryStore";
import { SimpleEngine } from "./engine/SimpleEngine";
import { ConversationCompiler } from "./compiler/ConversationCompiler";
import { Persona, Session } from "./types";
import { v4 as uuidv4 } from "uuid";
import { PersistentSessionManager } from "./session/PersistentSessionManager";
import { IdentityCache } from "./cache/IdentityCache";
import { OpenAIDriver } from "./OpenAIDriver";

const app = express();
app.use(express.json());

// Configuración
const PORT = process.env.PORT || 4870;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const USE_OPENAI = OPENAI_API_KEY.length > 0;

// Componentes
const identityManager = new IdentityManager();
const sessionManager = new PersistentSessionManager();
const identityCache = new IdentityCache(300000);
const memory = new InMemoryMemoryStore();
const engine = new SimpleEngine();
const compiler = new ConversationCompiler();
const driver = USE_OPENAI ? new OpenAIDriver(OPENAI_API_KEY) : new MockDriver();

const runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);

// Middleware para cache de identidades
app.post("/identity/load", (req, res) => {
  const persona: Persona = req.body;
  if (!persona.id || !persona.name) {
    return res.status(400).json({ error: "id and name required" });
  }
  identityManager.load(persona);
  identityCache.invalidate(persona.id); // invalidar cache si se recarga
  res.json({ ok: true });
});

app.post("/identity/unload", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  identityManager.unload(id);
  identityCache.invalidate(id);
  res.json({ ok: true });
});

app.post("/session/create", (req, res) => {
  const { identityId } = req.body;
  if (!identityId) return res.status(400).json({ error: "identityId required" });
  const session: Session = { id: uuidv4(), identityId, createdAt: new Date() };
  sessionManager.create(session);
  res.json({ session });
});

app.post("/session/delete", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  sessionManager.delete(id);
  res.json({ ok: true });
});

app.post("/chat", async (req, res) => {
  const { session, message } = req.body;
  if (!session || !message) {
    return res.status(400).json({ error: "session and message required" });
  }
  try {
    // Cache check: si la identidad está en cache la usamos directamente
    const ses = sessionManager.resolve(session);
    if (!ses) return res.status(404).json({ error: "session not found" });
    let persona = identityCache.get(ses.identityId);
    if (!persona) {
      persona = identityManager.resolve(ses.identityId);
      if (persona) identityCache.set(ses.identityId, persona);
    }
    if (!persona) return res.status(404).json({ error: "identity not loaded" });

    const reply = await runtime.chat(session, message);
    res.json({ reply });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/runtime/status", (_, res) => {
  res.json({
    status: "running",
    driver: driver.id,
    identities: identityManager.size,
    sessions: sessionManager.size,
    cache: identityCache.size,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Persona Runtime v1.0`);
  console.log(`Kernel.............READY`);
  console.log(`Dictionary.........READY`);
  console.log(`Engine.............READY`);
  console.log(`Memory.............READY`);
  console.log(`Drivers............READY`);
  console.log(`Listening..........localhost:${PORT}`);
  if (USE_OPENAI) {
    console.log(`OpenAI Driver: ACTIVE`);
  } else {
    console.log(`Mock Driver: ACTIVE (set OPENAI_API_KEY for OpenAI)`);
  }
});

// Graceful shutdown para guardar sesiones
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await sessionManager.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sessionManager.close();
  server.close();
  process.exit(0);
});

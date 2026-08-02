import express from "express";
import { PersonaRuntime } from "./Runtime";
import { IdentityManager } from "./IdentityManager";
import { SessionManager } from "./SessionManager";
import { MockDriver } from "./MockDriver";
import { InMemoryMemoryStore } from "./memory/InMemoryMemoryStore";
import { SimpleEngine } from "./engine/SimpleEngine";
import { SimpleCompiler } from "./compiler/SimpleCompiler";
import { Persona, Session } from "./types";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

const identityManager = new IdentityManager();
const sessionManager = new SessionManager();
const memory = new InMemoryMemoryStore();
const engine = new SimpleEngine();
const compiler = new SimpleCompiler();
const driver = new MockDriver();

const runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);

app.post("/identity/load", (req, res) => {
  const persona: Persona = req.body;
  if (!persona.id || !persona.name) {
    return res.status(400).json({ error: "id and name required" });
  }
  identityManager.load(persona);
  res.json({ ok: true });
});

app.post("/identity/unload", (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  identityManager.unload(id);
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
  });
});

const PORT = process.env.PORT || 4870;
app.listen(PORT, () => {
  console.log(\`Persona Runtime v1.0\`);
  console.log(\`Kernel.............READY\`);
  console.log(\`Dictionary.........READY\`);
  console.log(\`Engine.............READY\`);
  console.log(\`Memory.............READY\`);
  console.log(\`Drivers............READY\`);
  console.log(\`Listening..........localhost:\${PORT}\`);
});

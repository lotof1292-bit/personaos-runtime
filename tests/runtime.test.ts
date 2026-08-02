import { PersonaRuntime } from "../src/Runtime";
import { IdentityManager } from "../src/IdentityManager";
import { SessionManager } from "../src/SessionManager";
import { InMemoryMemoryStore } from "../src/memory/InMemoryMemoryStore";
import { SimpleEngine } from "../src/engine/SimpleEngine";
import { SimpleCompiler } from "../src/compiler/SimpleCompiler";
import { MockDriver } from "../src/MockDriver";
import { Persona, Session } from "../src/types";

describe("PersonaRuntime", () => {
  let runtime: PersonaRuntime;
  let identityManager: IdentityManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    identityManager = new IdentityManager();
    sessionManager = new SessionManager();
    const memory = new InMemoryMemoryStore();
    const engine = new SimpleEngine();
    const compiler = new SimpleCompiler();
    const driver = new MockDriver();
    runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);
  });

  test("debe responder a un mensaje", async () => {
    const persona: Persona = { id: "test-1", name: "Test", traits: {} };
    identityManager.load(persona);
    const session: Session = { id: "session-1", identityId: "test-1", createdAt: new Date() };
    sessionManager.create(session);
    const reply = await runtime.chat("session-1", "Hola");
    expect(reply).toContain("[Mock]");
  });

  test("debe lanzar error si la sesión no existe", async () => {
    await expect(runtime.chat("no-existe", "Hola")).rejects.toThrow("Session not found");
  });
});

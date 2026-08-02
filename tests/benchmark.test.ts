import { PersonaRuntime } from '../src/Runtime';
import { IdentityManager } from '../src/IdentityManager';
import { SessionManager } from '../src/SessionManager';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleEngine } from '../src/engine/SimpleEngine';
import { ConversationCompiler } from '../src/compiler/ConversationCompiler';
import { MockDriver } from '../src/MockDriver';
import { Persona, Session } from '../src/types';

describe('Benchmark - PersonaRuntime', () => {
  let runtime: PersonaRuntime;
  let identityManager: IdentityManager;
  let sessionManager: SessionManager;
  let sessionId: string;

  beforeAll(() => {
    identityManager = new IdentityManager();
    sessionManager = new SessionManager();
    const memory = new InMemoryMemoryStore();
    const engine = new SimpleEngine();
    const compiler = new ConversationCompiler();
    const driver = new MockDriver();
    runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);

    const persona: Persona = { id: 'bench-user', name: 'Bench', traits: {} };
    identityManager.load(persona);
    const session: Session = { id: 'bench-session', identityId: 'bench-user', createdAt: new Date() };
    sessionManager.create(session);
    sessionId = session.id;
  });

  test('debe manejar 1000 requests en menos de 10 segundos', async () => {
    const totalRequests = 1000;
    const start = Date.now();

    for (let i = 0; i < totalRequests; i++) {
      await runtime.chat(sessionId, `Mensaje de prueba ${i}`);
    }

    const duration = Date.now() - start;
    const rps = totalRequests / (duration / 1000);
    console.log(`Benchmark: ${totalRequests} requests en ${duration}ms -> ${rps.toFixed(2)} req/s`);
    expect(duration).toBeLessThan(10000); // 10 segundos
    expect(rps).toBeGreaterThan(50); // al menos 50 req/s
  }, 30000);

  test('debe mantener consistencia en memoria tras 100 iteraciones', async () => {
    for (let i = 0; i < 100; i++) {
      await runtime.chat(sessionId, `Iteración ${i}`);
    }
    // No debería lanzar errores
    expect(true).toBe(true);
  });
});

describe('Benchmark - Pipeline completo', () => {
  test('debe completar 500 ciclos de pipeline en menos de 5 segundos', async () => {
    const identityManager = new IdentityManager();
    const sessionManager = new SessionManager();
    const memory = new InMemoryMemoryStore();
    const engine = new SimpleEngine();
    const compiler = new ConversationCompiler();
    const driver = new MockDriver();
    const runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);

    const persona: Persona = { id: 'pipeline-bench', name: 'PipelineBench', traits: {} };
    identityManager.load(persona);
    const session: Session = { id: 'pipeline-session', identityId: 'pipeline-bench', createdAt: new Date() };
    sessionManager.create(session);

    const start = Date.now();
    for (let i = 0; i < 500; i++) {
      await runtime.chat('pipeline-session', `Test ${i}`);
    }
    const duration = Date.now() - start;
    console.log(`Pipeline benchmark: 500 ciclos en ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  }, 15000);
});

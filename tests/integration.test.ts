import { PersonaRuntime } from '../src/Runtime';
import { IdentityManager } from '../src/IdentityManager';
import { SessionManager } from '../src/SessionManager';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleEngine } from '../src/engine/SimpleEngine';
import { ConversationCompiler } from '../src/compiler/ConversationCompiler';
import { MockDriver } from '../src/MockDriver';
import { Persona, Session } from '../src/types';
import { IdentityCache } from '../src/cache/IdentityCache';
import { PersistentMemoryStore } from '../src/storage/PersistentMemoryStore';
import { SnapshotStore } from '../src/storage/SnapshotStore';
import { RelationshipStore } from '../src/storage/RelationshipStore';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// Usar base de datos temporal
const TEST_DB = path.join(__dirname, 'test_personaos.db');
process.env.PERSONAOS_DB_PATH = TEST_DB;

describe('Integration - Flujo completo', () => {
  let runtime: PersonaRuntime;
  let identityManager: IdentityManager;
  let sessionManager: SessionManager;
  let memory: PersistentMemoryStore;
  let snapshotStore: SnapshotStore;
  let relationshipStore: RelationshipStore;

  beforeAll(() => {
    identityManager = new IdentityManager();
    sessionManager = new SessionManager();
    memory = new PersistentMemoryStore();
    snapshotStore = new SnapshotStore();
    relationshipStore = new RelationshipStore();
    const engine = new SimpleEngine();
    const compiler = new ConversationCompiler();
    const driver = new MockDriver();
    runtime = new PersonaRuntime(identityManager, sessionManager, memory, engine, compiler, driver);
  });

  afterAll(() => {
    try { fs.unlinkSync(TEST_DB); } catch {}
  });

  test('cargar identidad, crear sesión, chatear', async () => {
    const persona: Persona = { id: 'test-user', name: 'TestUser', traits: { empathy: 0.8 } };
    identityManager.load(persona);
    const session: Session = { id: 'test-session', identityId: 'test-user', createdAt: new Date() };
    sessionManager.create(session);

    const reply = await runtime.chat('test-session', 'Hola mundo');
    expect(reply).toContain('[Mock]');
  });

  test('crear snapshot y recuperarlo', async () => {
    const persona: Persona = { id: 'snapshot-user', name: 'SnapshotUser', traits: {} };
    identityManager.load(persona);
    const session: Session = { id: 'snapshot-session', identityId: 'snapshot-user', createdAt: new Date() };
    sessionManager.create(session);

    await runtime.chat('snapshot-session', 'Mensaje 1');
    await runtime.chat('snapshot-session', 'Mensaje 2');

    const memoryData = await memory.load('snapshot-user');
    const snapshotId = snapshotStore.save('snapshot-user', { memories: memoryData });
    expect(snapshotId).toBeDefined();

    const loaded = snapshotStore.load(snapshotId);
    expect(loaded).not.toBeNull();
    expect(loaded!.identityId).toBe('snapshot-user');
  });

  test('crear y listar relaciones', async () => {
    const persona1: Persona = { id: 'rel-user-1', name: 'User1', traits: {} };
    const persona2: Persona = { id: 'rel-user-2', name: 'User2', traits: {} };
    identityManager.load(persona1);
    identityManager.load(persona2);

    relationshipStore.set('rel-user-1', 'rel-user-2', 'friend', 0.9, { met: '2026-08-01' });
    const rel = relationshipStore.get('rel-user-1', 'rel-user-2');
    expect(rel).not.toBeNull();
    expect(rel!.type).toBe('friend');
    expect(rel!.strength).toBeCloseTo(0.9);

    const list = relationshipStore.list('rel-user-1');
    expect(list.length).toBe(1);
  });

  test('identidad no cargada debe lanzar error', async () => {
    const session: Session = { id: 'ghost-session', identityId: 'no-existe', createdAt: new Date() };
    sessionManager.create(session);
    await expect(runtime.chat('ghost-session', 'Hola')).rejects.toThrow('Identity not loaded');
  });
});

describe('Integration - Genome y evolución', () => {
  test('genoma debe compilar a IR', async () => {
    const { alexGenome } = require('../src/genome/alexGenome');
    const { GenomeCompiler } = require('../src/genome/GenomeCompiler');
    const compiler = new GenomeCompiler();

    const ir = compiler.compile(alexGenome, 'alex', [], ['help']);
    expect(ir.identity).toBe('alex');
    expect(ir.behavior).toContain('Empathy');
    expect(ir.behavior).toContain('Humor');
  });

  test('evolución debe mutar genoma', async () => {
    const { alexGenome } = require('../src/genome/alexGenome');
    const { EvolutionEngine } = require('../src/genome/EvolutionEngine');
    const engine = new EvolutionEngine();

    const events = [
      { type: 'positive' as const, traitPath: ['Empathy'], delta: 0.1 },
      { type: 'positive' as const, traitPath: ['Humor'], delta: 0.05 },
    ];
    const evolved = engine.evolve(alexGenome, events);
    expect(evolved.lastMutation).toBeDefined();
    expect(evolved.traits[0].value).toBeGreaterThan(0.85);
  });
});

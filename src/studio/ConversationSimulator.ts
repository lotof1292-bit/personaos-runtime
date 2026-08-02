import { PersonaRuntime } from '../Runtime';
import { IdentityManager } from '../IdentityManager';
import { SessionManager } from '../SessionManager';
import { PersistentMemoryStore } from '../storage/PersistentMemoryStore';
import { SimpleEngine } from '../engine/SimpleEngine';
import { ConversationCompiler } from '../compiler/ConversationCompiler';
import { MockDriver } from '../MockDriver';
import { Persona, Session } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SimulationStep {
  input: string;
  expectedBehavior?: string;
  expectedEmotion?: string;
  actualOutput: string;
  passed: boolean;
  duration: number;
}

export interface SimulationResult {
  identityId: string;
  steps: SimulationStep[];
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  averageDuration: number;
  startedAt: Date;
  finishedAt: Date;
}

export class ConversationSimulator {
  private runtime: PersonaRuntime;
  private identityManager: IdentityManager;
  private sessionManager: SessionManager;

  constructor() {
    this.identityManager = new IdentityManager();
    this.sessionManager = new SessionManager();
    const memory = new PersistentMemoryStore();
    const engine = new SimpleEngine();
    const compiler = new ConversationCompiler();
    const driver = new MockDriver();
    this.runtime = new PersonaRuntime(this.identityManager, this.sessionManager, memory, engine, compiler, driver);
  }

  async simulate(identityId: string, persona: Persona, conversations: { input: string; expectedBehavior?: string }[]): Promise<SimulationResult> {
    this.identityManager.load(persona);
    const session: Session = { id: uuidv4(), identityId, createdAt: new Date() };
    this.sessionManager.create(session);

    const steps: SimulationStep[] = [];
    const startedAt = new Date();

    for (const conv of conversations) {
      const stepStart = Date.now();
      const reply = await this.runtime.chat(session.id, conv.input);
      const duration = Date.now() - stepStart;

      steps.push({
        input: conv.input,
        expectedBehavior: conv.expectedBehavior,
        actualOutput: reply,
        passed: conv.expectedBehavior ? reply.toLowerCase().includes(conv.expectedBehavior.toLowerCase()) : true,
        duration,
      });
    }

    this.identityManager.unload(identityId);
    this.sessionManager.delete(session.id);

    const finishedAt = new Date();
    const passedSteps = steps.filter(s => s.passed).length;
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    return {
      identityId,
      steps,
      totalSteps: steps.length,
      passedSteps,
      failedSteps: steps.length - passedSteps,
      averageDuration: steps.length > 0 ? totalDuration / steps.length : 0,
      startedAt,
      finishedAt,
    };
  }
}

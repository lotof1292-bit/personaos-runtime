import { IdentityManager } from "./IdentityManager";
import { SessionManager } from "./SessionManager";
import { MemoryStore } from "./memory/MemoryStore";
import { PersonaEngine } from "./engine/PersonaEngine";
import { IRCompiler } from "./IRCompiler";
import { ProviderDriver } from "./ProviderDriver";

export class PersonaRuntime {
  constructor(
    private identities: IdentityManager,
    private sessions: SessionManager,
    private memory: MemoryStore,
    private engine: PersonaEngine,
    private compiler: IRCompiler,
    private driver: ProviderDriver
  ) {}

  async chat(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.resolve(sessionId);
    if (!session) throw new Error("Session not found");

    const identity = this.identities.resolve(session.identityId);
    if (!identity) throw new Error("Identity not loaded");

    const memory = await this.memory.load(identity.id);
    const result = await this.engine.execute({ identity, memory, message });
    const payload = this.compiler.compile(result.ir);
    const response = await this.driver.chat(payload);
    await this.memory.update(identity.id, message, response);
    return response;
  }
}

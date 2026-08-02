import { Persona, MemoryEntry, EngineResult } from "../types";

export interface PersonaEngine {
  execute(params: { identity: Persona; memory: MemoryEntry[]; message: string }): Promise<EngineResult>;
}

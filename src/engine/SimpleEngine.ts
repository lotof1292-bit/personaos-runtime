import { PersonaEngine } from "./PersonaEngine";
import { Persona, MemoryEntry, EngineResult } from "../types";
import { ConversationIR } from "../IRCompiler";

export class SimpleEngine implements PersonaEngine {
  async execute(params: { identity: Persona; memory: MemoryEntry[]; message: string }): Promise<EngineResult> {
    const ir: ConversationIR = {
      identity: params.identity.id,
      context: { memory: params.memory, persona: params.identity },
      reasoning: null,
      decision: null,
      behavior: "default",
      memory: params.memory,
      goals: [],
    };
    return { ir };
  }
}

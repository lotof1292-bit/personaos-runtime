import { PersonaEngine } from "./PersonaEngine";
import { Persona, MemoryEntry, EngineResult } from "../types";
import { ConversationIR } from "../IRCompiler";
import { GenomeCompiler } from "../genome/GenomeCompiler";
import { alexGenome } from '../genome/alexGenome';
import { EvolutionEngine } from '../genome/EvolutionEngine';

export class SimpleEngine implements PersonaEngine {
  private genomeCompiler = new GenomeCompiler();
  private evolutionEngine = new EvolutionEngine();

  async execute(params: { identity: Persona; memory: MemoryEntry[]; message: string }): Promise<EngineResult> {
    // Usar genoma por defecto (en futuro se cargará desde perfil)
    const genome = alexGenome;
    const goals: string[] = ['help user', 'maintain identity'];
    // Evolución basada en el mensaje del usuario
    const events = this.evolutionEngine.analyzeConversation(params.message, '');
    const evolvedGenome = this.evolutionEngine.evolve(genome, events);
    const ir: ConversationIR = this.genomeCompiler.compile(
      genome,
      params.identity.id,
      params.memory,
      goals
    );
    return { ir };
  }
}

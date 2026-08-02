import { PersonaGenome, GenomeTrait } from "./PersonaGenome";
import { ConversationIR } from "../IRCompiler";

export class GenomeCompiler {
  compile(genome: PersonaGenome, identity: string, memory: any[], goals: string[]): ConversationIR {
    const traits = this.flattenTraits(genome.traits);
    const behavior = this.traitsToBehavior(traits);
    return {
      identity,
      context: { genome: traits },
      reasoning: null,
      decision: null,
      behavior,
      memory,
      goals,
    };
  }

  private flattenTraits(traits: GenomeTrait[]): Record<string, number> {
    const flat: Record<string, number> = {};
    for (const t of traits) {
      flat[t.name] = t.value;
      if (t.children) {
        Object.assign(flat, this.flattenTraits(t.children));
      }
    }
    return flat;
  }

  private traitsToBehavior(traits: Record<string, number>): string {
    // Convierte rasgos en descripción de comportamiento para el system prompt
    const descriptions: string[] = [];
    if (traits['Empathy'] !== undefined) {
      descriptions.push(`Empathy level: ${(traits['Empathy'] * 100).toFixed(0)}%`);
    }
    if (traits['Humor'] !== undefined) {
      descriptions.push(`Humor level: ${(traits['Humor'] * 100).toFixed(0)}%`);
    }
    if (traits['Curiosity'] !== undefined) {
      descriptions.push(`Curiosity level: ${(traits['Curiosity'] * 100).toFixed(0)}%`);
    }
    return descriptions.length > 0 ? descriptions.join('. ') : 'default';
  }
}

import { PersonaGenome, GenomeTrait, DEFAULT_GENOME_RULES } from '../genome/PersonaGenome';

export interface MutationEvent {
  type: 'positive' | 'negative' | 'neutral';
  traitPath: string[];
  delta: number;
}

export class EvolutionEngine {
  private rules = DEFAULT_GENOME_RULES;

  evolve(genome: PersonaGenome, events: MutationEvent[]): PersonaGenome {
    const newTraits = this.deepCloneTraits(genome.traits);
    for (const event of events) {
      this.applyMutation(newTraits, event);
    }
    return {
      ...genome,
      traits: newTraits,
      lastMutation: new Date()
    };
  }

  private applyMutation(traits: GenomeTrait[], event: MutationEvent): void {
    for (const trait of traits) {
      if (trait.name === event.traitPath[0] && !trait.locked) {
        if (event.traitPath.length === 1) {
          const delta = event.delta * (event.type === 'positive' ? 1 : -1);
          trait.value = Math.max(this.rules.minValue, Math.min(this.rules.maxValue, trait.value + delta));
          // Ruido aleatorio si hay mutación
          if (Math.random() < this.rules.mutationRate) {
            trait.value += (Math.random() - 0.5) * 0.1;
            trait.value = Math.max(this.rules.minValue, Math.min(this.rules.maxValue, trait.value));
          }
        } else if (trait.children) {
          this.applyMutation(trait.children, {
            ...event,
            traitPath: event.traitPath.slice(1)
          });
        }
      }
    }
  }

  private deepCloneTraits(traits: GenomeTrait[]): GenomeTrait[] {
    return traits.map(t => ({
      ...t,
      value: t.value,
      locked: t.locked,
      children: t.children ? this.deepCloneTraits(t.children) : undefined
    }));
  }

  // Analizar mensaje y generar eventos de mutación
  analyzeConversation(userMessage: string, assistantReply: string): MutationEvent[] {
    const events: MutationEvent[] = [];
    // Reglas heurísticas simples
    if (userMessage.includes('gracias') || userMessage.includes('thanks')) {
      events.push({ type: 'positive', traitPath: ['Empathy'], delta: 0.02 });
    }
    if (userMessage.includes('jaja') || userMessage.includes('lol') || userMessage.includes('😄')) {
      events.push({ type: 'positive', traitPath: ['Humor'], delta: 0.03 });
    }
    if (userMessage.includes('?') && userMessage.split(' ').length > 5) {
      events.push({ type: 'positive', traitPath: ['Curiosity', 'Question Depth'], delta: 0.02 });
    }
    if (userMessage.includes('no entiendo') || userMessage.includes('explain')) {
      events.push({ type: 'positive', traitPath: ['Curiosity', 'Exploration'], delta: 0.01 });
    }
    return events;
  }
}

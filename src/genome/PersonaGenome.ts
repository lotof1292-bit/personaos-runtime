export interface GenomeTrait {
  name: string;
  value: number; // 0..1
  children?: GenomeTrait[];
  locked?: boolean; // no puede mutar
}

export interface PersonaGenome {
  traits: GenomeTrait[];
  version: string;
  created: Date;
  lastMutation?: Date;
}

export interface GenomeRules {
  minValue: number;
  maxValue: number;
  mutationRate: number;
  crossoverRate: number;
}

export const DEFAULT_GENOME_RULES: GenomeRules = {
  minValue: 0,
  maxValue: 1,
  mutationRate: 0.1,
  crossoverRate: 0.5,
};

import { Persona } from '../types';

export class IdentityCache {
  private cache = new Map<string, { persona: Persona; timestamp: number }>();
  private readonly ttl: number;

  constructor(ttlMs: number = 300000) { // 5 min default
    this.ttl = ttlMs;
  }

  get(id: string): Persona | undefined {
    const entry = this.cache.get(id);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return undefined;
    }
    return entry.persona;
  }

  set(id: string, persona: Persona): void {
    this.cache.set(id, { persona, timestamp: Date.now() });
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

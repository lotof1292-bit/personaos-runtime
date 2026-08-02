import { Persona } from "./types";

export class IdentityManager {
  private loaded = new Map<string, Persona>();

  load(persona: Persona): void {
    this.loaded.set(persona.id, persona);
  }

  unload(id: string): void {
    this.loaded.delete(id);
  }

  resolve(id: string): Persona | undefined {
    return this.loaded.get(id);
  }

  get size(): number {
    return this.loaded.size;
  }
}

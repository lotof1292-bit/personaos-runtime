import { MemoryEntry } from "../types";
import { MemoryStore } from "./MemoryStore";

export class InMemoryMemoryStore implements MemoryStore {
  private store = new Map<string, MemoryEntry[]>();

  async load(identityId: string): Promise<MemoryEntry[]> {
    return this.store.get(identityId) || [];
  }

  async update(identityId: string, userMessage: string, assistantReply: string): Promise<void> {
    const entries = this.store.get(identityId) || [];
    entries.push(
      { role: "user", content: userMessage, timestamp: new Date() },
      { role: "assistant", content: assistantReply, timestamp: new Date() }
    );
    this.store.set(identityId, entries);
  }
}

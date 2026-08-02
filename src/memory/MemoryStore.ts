import { MemoryEntry } from "../types";

export interface MemoryStore {
  load(identityId: string): Promise<MemoryEntry[]>;
  update(identityId: string, userMessage: string, assistantReply: string): Promise<void>;
}

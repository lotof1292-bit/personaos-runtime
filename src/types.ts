export interface Persona {
  id: string;
  name: string;
  traits: Record<string, number>;
}

export interface Session {
  id: string;
  identityId: string;
  createdAt: Date;
}

export interface MemoryEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface EngineResult {
  ir: any;
}

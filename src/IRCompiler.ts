export interface ConversationIR {
  identity: string;
  context: unknown;
  reasoning: unknown;
  decision: unknown;
  behavior: unknown;
  memory: unknown;
  goals: unknown;
}

export interface ProviderPayload {
  system: string;
  messages: unknown[];
}

export interface IRCompiler {
  compile(ir: ConversationIR): ProviderPayload;
}

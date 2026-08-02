import { IRCompiler, ConversationIR, ProviderPayload } from "../IRCompiler";

export class SimpleCompiler implements IRCompiler {
  compile(ir: ConversationIR): ProviderPayload {
    const system = `Eres ${ir.identity}. Comportamiento: ${ir.behavior}`;
    const messages = (ir.memory as any[] || []).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
    return { system, messages };
  }
}

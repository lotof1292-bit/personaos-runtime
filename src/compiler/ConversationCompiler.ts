import { IRCompiler, ConversationIR, ProviderPayload } from '../IRCompiler';

export class ConversationCompiler implements IRCompiler {
  compile(ir: ConversationIR): ProviderPayload {
    const system = this.buildSystemPrompt(ir);
    const messages = this.buildMessages(ir);
    return { system, messages };
  }

  private buildSystemPrompt(ir: ConversationIR): string {
    const behavior = ir.behavior || 'default';
    const goals = (ir.goals as string[] || []).join(', ');
    return `You are ${ir.identity}. Behavior: ${behavior}. Goals: ${goals}. Context: ${JSON.stringify(ir.context)}`;
  }

  private buildMessages(ir: ConversationIR): unknown[] {
    const memory = ir.memory as any[] || [];
    return memory.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  }
}

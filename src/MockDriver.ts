import { ProviderDriver, DriverCapabilities } from './ProviderDriver';
import { ProviderPayload } from './IRCompiler';

export class MockDriver implements ProviderDriver {
  readonly id = 'mock';
  readonly name = 'Mock Driver';
  readonly version = '1.0';

  async chat(payload: ProviderPayload): Promise<string> {
    const messages = payload.messages as any[];
    if (messages.length === 0) return '[Mock] No message provided';
    const lastMsg = messages[messages.length - 1];
    return '[Mock] Echo: ' + (lastMsg.content || JSON.stringify(lastMsg));
  }

  capabilities(): DriverCapabilities {
    return { streaming: false, maxTokens: 999999, models: ['mock-1'] };
  }
}

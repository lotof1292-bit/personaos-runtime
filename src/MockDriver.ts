import { ProviderDriver, DriverCapabilities } from "./ProviderDriver";
import { ProviderPayload } from "./IRCompiler";

export class MockDriver implements ProviderDriver {
  readonly id = "mock";
  readonly name = "Mock Driver";
  readonly version = "1.0";

  async chat(payload: ProviderPayload): Promise<string> {
    const lastMsg = payload.messages[payload.messages.length - 1] as any;
    return `[Mock] Echo: ${lastMsg.content || lastMsg}`;
  }

  capabilities(): DriverCapabilities {
    return { streaming: false, maxTokens: 999999, models: ["mock-1"] };
  }
}

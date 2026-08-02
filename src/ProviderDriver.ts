import { DriverCapabilities } from "./IRCompiler";

export { ProviderPayload } from "./IRCompiler";

export interface DriverCapabilities {
  streaming: boolean;
  maxTokens: number;
  models: string[];
}

export interface ProviderDriver {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  chat(payload: ProviderPayload): Promise<string>;
  stream?(payload: ProviderPayload): AsyncIterable<string>;
  capabilities(): DriverCapabilities;
}

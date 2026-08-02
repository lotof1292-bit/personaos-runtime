import { BridgeRegistry, BridgeConfig, BridgeResponse, BridgeMessage } from './BridgeSDK';
import { PersonaRuntime } from '../Runtime';

export class BridgeManager {
  private registry: BridgeRegistry;
  private runtime: PersonaRuntime;

  constructor(runtime: PersonaRuntime) {
    this.registry = new BridgeRegistry();
    this.runtime = runtime;
  }

  register(bridge: any): void {
    this.registry.register(bridge);
  }

  async startBridge(platform: string, config: BridgeConfig): Promise<void> {
    const bridge = this.registry.get(platform);
    if (!bridge) throw new Error(`Bridge for platform "${platform}" not registered`);
    await bridge.start(config);
  }

  async stopBridge(platform: string): Promise<void> {
    const bridge = this.registry.get(platform);
    if (!bridge) throw new Error(`Bridge for platform "${platform}" not registered`);
    await bridge.stop();
  }

  async handleIncoming(msg: BridgeMessage): Promise<string> {
    const reply = await this.runtime.chat(msg.userId, msg.message);
    const response: BridgeResponse = {
      platform: msg.platform,
      userId: msg.userId,
      reply
    };
    const bridge = this.registry.get(msg.platform);
    if (bridge) await bridge.send(response);
    return reply;
  }
}

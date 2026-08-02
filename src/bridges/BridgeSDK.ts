export interface BridgeConfig {
  platform: string;
  credentials: Record<string, string>;
  personaId: string;
}

export interface BridgeMessage {
  platform: string;
  userId: string;
  message: string;
  timestamp: Date;
}

export interface BridgeResponse {
  platform: string;
  userId: string;
  reply: string;
}

export interface Bridge {
  readonly platform: string;
  start(config: BridgeConfig): Promise<void>;
  stop(): Promise<void>;
  send(response: BridgeResponse): Promise<void>;
}

export class BridgeRegistry {
  private bridges = new Map<string, Bridge>();

  register(bridge: Bridge): void {
    this.bridges.set(bridge.platform, bridge);
  }

  get(platform: string): Bridge | undefined {
    return this.bridges.get(platform);
  }

  list(): string[] {
    return [...this.bridges.keys()];
  }
}

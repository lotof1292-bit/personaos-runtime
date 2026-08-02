import { Bridge, BridgeConfig, BridgeMessage, BridgeResponse } from './BridgeSDK';

export class DiscordBridge implements Bridge {
  readonly platform = 'discord';
  private config: BridgeConfig | null = null;
  private token: string = '';
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastSequence: number | null = null;
  private sessionId: string = '';

  async start(config: BridgeConfig): Promise<void> {
    this.config = config;
    this.token = config.credentials['botToken'];
    if (!this.token) throw new Error('Discord bot token required');

    console.log(`Discord bridge started for persona: ${config.personaId}`);
    await this.connectGateway();
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log('Discord bridge stopped.');
  }

  async send(response: BridgeResponse): Promise<void> {
    // Enviar mensaje a canal DM usando REST API
    const channelId = response.userId;
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: response.reply })
    });
  }

  private async connectGateway(): Promise<void> {
    // Obtener gateway URL
    const gateway = await fetch('https://discord.com/api/v10/gateway/bot', {
      headers: { 'Authorization': `Bot ${this.token}` }
    }).then(r => r.json()) as any;

    const wsUrl = gateway.url + '/?v=10&encoding=json';

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Discord WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleGatewayEvent(data);
    };

    this.ws.onclose = () => {
      console.log('Discord WebSocket closed, reconnecting...');
      setTimeout(() => this.connectGateway(), 5000);
    };

    this.ws.onerror = (err) => {
      console.error('Discord WebSocket error:', err);
    };
  }

  private handleGatewayEvent(data: any): void {
    const { op, d, s, t } = data;

    if (s) this.lastSequence = s;

    switch (op) {
      case 10: // Hello
        this.heartbeatInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }));
          }
        }, d.heartbeat_interval);
        // Identify
        this.ws!.send(JSON.stringify({
          op: 2,
          d: {
            token: this.token,
            intents: 1 << 9, // GUILD_MESSAGES + DIRECT_MESSAGES
            properties: { os: 'linux', browser: 'personaos', device: 'personaos' }
          }
        }));
        break;

      case 0: // Dispatch
        if (t === 'READY') {
          this.sessionId = d.session_id;
          console.log(`Discord ready as user: ${d.user.username}`);
        }
        if (t === 'MESSAGE_CREATE') {
          // Ignorar mensajes propios
          if (d.author.bot) return;
          const msg: BridgeMessage = {
            platform: 'discord',
            userId: d.channel_id,
            message: d.content,
            timestamp: new Date()
          };
          console.log(`Discord message from ${d.author.username}: ${msg.message}`);
          // Aquí se llamaría al runtime para procesar
        }
        break;

      case 7: // Reconnect
        this.connectGateway();
        break;

      case 9: // Invalid session
        this.sessionId = '';
        this.connectGateway();
        break;
    }
  }
}

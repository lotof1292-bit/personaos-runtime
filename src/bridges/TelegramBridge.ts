import { Bridge, BridgeConfig, BridgeMessage, BridgeResponse } from './BridgeSDK';

export class TelegramBridge implements Bridge {
  readonly platform = 'telegram';
  private config: BridgeConfig | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdateId = 0;
  private apiBase = 'https://api.telegram.org/bot';

  async start(config: BridgeConfig): Promise<void> {
    this.config = config;
    const token = config.credentials['botToken'];
    this.apiBase = `https://api.telegram.org/bot${token}`;

    // Verificar token
    const me = await fetch(`${this.apiBase}/getMe`).then(r => r.json());
    if (!me.ok) throw new Error(`Invalid Telegram bot token: ${me.description}`);

    console.log(`Telegram bridge started for persona: ${config.personaId}`);

    // Iniciar polling
    this.pollingInterval = setInterval(() => this.poll(), 2000);
  }

  async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('Telegram bridge stopped.');
  }

  async send(response: BridgeResponse): Promise<void> {
    if (!this.config) throw new Error('Bridge not started');
    const chatId = response.userId;
    await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: response.reply })
    });
  }

  private async poll(): Promise<void> {
    if (!this.config) return;
    try {
      const updates = await fetch(`${this.apiBase}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`).then(r => r.json());
      if (!updates.ok) return;
      for (const update of updates.result) {
        if (update.message && update.message.text) {
          const msg: BridgeMessage = {
            platform: 'telegram',
            userId: update.message.chat.id.toString(),
            message: update.message.text,
            timestamp: new Date()
          };
          // Aquí se llamaría al runtime para procesar el mensaje
          // Por ahora solo mostramos
          console.log(`Telegram message from ${msg.userId}: ${msg.message}`);
          // Para integración real, necesitamos acceso al runtime
          // Pendiente: conectar con el Runtime
        }
        this.lastUpdateId = update.update_id;
      }
    } catch (err) {
      // Silenciar errores de polling
    }
  }
}

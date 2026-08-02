import { Bridge, BridgeConfig, BridgeMessage, BridgeResponse } from './BridgeSDK';

export class WhatsAppBridge implements Bridge {
  readonly platform = 'whatsapp';
  private config: BridgeConfig | null = null;
  private apiToken: string = '';
  private phoneNumberId: string = '';

  async start(config: BridgeConfig): Promise<void> {
    this.config = config;
    this.apiToken = config.credentials['apiToken'];
    this.phoneNumberId = config.credentials['phoneNumberId'];
    if (!this.apiToken || !this.phoneNumberId) {
      throw new Error('WhatsApp apiToken and phoneNumberId required');
    }
    console.log(`WhatsApp bridge started for persona: ${config.personaId}`);
  }

  async stop(): Promise<void> {
    console.log('WhatsApp bridge stopped.');
  }

  async send(response: BridgeResponse): Promise<void> {
    // Enviar mensaje usando WhatsApp Cloud API
    await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: response.userId,
        text: { body: response.reply }
      })
    });
  }

  // Webhook handler (debe configurarse en Meta Developer)
  handleWebhook(req: any, res: any): void {
    // Verificación del webhook
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && token === this.config?.credentials['webhookVerifyToken']) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Forbidden');
    }

    // Mensaje entrante POST
    if (req.method === 'POST') {
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (message && message.type === 'text' && !message.from_me) {
        const msg: BridgeMessage = {
          platform: 'whatsapp',
          userId: message.from,
          message: message.text.body,
          timestamp: new Date()
        };
        console.log(`WhatsApp message from ${msg.userId}: ${msg.message}`);
        // Aquí se procesaría con el runtime
      }

      res.sendStatus(200);
    }
  }
}

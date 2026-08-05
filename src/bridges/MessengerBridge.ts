import { Bridge, BridgeConfig, BridgeMessage, BridgeResponse } from './BridgeSDK';

export class MessengerBridge implements Bridge {
  readonly platform = 'messenger';
  private config: BridgeConfig | null = null;
  private pageAccessToken = '';
  async start(config: BridgeConfig): Promise<void> {
    this.config = config;
    this.pageAccessToken = config.credentials['pageAccessToken'];
    if (!this.pageAccessToken) throw new Error('Messenger pageAccessToken required');
    console.log('Messenger bridge started for persona: ' + config.personaId);
  }
  async stop(): Promise<void> { console.log('Messenger bridge stopped.'); }
  async send(response: BridgeResponse): Promise<void> {
    await fetch('https://graph.facebook.com/v18.0/me/messages?access_token=' + this.pageAccessToken, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: response.userId }, message: { text: response.reply } })
    });
  }
  handleWebhook(req: any, res: any): void {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && token === this.config?.credentials['webhookVerifyToken']) return res.status(200).send(challenge);
      return res.status(403).send('Forbidden');
    }
    if (req.method === 'POST') {
      for (const entry of req.body?.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message && messaging.message.text) {
            console.log('Messenger message from ' + messaging.sender.id + ': ' + messaging.message.text);
          }
        }
      }
      res.sendStatus(200);
    }
  }
}

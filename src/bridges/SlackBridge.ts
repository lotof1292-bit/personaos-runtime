import { Bridge, BridgeConfig, BridgeMessage, BridgeResponse } from './BridgeSDK';

export class SlackBridge implements Bridge {
  readonly platform = 'slack';
  private config: BridgeConfig | null = null;
  private botToken = '';
  async start(config: BridgeConfig): Promise<void> {
    this.config = config;
    this.botToken = config.credentials['botToken'];
    if (!this.botToken) throw new Error('Slack botToken required');
    console.log('Slack bridge started for persona: ' + config.personaId);
  }
  async stop(): Promise<void> { console.log('Slack bridge stopped.'); }
  async send(response: BridgeResponse): Promise<void> {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + this.botToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: response.userId, text: response.reply })
    });
  }
  handleWebhook(req: any, res: any): void {
    if (req.method === 'POST') {
      const body = req.body;
      if (body.challenge) return res.json({ challenge: body.challenge });
      if (body.event && body.event.type === 'message' && !body.event.bot_id) {
        console.log('Slack message from ' + body.event.user + ': ' + body.event.text);
      }
      res.sendStatus(200);
    }
  }
}

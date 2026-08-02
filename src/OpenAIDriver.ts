import { ProviderDriver, DriverCapabilities } from './ProviderDriver';
import { ProviderPayload } from './IRCompiler';

export class OpenAIDriver implements ProviderDriver {
  readonly id = 'openai';
  readonly name = 'OpenAI Driver';
  readonly version = '1.0';

  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(payload: ProviderPayload): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: payload.system },
          ...payload.messages,
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }

  async *stream(payload: ProviderPayload): AsyncIterable<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: payload.system },
          ...payload.messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI streaming error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const json = JSON.parse(line.slice(6));
          yield json.choices[0]?.delta?.content || '';
        }
      }
    }
  }

  capabilities(): DriverCapabilities {
    return { streaming: true, maxTokens: 4096, models: ['gpt-4', 'gpt-3.5-turbo'] };
  }
}

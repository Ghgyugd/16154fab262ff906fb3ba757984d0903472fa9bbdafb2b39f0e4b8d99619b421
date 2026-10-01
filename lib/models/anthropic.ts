import { ModelRequestOptions } from './gemini.js';

export class AnthropicAdapter {
  public id = 'anthropic';
  public name = 'Anthropic Claude';

  public isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  public async generateJson<T = any>(options: ModelRequestOptions): Promise<T> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment.');
    }

    const model = options.modelName || 'claude-3-5-haiku-20241022';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: options.temperature ?? 0.2,
        system: (options.systemInstruction || '') + '\nRespond ONLY in strict JSON without markdown formatting.',
        messages: [{ role: 'user', content: options.prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    return this.cleanAndParseJson<T>(content);
  }

  private cleanAndParseJson<T>(raw: string): T {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(cleaned);
  }
}

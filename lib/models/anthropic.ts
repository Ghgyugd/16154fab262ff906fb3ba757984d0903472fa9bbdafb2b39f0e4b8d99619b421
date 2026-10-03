import { ModelRequestOptions } from './gemini.js';

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_API_VERSION = '2023-06-01';
const MAX_OUTPUT_TOKENS = 8192;

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

    const model = options.modelName || 'claude-haiku-4-5';
    const apiVersion = process.env.ANTHROPIC_API_VERSION || DEFAULT_API_VERSION;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': apiVersion,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: options.temperature ?? 0.2,
          system: (options.systemInstruction || '') + '\nRespond ONLY in strict JSON without markdown formatting.',
          messages: [{ role: 'user', content: options.prompt }],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Anthropic API error (${response.status}).`);
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

import { ModelRequestOptions } from './gemini.js';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 4096;

export class OpenAIAdapter {
  public id = 'openai';
  public name = 'OpenAI Compatible';

  public isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  public async generateJson<T = any>(options: ModelRequestOptions): Promise<T> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment.');
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = options.modelName || 'gpt-4o-mini';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: options.temperature ?? 0.2,
          max_tokens: MAX_OUTPUT_TOKENS,
          response_format: { type: 'json_object' },
          messages: [
            ...(options.systemInstruction
              ? [{ role: 'system', content: options.systemInstruction }]
              : []),
            { role: 'user', content: options.prompt },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`OpenAI-compatible API error (${response.status}).`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
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

import Groq from 'groq-sdk';
import { ModelRequestOptions } from './gemini.js';

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Default Groq model. Overridable with GROQ_MODEL.
 * llama-3.3-70b-versatile was renamed in Groq's catalogue and now 404s, so the
 * default points at a currently served open-weight model.
 */
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/**
 * Without an explicit limit Groq applies a low default, which truncates the
 * tailoring JSON mid-object. `JSON.parse` then throws, the whole provider
 * attempt is discarded, and the request silently degrades to the local
 * scaffold instead of a real tailored resume. 8192 comfortably fits a
 * 700-word resume plus a 350-word cover letter with JSON overhead
 * (llama-3.3-70b-versatile supports up to 32768).
 */
const MAX_COMPLETION_TOKENS = 8192;

export class GroqAdapter {
  public id = 'groq';
  public name = 'Groq Llama / GPT-OSS';
  private client: Groq | null = null;

  private getClient(): Groq {
    if (!this.client) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set in environment.');
      }
      this.client = new Groq({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  }

  public async generateJson<T = any>(options: ModelRequestOptions): Promise<T> {
    const groq = this.getClient();
    const model = options.modelName || DEFAULT_MODEL;

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: options.prompt });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let completion;
    try {
      completion = await groq.chat.completions.create(
        {
          messages,
          model,
          temperature: options.temperature ?? 0.2,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          /**
           * Groq rejects `response_format: json_object` unless the literal word
           * "json" appears somewhere in the messages, so callers must include it.
           */
          response_format: { type: 'json_object' },
        },
        { timeout: REQUEST_TIMEOUT_MS, signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }

    const choice = completion.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error('Groq returned no completion choices (empty or filtered response).');
    }
    return this.cleanAndParseJson<T>(choice.message.content);
  }

  private cleanAndParseJson<T>(raw: string): T {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      // Reasoning models (gpt-oss, qwen) can emit scratch notes around the
      // object. Recover the outermost JSON payload rather than discarding the
      // whole provider attempt.
      const start = cleaned.search(/[[{]/);
      const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          // fall through to the descriptive error below
        }
      }
      throw new Error(
        `Groq returned content that is not valid JSON: ${cleaned.slice(0, 200)}`
      );
    }
  }
}

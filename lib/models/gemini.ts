import { GoogleGenAI } from '@google/genai';

const REQUEST_TIMEOUT_MS = 30_000;

// Room for a 700-word resume plus a 350-word cover letter in JSON form.
const MAX_OUTPUT_TOKENS = 8192;

export interface ModelRequestOptions {
  prompt: string;
  systemInstruction?: string;
  modelName: string;
  temperature?: number;
}

export class GeminiAdapter {
  public id = 'gemini';
  public name = 'Google Gemini';
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment.');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  public async generateJson<T = any>(options: ModelRequestOptions): Promise<T> {
    const ai = this.getClient();
    const model = options.modelName || 'gemini-2.5-flash';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.2,
          responseMimeType: 'application/json',
          // Explicit ceiling so a long tailored resume is not cut off mid-JSON.
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          httpOptions: { timeout: REQUEST_TIMEOUT_MS },
          abortSignal: controller.signal,
        },
      });
    } finally {
      clearTimeout(timer);
    }

    const rawText = typeof response?.text === 'string' ? response.text : '';
    if (!rawText.trim()) {
      throw new Error('Gemini returned an empty response body.');
    }
    return this.cleanAndParseJson<T>(rawText);
  }

  /**
   * Truncated or fenced model output is recoverable, so never throw on the first
   * JSON.parse failure: that would waste the whole provider attempt.
   */
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
      const start = cleaned.search(/[{[]/);
      const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          // fall through to the explicit error below
        }
      }
      throw new Error(
        `Gemini response was not parseable JSON: ${cleaned.slice(0, 200)}`
      );
    }
  }
}

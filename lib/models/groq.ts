import Groq from 'groq-sdk';
import { ModelRequestOptions } from './gemini.js';

export class GroqAdapter {
  public id = 'groq';
  public name = 'Groq Llama-3.3-70b';
  private client: Groq | null = null;

  private getClient(): Groq {
    if (!this.client) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not set in environment.');
      }
      this.client = new Groq({ apiKey });
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  }

  public async generateJson<T = any>(options: ModelRequestOptions): Promise<T> {
    const groq = this.getClient();
    const model = options.modelName || 'llama-3.3-70b-versatile';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: options.prompt });

    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature: options.temperature ?? 0.2,
      response_format: { type: 'json_object' },
    });

    const rawText = completion.choices[0]?.message?.content || '{}';
    return this.cleanAndParseJson<T>(rawText);
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

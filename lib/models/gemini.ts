import { GoogleGenAI } from '@google/genai';

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

    const response = await ai.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.2,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '';
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

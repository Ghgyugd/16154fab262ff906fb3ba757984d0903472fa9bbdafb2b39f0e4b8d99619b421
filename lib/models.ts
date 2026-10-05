import { GeminiAdapter } from './models/gemini.js';
import { GroqAdapter } from './models/groq.js';
import { AnthropicAdapter } from './models/anthropic.js';
import { OpenAIAdapter } from './models/openai.js';
import { supabaseDb } from './supabase-db.js';
import type { ModelRequestOptions } from './models/gemini.js';
import {
  ScoreResultSchema,
  TailorResultSchema,
  CoverLetterResultSchema,
  ParseCandidateSchema,
  ScoreResult,
  TailorResult,
  CoverLetterResult,
  ParseCandidate,
} from './schemas.js';
import {
  SCORE_MATCH_SYSTEM_PROMPT,
  TAILOR_RESUME_SYSTEM_PROMPT,
  COVER_LETTER_SYSTEM_PROMPT,
  buildScoreMatchPrompt,
  buildTailorPrompt,
  buildCoverLetterPrompt,
} from './prompts.js';
import { enforceGrounding } from './grounding.js';

export type ModelTask = 'score' | 'tailor' | 'cover_letter' | 'parse';

export interface ScoreModelInput {
  jobDescription: string;
  resumeText: string;
}

export interface TailorModelInput {
  jobDescription: string;
  /** Grounding source. Every claim in the output is validated against this. */
  sourceResumeText: string;
  missingKeywords: string[];
  jobTitle?: string | null;
  company?: string | null;
}

export interface CoverLetterModelInput {
  jobDescription: string;
  /** Grounding source. Every claim in the output is validated against this. */
  sourceResumeText: string;
  jobTitle?: string | null;
  company?: string | null;
}

export interface ParseModelInput {
  rawText: string;
}

export { type ScoreResult, type TailorResult, type CoverLetterResult, type ParseCandidate };

interface ModelPipelineEntry {
  adapter: ModelAdapter;
  modelName: string;
}

interface ModelAdapter {
  id: string;
  name: string;
  isAvailable(): boolean;
  generateJson<T = any>(options: ModelRequestOptions): Promise<T>;
}

const groqAdapter = new GroqAdapter();
const geminiAdapter = new GeminiAdapter();
const anthropicAdapter = new AnthropicAdapter();
const openaiAdapter = new OpenAIAdapter();

/**
 * Resolve the live admin-selected primary/fallback model IDs. A configured
 * model is usable only when its provider adapter has a server-side key.
 */
export async function getModelPipeline(task: ModelTask): Promise<ModelPipelineEntry[]> {
  const adapters = new Map<string, ModelAdapter>([
    ['groq', groqAdapter],
    ['gemini', geminiAdapter],
    ['anthropic', anthropicAdapter],
    ['openai', openaiAdapter],
  ] as const);
  const configuredTask = task === 'parse' ? 'resume_parse' : task;

  try {
    const [bindings, configs] = await Promise.all([
      supabaseDb.getTaskBindings(),
      supabaseDb.getLLMConfigs(),
    ]);
    const binding = bindings[configuredTask];
    const configById = new Map(configs.map((config) => [config.id, config]));
    if (binding) {
      const pipeline: ModelPipelineEntry[] = [];
      for (const id of [binding.primaryModelId, binding.fallbackModelId]) {
        const config = configById.get(id);
        if (!config?.enabled) continue;
        const adapter = adapters.get(config.provider);
        if (!adapter || !adapter.isAvailable()) continue;
        if (pipeline.some((entry) => entry.adapter.id === config.provider && entry.modelName === config.modelId)) continue;
        pipeline.push({ adapter, modelName: config.modelId });
      }
      return pipeline;
    }
  } catch {
    // A DB configuration read failure falls back to server defaults; it never
    // changes which credentials or model configuration reach the browser.
  }

  const preferred = (process.env.AI_PROVIDER || '').toLowerCase();
  const defaultOrder =
    task === 'score'
      ? ['groq', 'gemini', 'anthropic', 'openai']
      : ['gemini', 'groq', 'anthropic', 'openai'];
  const order = preferred && adapters.has(preferred)
    ? [preferred, ...defaultOrder.filter((id) => id !== preferred)]
    : defaultOrder;
  return order.flatMap((id) => {
    const adapter = adapters.get(id);
    if (!adapter?.isAvailable()) return [];
    const modelName = id === 'groq'
      ? process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
      : id === 'gemini'
        ? (task === 'score' ? process.env.SCORE_MODEL || 'gemini-2.5-flash' : process.env.TAILOR_MODEL || 'gemini-2.5-pro')
        : id === 'anthropic'
          ? (task === 'score' ? process.env.SCORE_MODEL_ANTHROPIC || 'claude-haiku-4-5' : process.env.TAILOR_MODEL_ANTHROPIC || 'claude-sonnet-4-5')
          : (task === 'score' ? 'gpt-4o-mini' : 'gpt-4o');
    return [{ adapter, modelName }];
  });
}

/**
 * Multi-Model AI Orchestration Engine with Zod Strict Output Validation
 */
export async function runModel<T = any>(task: ModelTask, input: any): Promise<T> {
  const pipeline = await getModelPipeline(task);

  if (task === 'score') {
    const { jobDescription, resumeText } = input as ScoreModelInput;
    const prompt = buildScoreMatchPrompt(jobDescription, resumeText);

    for (const { adapter, modelName } of pipeline) {
      try {
        console.log(`[AI Orchestrator] Running 'score' with ${adapter.name} (${modelName}).`);
        const rawResult = await adapter.generateJson({
          modelName,
          systemInstruction: SCORE_MATCH_SYSTEM_PROMPT,
          prompt,
          temperature: 0.2,
        });

        // Strict Zod output parsing to guarantee zero formatting errors.
        // No match_score: the percentage comes from the deterministic engine.
        const validated = ScoreResultSchema.parse({
          job_title: rawResult.job_title || 'Target Role',
          company: rawResult.company || 'Hiring Organization',
          missing_keywords: Array.isArray(rawResult.missing_keywords) ? rawResult.missing_keywords : [],
          strengths: Array.isArray(rawResult.strengths) ? rawResult.strengths : [],
          summary: rawResult.summary || 'Keyword coverage of this resume against the job description.',
          star_suggestions: Array.isArray(rawResult.star_suggestions) ? rawResult.star_suggestions : [],
        });

        return validated as unknown as T;
      } catch {
        console.warn(`[AI Orchestrator] ${adapter.id} score attempt failed; sensitive provider error details omitted.`);
      }
    }

    // Deterministic fallback if external credentials fail
    return generateHeuristicScore(jobDescription, resumeText) as unknown as T;
  }

  if (task === 'tailor') {
    const { jobDescription, sourceResumeText, missingKeywords } = input as TailorModelInput;
    const prompt = buildTailorPrompt(jobDescription, sourceResumeText, missingKeywords);

    for (const { adapter, modelName } of pipeline) {
      try {
        console.log(`[AI Orchestrator] Running 'tailor' with ${adapter.name} (${modelName}).`);
        const rawResult = await adapter.generateJson({
          modelName,
          systemInstruction: TAILOR_RESUME_SYSTEM_PROMPT,
          prompt,
          temperature: 0.2,
        });

        // Strict Zod validation
        const validated = TailorResultSchema.parse({
          tailored_resume_text: rawResult.tailored_resume_text || '',
          key_changes_made: Array.isArray(rawResult.key_changes_made) ? rawResult.key_changes_made : [],
        });

        // Final grounding pass: anything the model invented that the source
        // resume does not contain is replaced with a placeholder before it can
        // be stored, exported or copied.
        const grounded = enforceGrounding(validated.tailored_resume_text, sourceResumeText);
        return {
          ...validated,
          tailored_resume_text: grounded.text,
          notice: grounded.report.note,
        } as unknown as T;
      } catch {
        console.warn(`[AI Orchestrator] ${adapter.id} tailoring attempt failed; sensitive provider error details omitted.`);
      }
    }

    return generateHeuristicTailored(sourceResumeText, missingKeywords) as unknown as T;
  }

  if (task === 'cover_letter') {
    const { jobDescription, sourceResumeText, jobTitle, company } = input as CoverLetterModelInput;
    const prompt = buildCoverLetterPrompt(jobDescription, sourceResumeText, jobTitle || undefined, company || undefined);

    for (const { adapter, modelName } of pipeline) {
      try {
        console.log(`[AI Orchestrator] Running 'cover_letter' with ${adapter.name} (${modelName}).`);
        const rawResult = await adapter.generateJson({
          modelName,
          systemInstruction: COVER_LETTER_SYSTEM_PROMPT,
          prompt,
          temperature: 0.35,
        });

        const validated = CoverLetterResultSchema.parse({
          cover_letter_text: rawResult.cover_letter_text || '',
          referenced_keywords: Array.isArray(rawResult.referenced_keywords) ? rawResult.referenced_keywords : [],
        });

        if (!validated.cover_letter_text.trim()) continue;

        const grounded = enforceGrounding(validated.cover_letter_text, sourceResumeText);
        return {
          ...validated,
          cover_letter_text: grounded.text,
          notice: grounded.report.note,
        } as unknown as T;
      } catch {
        console.warn(`[AI Orchestrator] ${adapter.id} cover letter attempt failed; sensitive provider error details omitted.`);
      }
    }

    return generateHeuristicCoverLetter(sourceResumeText) as unknown as T;
  }

  if (task === 'parse') {
    const { rawText } = input as ParseModelInput;
    const prompt = `Extract only what is literally written in this resume text. If a field is absent, return an empty string or empty array — never guess.

${rawText.slice(0, 3000)}

Respond in valid JSON:
{
  "name": "",
  "email": "",
  "skills": [],
  "experience_years": 0
}`;

    for (const { adapter, modelName } of pipeline) {
      try {
        const raw = await adapter.generateJson({ modelName, prompt });
        const validated = ParseCandidateSchema.parse(raw);
        return validated as unknown as T;
      } catch {
        console.warn(`[AI Orchestrator] ${adapter.id} parse attempt failed; sensitive provider error details omitted.`);
      }
    }

    // No fabrication on the fallback path: return "not found", not a plausible
    // candidate. The previous fallback invented a name, an email address, three
    // skills and three years of experience.
    return {
      name: '',
      email: '',
      skills: [],
      experience_years: 0,
    } as unknown as T;
  }

  throw new Error(`Unsupported model task: ${task}`);
}

function generateHeuristicScore(jd: string, resume: string): ScoreResult {
  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();

  const commonKeywords = [
    'react', 'typescript', 'javascript', 'node.js', 'python', 'sql', 'postgresql',
    'docker', 'aws', 'kubernetes', 'graphql', 'rest api', 'next.js', 'ci/cd',
    'system design', 'agile', 'scrum', 'git', 'microservices', 'tailwind',
    'leadership', 'product management', 'analytics', 'testing', 'jest'
  ];

  const jdKeywords = commonKeywords.filter(kw => jdLower.includes(kw));
  const matched = jdKeywords.filter(kw => resumeLower.includes(kw));
  const missing = jdKeywords.filter(kw => !resumeLower.includes(kw));

  return {
    job_title: jd.slice(0, 60).split('\n')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Target Role',
    company: 'Target Organization',
    // Only report genuinely missing keywords; never pad with invented filler.
    missing_keywords: missing.slice(0, 12),
    strengths: matched.slice(0, 5).map(m => `Your resume explicitly mentions ${m}`),
    summary:
      matched.length > 0
        ? `Local keyword check (not an AI assessment): your resume mentions ${matched.length} of the ${jdKeywords.length} tracked keywords in this description.`
        : 'No tracked keywords from this job description were found in your resume. This is a local keyword check, not an AI assessment.',
    star_suggestions: missing.slice(0, 3).map((kw) => ({
      original: `(No bullet in your resume currently evidences ${kw}.)`,
      suggestion: `Add a bullet from your own experience demonstrating ${kw}. Use action + method + your real measurable result, or write [add metric] if you cannot substantiate a number.`,
      keyword: kw,
    })),
    synthetic: true,
    notice: 'No AI provider responded to this request, so these notes come from ResumeSetu local keyword matching only.',
  };
}

/**
 * Local fallback used ONLY when every AI provider is unavailable.
 *
 * It must never invent content. The previous version fabricated achievements
 * ("38% improvement", "99.9% uptime"), employers, degrees and an inflated
 * "improved_match_score: 94", then persisted that as the user's tailored
 * resume. This scaffold is derived strictly from the candidate's own text and
 * is explicitly flagged synthetic.
 */
function generateHeuristicTailored(resume: string, missingKeywords: string[]): TailorResult {
  const missing = missingKeywords.slice(0, 10);

  // Use the candidate's own resume text as the body. No invented sections.
  const ownText = (resume || '').trim();
  const body =
    ownText.length > 80
      ? ownText
      : '[Your resume text could not be read. Re-upload your resume as a text-based PDF or DOCX to generate a tailored version.]';

  const sections: string[] = [];
  if (missing.length) {
    sections.push(
      `GAPS — keywords this job description asks for that your resume does not evidence:\n${missing
        .map((k) => `  - ${k}`)
        .join('\n')}\n\nThese are gaps, not achievements. Only claim them if you genuinely have that experience; if you do, add a bullet under your most relevant role that demonstrates it.`
    );
  }
  sections.push(
    'Check every bullet for a measurable result (volume, percentage, time saved, revenue, latency). Write your real number, or write [add metric] if you do not have one yet.'
  );
  sections.push(
    'Mirror the exact terminology used in the job description only where it accurately describes your experience, so keyword-based screeners can match it.'
  );

  const tailoredResumeText = [
    body,
    '',
    '='.repeat(60),
    'ACTION CHECKLIST (generated locally - no AI provider was configured)',
    '='.repeat(60),
    '',
    ...sections,
  ].join('\n');

  return {
    tailored_resume_text: tailoredResumeText,
    key_changes_made: [
      'No AI rewrite was applied: no model provider responded to the request.',
      'Your original resume text was preserved verbatim and appended with an action checklist.',
      `Listed ${missing.length} genuinely missing keyword(s) detected by the ATS matcher.`,
    ],
    synthetic: true,
    notice:
      'No AI provider responded, so no tailored resume was written. ' +
      'What you see is your original resume text plus a checklist. No content was invented.',
  };
}

/**
 * Local fallback for the cover-letter task. It is an outline to fill in, not a
 * letter: the previous implementation produced generic prose that read as if it
 * had been written for the candidate.
 */
function generateHeuristicCoverLetter(resume: string): CoverLetterResult {
  const ownText = (resume || '').trim();

  return {
    cover_letter_text: [
      'No AI provider was configured, so ResumeSetu did not write a cover letter for you.',
      'Nothing below is finished copy — it is the outline to fill in with your own words:',
      '',
      '1. Opening (2 sentences): the role you are applying for and the single most relevant thing you have done that matches it.',
      ownText
        ? `   Check your resume for the real example to use: open it above and pick the bullet under "${ownText.split('\n').find((line) => line.trim().length > 20)?.trim().slice(0, 60) ?? 'your most relevant role'}".`
        : '   Re-upload your resume first, then pick the bullet under your most relevant role.',
      '2. Middle (3-4 sentences): the responsibilities in this posting you have actually done, described concretely.',
      '3. Closing (1-2 sentences): what you want to focus on next, and how to reach you.',
      '',
      'Only make claims you can defend in an interview.',
    ].join('\n'),
    referenced_keywords: [],
    synthetic: true,
    notice:
      'No AI provider responded, so this is an outline rather than a written letter. No claims were invented.',
  };
}

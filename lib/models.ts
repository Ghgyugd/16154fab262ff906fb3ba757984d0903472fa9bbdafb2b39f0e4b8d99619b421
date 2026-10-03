import { GeminiAdapter } from './models/gemini.js';
import { GroqAdapter } from './models/groq.js';
import { AnthropicAdapter } from './models/anthropic.js';
import { OpenAIAdapter } from './models/openai.js';
import { supabaseDb } from './supabase-db.js';
import type { ModelRequestOptions } from './models/gemini.js';
import {
  ScoreResultSchema,
  TailorResultSchema,
  ParseCandidateSchema,
  ScoreResult,
  TailorResult,
  ParseCandidate,
} from './schemas.js';
import {
  SCORE_MATCH_SYSTEM_PROMPT,
  TAILOR_RESUME_SYSTEM_PROMPT,
  buildScoreMatchPrompt,
  buildTailorPrompt,
} from './prompts.js';

export type ModelTask = 'score' | 'tailor' | 'parse';

export interface ScoreModelInput {
  jobDescription: string;
  resumeText: string;
}

export interface TailorModelInput {
  jobDescription: string;
  resumeText: string;
  missingKeywords: string[];
}

export interface ParseModelInput {
  rawText: string;
}

export { type ScoreResult, type TailorResult, type ParseCandidate };

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
 * Coerces a model-supplied score into a valid 0-100 number.
 *
 * `Number(x) || fallback` was used previously, which silently converted a
 * legitimate score of 0 into a flattering fallback (75 / 92). A real zero is
 * preserved; only genuinely unusable input takes the fallback.
 */
function normalizeScore(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

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
  const defaultOrder = task === 'score'
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
        ? (task === 'tailor' ? process.env.TAILOR_MODEL || 'gemini-2.5-pro' : process.env.SCORE_MODEL || 'gemini-2.5-flash')
        : id === 'anthropic'
          ? (task === 'tailor' ? process.env.TAILOR_MODEL_ANTHROPIC || 'claude-sonnet-4-5' : process.env.SCORE_MODEL_ANTHROPIC || 'claude-haiku-4-5')
          : (task === 'tailor' ? 'gpt-4o' : 'gpt-4o-mini');
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

        // Strict Zod output parsing to guarantee zero formatting errors
        const validated = ScoreResultSchema.parse({
          job_title: rawResult.job_title || 'Target Role',
          company: rawResult.company || 'Hiring Organization',
          match_score: normalizeScore(rawResult.match_score, 0),
          missing_keywords: Array.isArray(rawResult.missing_keywords) ? rawResult.missing_keywords : [],
          strengths: Array.isArray(rawResult.strengths) ? rawResult.strengths : [],
          summary: rawResult.summary || 'Resume analyzed against technical rubrics.',
          star_suggestions: Array.isArray(rawResult.star_suggestions) ? rawResult.star_suggestions : [],
        });

        return validated as unknown as T;
      } catch (err: any) {
        console.warn(`[AI Orchestrator] ${adapter.id} score attempt failed; sensitive provider error details omitted.`);
      }
    }

    // Deterministic fallback if external credentials fail
    return generateHeuristicScore(jobDescription, resumeText) as unknown as T;
  }

  if (task === 'tailor') {
    const { jobDescription, resumeText, missingKeywords } = input as TailorModelInput;
    const prompt = buildTailorPrompt(jobDescription, resumeText, missingKeywords);

    for (const { adapter, modelName } of pipeline) {
      try {
        console.log(`[AI Orchestrator] Running 'tailor' with ${adapter.name} (${modelName}).`);
        const rawResult = await adapter.generateJson({
          modelName,
          systemInstruction: TAILOR_RESUME_SYSTEM_PROMPT,
          prompt,
          temperature: 0.3,
        });

        // Strict Zod validation
        const validated = TailorResultSchema.parse({
          tailored_resume_text: rawResult.tailored_resume_text || '',
          cover_letter_text: rawResult.cover_letter_text || '',
          key_changes_made: Array.isArray(rawResult.key_changes_made) ? rawResult.key_changes_made : [],
          improved_match_score: normalizeScore(rawResult.improved_match_score, 0),
        });

        return validated as unknown as T;
      } catch (err: any) {
        console.warn(`[AI Orchestrator] ${adapter.id} tailoring attempt failed; sensitive provider error details omitted.`);
      }
    }

    return generateHeuristicTailored(jobDescription, resumeText, missingKeywords) as unknown as T;
  }

  if (task === 'parse') {
    const { rawText } = input as ParseModelInput;
    const prompt = `Extract candidate details from resume:
${rawText.slice(0, 3000)}

Respond in valid JSON:
{
  "name": "Full Name",
  "email": "candidate@example.com",
  "skills": ["Skill1", "Skill2"],
  "experience_years": 3
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

    return {
      name: 'Applicant Candidate',
      email: 'candidate@example.com',
      skills: ['TypeScript', 'React', 'Problem Solving'],
      experience_years: 3,
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

  // No evidence either way: report 0 rather than inventing a flattering number.
  const score = jdKeywords.length > 0
    ? Math.round((matched.length / jdKeywords.length) * 100)
    : 0;

  return {
    job_title: jd.slice(0, 60).split('\n')[0].replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Target Role',
    company: 'Target Organization',
    match_score: Math.max(0, Math.min(100, score)),
    // Only report genuinely missing keywords; never pad with invented filler.
    missing_keywords: missing.slice(0, 8),
    strengths: matched.slice(0, 5).map(m => `Your resume explicitly mentions ${m}`),
    summary:
      matched.length > 0
        ? `Locally scored ${score}%: your resume mentions ${matched.length} of the ${jdKeywords.length} tracked keywords in this description. Not an AI assessment.`
        : 'No tracked keywords from this job description were found in your resume. This is a local keyword check, not an AI assessment.',
    star_suggestions: missing.slice(0, 3).map((kw) => ({
      original: `(No bullet found that evidences ${kw}.)`,
      suggestion: `Add a bullet from your own experience demonstrating ${kw}. Use action + method + your real measurable result.`,
      keyword: kw,
    })),
    synthetic: true,
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
function generateHeuristicTailored(jd: string, resume: string, missingKeywords: string[]): TailorResult {
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
      `Keywords this job description asks for that your resume does not yet evidence:\n${missing
        .map((k) => `  - ${k}`)
        .join('\n')}\n\nFor each one, add a bullet under your most relevant role that demonstrates real experience with it. Only claim what you have actually done.`
    );
  }
  sections.push(
    'Check every bullet for a measurable result (volume, percentage, time saved, revenue, latency). Replace vague statements with numbers you can defend in an interview.'
  );
  sections.push(
    'Mirror the exact terminology used in the job description where it accurately describes your experience, so keyword-based screeners can match it.'
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

  const coverLetterText = [
    'Dear Hiring Team,',
    '',
    'I am applying for this role and believe my background is relevant.',
    '',
    '[Scaffold only: no AI provider was configured, so no cover letter was drafted for you.]',
    `Write three short paragraphs covering: (1) the most relevant role and its scope,`,
    `(2) one or two concrete projects that map onto this job's requirements${missing.length ? ` (for example: ${missing.slice(0, 3).join(', ')})` : ''}, and`,
    '(3) what you want to focus on next. Use only claims you can substantiate.',
    '',
    'Sincerely,',
    '[Your name]',
  ].join('\n');

  return {
    tailored_resume_text: tailoredResumeText,
    cover_letter_text: coverLetterText,
    key_changes_made: [
      'No AI rewrite was applied: no model provider responded to the request.',
      'Your original resume text was preserved verbatim and appended with an action checklist.',
      `Listed ${missing.length} genuinely missing keyword(s) detected by the ATS matcher.`,
    ],
    // Honest: we cannot know an improved score without actually tailoring.
    improved_match_score: 0,
    synthetic: true,
    notice:
      'No AI provider responded (GEMINI_API_KEY / GROQ_API_KEY are not configured), so no tailored resume was written. ' +
      'What you see is your original resume text plus a checklist. No content was invented.',
  };
}

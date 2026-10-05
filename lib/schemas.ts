import { z } from 'zod';

export const StarSuggestionSchema = z.object({
  original: z.string().describe('The original resume bullet point draft'),
  suggestion: z.string().describe('The optimized STAR formula bullet with quantifiable impact'),
  keyword: z.string().describe('The primary technical or domain keyword incorporated'),
  situation_task: z.string().optional().describe('Context or problem addressed'),
  action: z.string().optional().describe('Action taken and technologies used'),
  result: z.string().optional().describe('Quantifiable benchmark or business outcome'),
});

/**
 * Model output for the `score` task.
 *
 * There is deliberately NO `match_score` field: the ATS percentage is computed
 * by the deterministic engine in `lib/ats-engine.ts` from the two documents, so
 * asking a language model to also emit a score only created a second, competing
 * and unauditable number.
 */
export const ScoreResultSchema = z.object({
  job_title: z.string().default('Target Position'),
  company: z.string().default('Target Company'),
  missing_keywords: z.array(z.string()).max(50),
  strengths: z.array(z.string()).max(20),
  summary: z.string(),
  star_suggestions: z.array(StarSuggestionSchema).optional().default([]),
  /**
   * True when this result was produced by the deterministic local fallback
   * rather than a real model. Consumers must not present it as AI output.
   */
  synthetic: z.boolean().optional().default(false),
  /** Shown to the user when `synthetic` is true, or after grounding rewrites. */
  notice: z.string().optional(),
});

/**
 * Model output for the `tailor` task.
 *
 * `improved_match_score` was removed: predicting the score a rewrite "would"
 * achieve is a fabricated number. The honest post-tailor number is recomputed by
 * re-running the engine on the new text.
 */
export const TailorResultSchema = z.object({
  tailored_resume_text: z.string().max(60_000),
  key_changes_made: z.array(z.string()).max(30),
  /** True when no AI provider responded and this is a local scaffold, not a rewrite. */
  synthetic: z.boolean().optional().default(false),
  /** Human-readable explanation shown to the user when synthetic is true. */
  notice: z.string().optional(),
});

export const CoverLetterResultSchema = z.object({
  cover_letter_text: z.string().max(20_000),
  referenced_keywords: z.array(z.string()).max(20).optional().default([]),
  synthetic: z.boolean().optional().default(false),
  notice: z.string().optional(),
});

export const ParseCandidateSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().default(0),
});

export type StarSuggestion = z.infer<typeof StarSuggestionSchema>;
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
export type TailorResult = z.infer<typeof TailorResultSchema>;
export type CoverLetterResult = z.infer<typeof CoverLetterResultSchema>;
export type ParseCandidate = z.infer<typeof ParseCandidateSchema>;

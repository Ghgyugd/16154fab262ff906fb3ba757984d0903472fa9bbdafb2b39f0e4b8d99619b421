import { z } from 'zod';

export const StarSuggestionSchema = z.object({
  original: z.string().describe('The original resume bullet point draft'),
  suggestion: z.string().describe('The optimized STAR formula bullet with quantifiable impact'),
  keyword: z.string().describe('The primary technical or domain keyword incorporated'),
  situation_task: z.string().optional().describe('Context or problem addressed'),
  action: z.string().optional().describe('Action taken and technologies used'),
  result: z.string().optional().describe('Quantifiable benchmark or business outcome'),
});

export const ScoreResultSchema = z.object({
  job_title: z.string().default('Target Position'),
  company: z.string().default('Target Company'),
  match_score: z.number().min(0).max(100),
  missing_keywords: z.array(z.string()).max(50),
  strengths: z.array(z.string()).max(20),
  summary: z.string(),
  star_suggestions: z.array(StarSuggestionSchema).optional().default([]),
  /**
   * True when this result was produced by the deterministic local fallback
   * rather than a real model. Consumers must not present it as AI output.
   */
  synthetic: z.boolean().optional().default(false),
});

export const TailorResultSchema = z.object({
  tailored_resume_text: z.string().max(60_000),
  cover_letter_text: z.string().max(20_000),
  key_changes_made: z.array(z.string()).max(30),
  improved_match_score: z.number().min(0).max(100),
  /** True when no AI provider responded and this is a local scaffold, not a rewrite. */
  synthetic: z.boolean().optional().default(false),
  /** Human-readable explanation shown to the user when synthetic is true. */
  notice: z.string().optional(),
});

export const ParseCandidateSchema = z.object({
  name: z.string().default('Candidate'),
  email: z.string().email().default('candidate@example.com'),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().default(1),
});

export type StarSuggestion = z.infer<typeof StarSuggestionSchema>;
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
export type TailorResult = z.infer<typeof TailorResultSchema>;
export type ParseCandidate = z.infer<typeof ParseCandidateSchema>;

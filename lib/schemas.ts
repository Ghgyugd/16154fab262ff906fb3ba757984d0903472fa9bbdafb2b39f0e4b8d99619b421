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
  missing_keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  summary: z.string(),
  star_suggestions: z.array(StarSuggestionSchema).optional().default([]),
});

export const TailorResultSchema = z.object({
  tailored_resume_text: z.string(),
  cover_letter_text: z.string(),
  key_changes_made: z.array(z.string()),
  improved_match_score: z.number().min(0).max(100),
});

export const ParseCandidateSchema = z.object({
  name: z.string().default('Candidate'),
  email: z.string().default('candidate@example.com'),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().default(1),
});

export type StarSuggestion = z.infer<typeof StarSuggestionSchema>;
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
export type TailorResult = z.infer<typeof TailorResultSchema>;
export type ParseCandidate = z.infer<typeof ParseCandidateSchema>;

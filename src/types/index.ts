export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  plan: 'free' | 'pro';
  credits_remaining: number;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  role?: 'OWNER' | 'ADMIN' | 'USER';
  isBanned?: boolean;
  banReason?: string;
  totalTimeSpentSeconds?: number;
  lastActiveAt?: string;
  razorpay_subscription_id?: string | null;
  created_at: string;
}

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  modelId: string;
  apiKeyEnv?: string;
  contextWindow: string;
  latencyTier: 'sub-second' | 'standard' | 'deep-reasoning';
  enabled: boolean;
  createdAt: string;
}

export interface TaskBinding {
  task: 'score' | 'tailor' | 'cover_letter' | 'star_bullet' | 'resume_parse';
  taskLabel: string;
  primaryModelId: string;
  fallbackModelId: string;
}

export interface SystemSettings {
  promptInjectionShield: boolean;
  maxUploadSizeMb: number;
  freeTierMonthlyLimit: number;
  proPriceInr: number;
  rateLimitWindowDays: number;
  maintenanceMode: boolean;
  allowedFileExtensions: string[];
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  event:
    | 'USER_BANNED'
    | 'USER_UNBANNED'
    | 'ROLE_CHANGED'
    | 'PRO_TOGGLED'
    | 'PROMPT_INJECTION_BLOCKED'
    | 'RATE_LIMIT_HIT'
    | 'LLM_ROUTED'
    | 'ADMIN_LOGIN'
    | 'CREDITS_UPDATED';
  severity: 'info' | 'warning' | 'critical';
  details: string;
  ip?: string;
  actorEmail?: string;
  targetUserId?: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeProMembers: number;
  freeMembers: number;
  bannedUsers: number;
  adminUsers: number;
  proAdoptionRate: number;
  totalScansPerformed: number;
  totalDocumentsParsed: number;
  totalApplicationsTracked: number;
  avgAtsScore: number;
  totalTimeSpentSeconds: number;
  avgSessionDurationMinutes: number;
  scansByRole: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  llmMetrics: {
    groqTokens: number;
    geminiTokens: number;
    totalTokens: number;
    estimatedCostUsd: string;
  };
}

export interface ResumeCheck {
  id: string;
  user_id: string;
  job_title?: string;
  company?: string;
  job_description: string;
  resume_file_name?: string;
  resume_file_url: string;
  match_score: number;
  missing_keywords: string[];
  strengths: string[];
  summary: string;
  tailored_resume_text?: string | null;
  cover_letter_text?: string | null;
  created_at: string;
}

export interface TailoredResult {
  tailored_resume_text: string;
  cover_letter_text: string;
  key_changes_made?: string[];
  improved_match_score?: number;
}

export interface ApplicationTrackerItem {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  status: 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  stage: 'Saved' | 'Applied' | 'Tech Screen' | 'Final Round' | 'Offer' | 'Archived';
  appliedDate: string;
  notes: string;
}

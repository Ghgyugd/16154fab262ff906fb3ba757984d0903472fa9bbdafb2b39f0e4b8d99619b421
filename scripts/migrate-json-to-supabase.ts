import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

interface LegacyState {
  users?: Record<string, any>;
  resumes?: Record<string, any>;
  jobScans?: Record<string, any> | any[];
  applications?: Record<string, any>;
  llmConfigs?: Record<string, any>;
  taskBindings?: Record<string, any>;
  systemSettings?: Record<string, any>;
  securityLogs?: any[];
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_STORAGE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL (or legacy SUPABASE_STORAGE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
}

const filePath = path.resolve(process.argv[2] || 'data/db.json');
const state = JSON.parse(await fs.readFile(filePath, 'utf8')) as LegacyState;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function values<T>(value: Record<string, T> | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

function asDate(value: unknown, fallback = new Date().toISOString()): string {
  const parsed = new Date(String(value || fallback));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

const sourceUsers = values(state.users);
const userIds = new Set(sourceUsers.map((user: any) => String(user.id)));
const missingUserReferences = [
  ...values(state.resumes).map((row: any) => ({ entity: 'resume', rowId: row.id, userId: row.userId })),
  ...values(state.jobScans).map((row: any) => ({ entity: 'job scan', rowId: row.id, userId: row.userId || row.user_id })),
  ...values(state.applications).map((row: any) => ({ entity: 'application', rowId: row.id, userId: row.userId })),
].filter((row) => !row.userId || !userIds.has(String(row.userId)));
if (missingUserReferences.length) {
  const examples = missingUserReferences.slice(0, 5)
    .map((row) => `${row.entity} ${row.rowId} -> ${row.userId || '(missing userId)'}`)
    .join('; ');
  throw new Error(`Import stopped before writing: ${missingUserReferences.length} row(s) reference missing users. Repair data/db.json first. Examples: ${examples}`);
}

async function upsert(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: imported ${rows.length} row(s)`);
}

const users = sourceUsers.map((row: any) => ({
  id: String(row.id),
  email: String(row.email || `${row.id}@legacy.invalid`).toLowerCase(),
  display_name: row.displayName ?? null,
  photo_url: row.photoURL ?? null,
  auth_provider_id: row.authProviderId ?? null,
  current_plan: row.currentPlan === 'PRO' ? 'PRO' : 'FREE',
  monthly_scans_used: Math.max(0, Number(row.monthlyScansUsed) || 0),
  credit_reset_date: asDate(row.creditResetDate),
  is_admin: Boolean(row.isAdmin),
  role: ['OWNER', 'ADMIN', 'USER'].includes(row.role) ? row.role : 'USER',
  is_banned: Boolean(row.isBanned),
  ban_reason: row.banReason ?? null,
  total_time_spent_seconds: Math.max(0, Number(row.totalTimeSpentSeconds) || 0),
  last_active_at: row.lastActiveAt ? asDate(row.lastActiveAt) : null,
  created_at: asDate(row.createdAt),
  updated_at: asDate(row.updatedAt || row.createdAt),
}));

const resumes = values(state.resumes).map((row: any) => ({
  id: String(row.id),
  user_id: String(row.userId),
  original_file_name: String(row.originalFileName || 'resume'),
  file_url: String(row.fileUrl || ''),
  storage_key: row.storageKey ?? null,
  storage_provider: row.storageProvider === 'supabase' ? 'supabase' : 'local_encrypted',
  download_url: row.downloadUrl ?? null,
  mime_type: row.mimeType ?? null,
  parsed_text: String(row.parsedText || ''),
  star_formatted_bullets: row.starFormattedBullets ?? null,
  created_at: asDate(row.createdAt),
}));

const scans = values(state.jobScans).map((row: any) => ({
  id: String(row.id),
  user_id: String(row.userId || row.user_id),
  job_title: row.jobTitle ?? row.job_title ?? null,
  company_name: row.companyName ?? row.company ?? null,
  job_description_text: String(row.jobDescriptionText ?? row.job_description ?? ''),
  match_score: Math.min(100, Math.max(0, Number(row.matchScore ?? row.match_score) || 0)),
  missing_keywords: row.missingKeywords ?? row.missing_keywords ?? [],
  strengths: row.strengths ?? null,
  summary: row.summary ?? null,
  star_suggestions: row.starSuggestions ?? row.star_suggestions ?? null,
  tailored_resume_text: row.tailoredResumeText ?? row.tailored_resume_text ?? null,
  cover_letter_text: row.coverLetterText ?? row.cover_letter_text ?? null,
  tailored_synthetic: Boolean(row.tailoredSynthetic),
  tailored_notice: row.tailoredNotice ?? null,
  created_at: asDate(row.createdAt ?? row.created_at),
}));

const applications = values(state.applications).map((row: any) => ({
  id: String(row.id),
  user_id: String(row.userId),
  company: String(row.company || ''),
  role: String(row.role || ''),
  match_score: Math.min(100, Math.max(0, Number(row.matchScore) || 0)),
  status: ['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(row.status) ? row.status : 'APPLIED',
  applied_date: /^\d{4}-\d{2}-\d{2}$/.test(String(row.appliedDate)) ? row.appliedDate : new Date(row.appliedDate || Date.now()).toISOString().slice(0, 10),
  notes: row.notes ?? null,
  created_at: asDate(row.createdAt),
}));

const llms = values(state.llmConfigs).map((row: any) => ({
  id: String(row.id),
  name: String(row.name),
  provider: String(row.provider),
  model_id: String(row.modelId),
  api_key_env: row.apiKeyEnv ?? null,
  context_window: String(row.contextWindow || ''),
  latency_tier: String(row.latencyTier || 'standard'),
  enabled: row.enabled !== false,
  created_at: asDate(row.createdAt),
}));

const bindings = values(state.taskBindings).map((row: any) => ({
  task: String(row.task),
  task_label: String(row.taskLabel || row.task),
  primary_model_id: String(row.primaryModelId),
  fallback_model_id: String(row.fallbackModelId),
}));

const settings = state.systemSettings ? [{
  id: 'singleton',
  prompt_injection_shield: state.systemSettings.promptInjectionShield !== false,
  max_upload_size_mb: Number(state.systemSettings.maxUploadSizeMb) || 5,
  free_tier_monthly_limit: Number(state.systemSettings.freeTierMonthlyLimit) || 3,
  pro_price_inr: Number(state.systemSettings.proPriceInr) || 249,
  rate_limit_window_days: Number(state.systemSettings.rateLimitWindowDays) || 30,
  maintenance_mode: Boolean(state.systemSettings.maintenanceMode),
  allowed_file_extensions: state.systemSettings.allowedFileExtensions || ['.pdf', '.docx'],
}] : [];

const securityLogs = (state.securityLogs || []).map((row: any) => ({
  id: String(row.id),
  timestamp: asDate(row.timestamp),
  event: String(row.event),
  severity: ['info', 'warning', 'critical'].includes(row.severity) ? row.severity : 'info',
  details: String(row.details || ''),
  ip: row.ip || null,
  actor_email: row.actorEmail ?? null,
  target_user_id: row.targetUserId && userIds.has(String(row.targetUserId)) ? row.targetUserId : null,
}));

await upsert('users', users);
await upsert('resumes', resumes);
await upsert('job_scans', scans);
await upsert('applications', applications);
await upsert('llm_configs', llms);
if (bindings.length) {
  const { error } = await supabase.from('task_bindings').upsert(bindings, { onConflict: 'task' });
  if (error) throw new Error(`task_bindings: ${error.message}`);
  console.log(`task_bindings: imported ${bindings.length} row(s)`);
}
if (settings.length) {
  const { error } = await supabase.from('system_settings').upsert(settings, { onConflict: 'id' });
  if (error) throw new Error(`system_settings: ${error.message}`);
  console.log('system_settings: imported singleton');
}
if (securityLogs.length) {
  const { error } = await supabase.from('security_logs').upsert(securityLogs, { onConflict: 'id' });
  if (error) throw new Error(`security_logs: ${error.message}`);
  console.log(`security_logs: imported ${securityLogs.length} row(s)`);
}
console.log(`Migration import completed from ${filePath}. Local JSON data was not modified.`);

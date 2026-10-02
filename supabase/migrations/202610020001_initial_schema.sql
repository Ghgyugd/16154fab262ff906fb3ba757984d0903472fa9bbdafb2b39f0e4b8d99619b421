begin;

do $$ begin
  create type public.plan as enum ('FREE', 'PRO');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_role as enum ('OWNER', 'ADMIN', 'USER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.application_status as enum ('APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED');
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id text primary key,
  email text not null unique,
  display_name text,
  photo_url text,
  auth_provider_id text unique,
  current_plan public.plan not null default 'FREE',
  monthly_scans_used integer not null default 0 check (monthly_scans_used >= 0),
  credit_reset_date timestamptz not null,
  is_admin boolean not null default false,
  role public.user_role not null default 'USER',
  is_banned boolean not null default false,
  ban_reason text,
  total_time_spent_seconds bigint not null default 0 check (total_time_spent_seconds >= 0),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_role_plan_idx on public.users (role, current_plan);
create index if not exists users_last_active_at_idx on public.users (last_active_at desc);

create table if not exists public.resumes (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  original_file_name text not null,
  file_url text not null,
  storage_key text,
  storage_provider text not null default 'local_encrypted' check (storage_provider in ('local_encrypted', 'supabase')),
  download_url text,
  mime_type text,
  parsed_text text not null,
  star_formatted_bullets jsonb,
  created_at timestamptz not null default now()
);
create index if not exists resumes_user_created_idx on public.resumes (user_id, created_at desc);

create table if not exists public.job_scans (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  job_title text,
  company_name text,
  job_description_text text not null,
  match_score double precision not null check (match_score >= 0 and match_score <= 100),
  missing_keywords jsonb not null default '[]'::jsonb,
  strengths jsonb,
  summary text,
  star_suggestions jsonb,
  tailored_resume_text text,
  cover_letter_text text,
  tailored_synthetic boolean not null default false,
  tailored_notice text,
  created_at timestamptz not null default now()
);
create index if not exists job_scans_user_created_idx on public.job_scans (user_id, created_at desc);
create index if not exists job_scans_created_at_idx on public.job_scans (created_at desc);

create table if not exists public.applications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  company text not null,
  role text not null,
  match_score double precision not null default 0 check (match_score >= 0 and match_score <= 100),
  status public.application_status not null default 'APPLIED',
  applied_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists applications_user_applied_idx on public.applications (user_id, applied_date desc);
create index if not exists applications_status_idx on public.applications (status);

create table if not exists public.llm_configs (
  id text primary key,
  name text not null,
  provider text not null check (provider in ('groq', 'gemini', 'openai', 'anthropic', 'custom')),
  model_id text not null,
  api_key_env text,
  context_window text not null,
  latency_tier text not null check (latency_tier in ('sub-second', 'standard', 'deep-reasoning')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.task_bindings (
  task text primary key check (task in ('score', 'tailor', 'cover_letter', 'star_bullet', 'resume_parse')),
  task_label text not null,
  primary_model_id text not null,
  fallback_model_id text not null
);

create table if not exists public.system_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  prompt_injection_shield boolean not null default true,
  max_upload_size_mb integer not null default 5 check (max_upload_size_mb between 1 and 20),
  free_tier_monthly_limit integer not null default 3 check (free_tier_monthly_limit >= 0),
  pro_price_inr integer not null default 249 check (pro_price_inr >= 0),
  rate_limit_window_days integer not null default 30 check (rate_limit_window_days > 0),
  maintenance_mode boolean not null default false,
  allowed_file_extensions jsonb not null default '[".pdf", ".docx"]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.security_logs (
  id text primary key,
  timestamp timestamptz not null default now(),
  event text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  details text not null,
  ip inet,
  actor_email text,
  target_user_id text references public.users(id) on delete set null
);
create index if not exists security_logs_timestamp_idx on public.security_logs (timestamp desc);
create index if not exists security_logs_event_idx on public.security_logs (event, timestamp desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();
drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at before update on public.system_settings
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.resumes enable row level security;
alter table public.job_scans enable row level security;
alter table public.applications enable row level security;
alter table public.llm_configs enable row level security;
alter table public.task_bindings enable row level security;
alter table public.system_settings enable row level security;
alter table public.security_logs enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes-private', 'resumes-private', false, 6291456, array['application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = 6291456,
  allowed_mime_types = array['application/octet-stream'];

commit;

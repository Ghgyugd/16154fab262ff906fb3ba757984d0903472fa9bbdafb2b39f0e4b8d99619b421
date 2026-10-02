# Supabase Setup

## Configure

Set these server-side values in `.env` (the existing `SUPABASE_STORAGE_URL` is accepted as a URL alias):

```dotenv
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SECRET_KEY"
SUPABASE_STORAGE_BUCKET="resumes-private"
```

Use the Supabase **Secret key** (`sb_secret_...`) from Project Settings -> API Keys. Do not use the publishable key (`sb_publishable_...`) in this setting. This server credential can administer Storage and bypasses Row Level Security; keep it only on the Express server and never prefix it with `VITE_`.

## Apply Schema And Storage Bucket

The project schema is provisioned by [`migrations/202610020001_initial_schema.sql`](migrations/202610020001_initial_schema.sql), with runtime quota and analytics RPCs in [`migrations/202610020002_runtime_functions.sql`](migrations/202610020002_runtime_functions.sql). Both have been applied to the configured project. They create the application tables, enums, indexes, ownership foreign keys, update triggers, RLS, private resume bucket, and atomic database operations.

Uploads are AES-256-GCM encrypted by the server before being sent to Supabase Storage. The bucket contains ciphertext only. Keep the same `STORAGE_ENCRYPTION_KEY` across deployments; changing it makes previously uploaded documents unreadable.

## Import Existing JSON Data

1. Back up `data/db.json` and your `uploads/` directory.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`/deployment secrets.
3. Run `npm run migrate:supabase` to upsert users, resumes, scans, applications, model config, task bindings, settings, and security logs. A different input file can be supplied with `npm run migrate:supabase -- path/to/db.json`.

The import is repeatable by primary key and does not delete or modify the JSON source. It checks foreign-key owner references before writing and stops with examples if the source contains orphaned records. Resume object bytes are not copied by this command; existing `local_encrypted` resumes remain marked as local and require their original `uploads/` files. New uploads use Supabase Storage.

Before a deployment, run `npm run build` followed by `npm run check:deploy`. The preflight validates production secrets, the Clerk origin, the private bucket, all expected tables, and the quota/analytics RPCs. In production, use Clerk live keys and set `NODE_ENV=production`.

## Runtime Database

Express routes, the rate limiter, and the background tailoring queue now use the server-only Supabase Postgres adapter in `lib/supabase-db.ts`. The imported JSON file remains a local backup/migration source and is not used for runtime CRUD. Resume content is encrypted server-side and stored in the private Supabase bucket; keep `STORAGE_ENCRYPTION_KEY` stable across deployments. Never expose `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` to browser code.
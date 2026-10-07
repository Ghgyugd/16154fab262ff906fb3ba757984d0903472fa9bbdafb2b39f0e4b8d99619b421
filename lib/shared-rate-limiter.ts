import crypto from 'node:crypto';
import { supabaseDb as db } from './supabase-db.js';
import { checkIpBurstLimit } from './burst-limiter.js';

const MAX_BURST_PER_MINUTE = 30;
let warnedAboutLocalFallback = false;

/** Shared, serverless-safe IP throttling backed by one atomic Postgres RPC. */
export async function checkSharedIpBurstLimit(ipAddress: string) {
  const sessionSecret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'resumesetu_dev_session_secret_change_me');
  if (sessionSecret.length < 16) throw new Error('SESSION_SECRET is required for shared IP rate limiting.');

  // Keep raw IP addresses out of the database. The HMAC also prevents a table
  // reader from cheaply reversing common IPv4 addresses by brute force.
  const keyHash = crypto.createHmac('sha256', sessionSecret).update(ipAddress).digest('hex');
  let result: { allowed: boolean; retryAfterSeconds: number };
  try {
    result = await db.consumeIpBurstLimit(keyHash, MAX_BURST_PER_MINUTE, 60);
  } catch (error) {
    // Keep local development usable while a new Supabase migration is pending.
    // Production remains fail-closed: the deployment must use the atomic,
    // shared database limiter rather than a per-process in-memory counter.
    if (process.env.NODE_ENV === 'production' || !(error instanceof Error) || !/PGRST202/.test(error.message)) {
      throw error;
    }
    if (!warnedAboutLocalFallback) {
      console.warn(
        '[Rate limit] Supabase consume_ip_burst_limit is missing; using a local in-memory limiter. Apply supabase/migrations/202610070001_shared_ip_rate_limits.sql.'
      );
      warnedAboutLocalFallback = true;
    }
    return checkIpBurstLimit(ipAddress);
  }
  return result.allowed
    ? { allowed: true as const }
    : {
        allowed: false as const,
        retryAfterSeconds: result.retryAfterSeconds,
        reason: `Too many requests. Please retry in ${result.retryAfterSeconds} second${result.retryAfterSeconds === 1 ? '' : 's'}.`,
      };
}

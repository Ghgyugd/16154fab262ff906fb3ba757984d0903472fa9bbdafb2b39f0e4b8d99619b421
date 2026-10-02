import { supabaseDb as db } from './supabase-db.js';

export interface TierRateLimitResult {
  allowed: boolean;
  remainingScans: number;
  daysUntilReset: number;
  isPro: boolean;
  reason?: string;
  /**
   * True only when the user has genuinely exhausted their free-tier quota and
   * needs to upgrade. Throttling must never set this: the frontend opens the
   * Pro paywall whenever it sees 402 / paywall_required, so conflating the two
   * sold upgrades to users who merely polled too quickly.
   */
  paywallRequired?: boolean;
  /** Seconds to wait before retrying, when the block is transient. */
  retryAfterSeconds?: number;
}

const BURST_MAP = new Map<string, { count: number; resetAt: number }>();
const ONE_MINUTE_MS = 60 * 1000;
const MAX_BURST_PER_MINUTE = 30;
const BURST_SWEEP_THRESHOLD = 5000;
const DEFAULT_FREE_LIMIT = 3;
const DEFAULT_WINDOW_DAYS = 30;

function coerceCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Per-IP burst throttle for expensive endpoints only.
 *
 * This is deliberately NOT applied to read-only polling routes (session
 * introspection, history, analytics pings): those previously burned the same
 * budget as a resume scan, so a client that polled session state a few dozen
 * times got a hard 402 on its next legitimate scan.
 */
export function checkIpBurstLimit(ipAddress: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
} {
  const now = Date.now();

  // Opportunistic sweep so the map cannot grow without bound.
  if (BURST_MAP.size > BURST_SWEEP_THRESHOLD) {
    for (const [key, entry] of BURST_MAP) {
      if (now > entry.resetAt) BURST_MAP.delete(key);
    }
  }

  const burstKey = `burst_${ipAddress}`;
  const burst = BURST_MAP.get(burstKey);

  if (!burst || now > burst.resetAt) {
    BURST_MAP.set(burstKey, { count: 1, resetAt: now + ONE_MINUTE_MS });
    return { allowed: true };
  }

  burst.count += 1;
  if (burst.count > MAX_BURST_PER_MINUTE) {
    const retryAfterSeconds = Math.max(1, Math.ceil((burst.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      reason: `Too many requests. Please retry in ${retryAfterSeconds} second${
        retryAfterSeconds === 1 ? '' : 's'
      }.`,
    };
  }

  return { allowed: true };
}

/**
 * Tier quota enforcement. Enforces the free-tier monthly scan allowance;
 * Pro plans are unlimited.
 *
 * @param options.enforceBurst Also apply the per-IP throttle. Enable on costly
 *   endpoints (scan/tailor), not on cheap reads.
 */
export function checkTierRateLimit(
  userId: string,
  ipAddress: string,
  options: { enforceBurst?: boolean } = {}
): Promise<TierRateLimitResult> {
  return checkTierRateLimitAsync(userId, ipAddress, options);
}

async function checkTierRateLimitAsync(
  userId: string,
  ipAddress: string,
  options: { enforceBurst?: boolean }
): Promise<TierRateLimitResult> {
  const { enforceBurst = false } = options;

  // 1. IP burst protection (expensive endpoints only, and never for Pro).
  if (enforceBurst) {
    const throttle = checkIpBurstLimit(ipAddress);
    if (!throttle.allowed) {
      return {
        allowed: false,
        remainingScans: 0,
        daysUntilReset: 0,
        isPro: false,
        paywallRequired: false,
        retryAfterSeconds: throttle.retryAfterSeconds,
        reason: throttle.reason,
      };
    }
  }

  // 2. User / Guest tier quota from the database.
  const [user, settings] = await Promise.all([db.getUser(userId), db.getSystemSettings()]);
  const freeLimit =
    coerceCount(settings?.freeTierMonthlyLimit) > 0
      ? coerceCount(settings?.freeTierMonthlyLimit)
      : DEFAULT_FREE_LIMIT;
  const windowDays =
    coerceCount(settings?.rateLimitWindowDays) > 0
      ? coerceCount(settings?.rateLimitWindowDays)
      : DEFAULT_WINDOW_DAYS;

  if (user?.currentPlan === 'PRO') {
    return {
      allowed: true,
      remainingScans: 9999,
      daysUntilReset: windowDays,
      isPro: true,
    };
  }

  const scansUsed = coerceCount(user?.monthlyScansUsed);
  const parsedReset = user?.creditResetDate ? new Date(user.creditResetDate) : null;
  const resetDate =
    parsedReset && !Number.isNaN(parsedReset.getTime())
      ? parsedReset
      : new Date(Date.now() + windowDays * 86400000);
  const diffMs = Math.max(0, resetDate.getTime() - Date.now());
  const daysUntilReset = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (user && scansUsed >= freeLimit) {
    return {
      allowed: false,
      remainingScans: 0,
      daysUntilReset,
      isPro: false,
      paywallRequired: true,
      reason: `Free tier quota of ${freeLimit} scans per month reached. Resets in ${daysUntilReset} day${
        daysUntilReset === 1 ? '' : 's'
      }. Upgrade to Pro for unlimited scans.`,
    };
  }

  return {
    allowed: true,
    remainingScans: Math.max(0, freeLimit - scansUsed),
    daysUntilReset,
    isPro: false,
  };
}
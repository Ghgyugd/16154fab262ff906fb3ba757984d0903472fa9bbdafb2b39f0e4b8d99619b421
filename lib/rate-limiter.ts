import { supabaseDb as db } from './supabase-db.js';
import { checkSharedIpBurstLimit } from './shared-rate-limiter.js';

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

const DEFAULT_FREE_LIMIT = 3;
const DEFAULT_WINDOW_DAYS = 30;

function coerceCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// The IP throttle itself lives in a database-free module so it stays unit
// testable; it is re-exported here for existing call sites.
export { checkIpBurstLimit, resetIpBurstLimits } from './burst-limiter.js';

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
    const throttle = await checkSharedIpBurstLimit(ipAddress);
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

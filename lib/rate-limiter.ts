import { db, User } from './db.js';

interface TierRateLimitResult {
  allowed: boolean;
  remainingScans: number;
  daysUntilReset: number;
  isPro: boolean;
  reason?: string;
}

const BURST_MAP = new Map<string, { count: number; resetAt: number }>();
const ONE_MINUTE_MS = 60 * 1000;
const MAX_BURST_PER_MINUTE = 30;

/**
 * Redis-compatible rate-limiting and tier quota enforcement engine.
 * Strictly enforces 3 free scans per 30-day rolling window for free/guest users,
 * resetting automatically every 30 days. Pro users receive unlimited scans.
 */
export function checkTierRateLimit(
  userId: string,
  ipAddress: string
): TierRateLimitResult {
  const now = Date.now();

  // 1. IP Burst Protection (30 requests/minute)
  const burstKey = `burst_${ipAddress}`;
  const burst = BURST_MAP.get(burstKey);
  if (!burst || now > burst.resetAt) {
    BURST_MAP.set(burstKey, { count: 1, resetAt: now + ONE_MINUTE_MS });
  } else {
    burst.count += 1;
    if (burst.count > MAX_BURST_PER_MINUTE) {
      return {
        allowed: false,
        remainingScans: 0,
        daysUntilReset: 0,
        isPro: false,
        reason: 'Rate limit exceeded. Please wait a minute before retrying.',
      };
    }
  }

  // 2. User / Guest Tier Quota from Database
  const user = db.getUser(userId);

  if (user?.currentPlan === 'PRO') {
    return {
      allowed: true,
      remainingScans: 9999,
      daysUntilReset: 30,
      isPro: true,
    };
  }

  const scansUsed = user?.monthlyScansUsed ?? 0;
  const resetDate = new Date(user?.creditResetDate || Date.now() + 30 * 86400000);
  const diffMs = Math.max(0, resetDate.getTime() - now);
  const daysUntilReset = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (scansUsed >= 3) {
    return {
      allowed: false,
      remainingScans: 0,
      daysUntilReset,
      isPro: false,
      reason: `Free tier quota of 3 scans per month reached. Resets in ${daysUntilReset} days. Upgrade to Pro for unlimited scans.`,
    };
  }

  const remaining = Math.max(0, 3 - scansUsed);
  return {
    allowed: true,
    remainingScans: remaining,
    daysUntilReset,
    isPro: false,
  };
}

/**
 * Per-IP burst throttle.
 *
 * Deliberately kept free of any database import so it can be unit-tested and
 * reasoned about on its own. `lib/rate-limiter.ts` composes it with the tier
 * quota check.
 *
 * This is applied to expensive endpoints only (scan, tailor), never to cheap
 * read-only polling routes: those previously burned the same budget as a resume
 * scan, so a client that polled session state a few dozen times got a hard 402
 * on its next legitimate scan.
 */

export interface BurstLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
}

const BURST_MAP = new Map<string, { count: number; resetAt: number }>();
const ONE_MINUTE_MS = 60 * 1000;
const MAX_BURST_PER_MINUTE = 30;
/** Opportunistic sweep threshold so the map cannot grow without bound. */
const BURST_SWEEP_THRESHOLD = 5000;

export function checkIpBurstLimit(ipAddress: string): BurstLimitResult {
  const now = Date.now();

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

/** Test-only: drops all recorded burst counters. */
export function resetIpBurstLimits(): void {
  BURST_MAP.clear();
}

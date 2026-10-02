/**
 * Shared client-side configuration.
 *
 * These values were previously hardcoded across a dozen files, which meant the
 * owner address, the free allowance and the price had to be changed in many
 * places at once and regularly drifted apart.
 */

export const OWNER_EMAIL = 'anjana2771patel@gmail.com';

/** Free-tier scans per rolling 30-day window. */
export const FREE_SCAN_LIMIT = 3;

/** Sentinel the API uses for "effectively unlimited" on Pro plans. */
export const PRO_UNLIMITED_CREDITS = 9999;

/** Pro subscription price in INR, per 30 days. */
export const PRO_PRICE_INR = 249;

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email || '').toLowerCase().trim() === OWNER_EMAIL;
}

/** True when the identity carries administrative privileges. */
export function hasAdminPrivileges(user: {
  isAdmin?: boolean;
  role?: string;
  email?: string;
} | null): boolean {
  if (!user) return false;
  return user.isAdmin === true || user.role === 'OWNER' || user.role === 'ADMIN' || isOwnerEmail(user.email);
}

/** Remaining free scans for a user, or the Pro sentinel. */
export function remainingScansFor(plan: string | undefined, used: number | undefined): number {
  if (plan === 'pro') return PRO_UNLIMITED_CREDITS;
  return Math.max(0, FREE_SCAN_LIMIT - (used || 0));
}
import crypto from 'crypto';

/**
 * Signed, tamper-evident session tokens.
 *
 * The admin API previously authorized requests by trusting a client-supplied
 * `x-user-email` header, which meant anyone could become the system owner by
 * sending one curl header. Authorization is now derived from an HMAC-signed
 * cookie, so session identity cannot be asserted from request headers.
 */

export interface SessionPayload {
  /** Active user id (guest_* or a provisioned account id). */
  uid: string;
  /** True when the session belongs to an anonymous guest. */
  guest: boolean;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = 'resumesetu_session';

function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET must be set to a value of at least 16 characters in production.'
    );
  }
  // Deterministic dev fallback so sessions survive a dev-server restart.
  return 'resumesetu_dev_session_secret_change_me';
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(data).digest('base64url');
}

export function issueSession(uid: string, guest: boolean, now = Date.now()): string {
  const payload: SessionPayload = {
    uid,
    guest,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Returns the payload for a valid, unexpired, correctly-signed token. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  // Constant-time compare to avoid leaking the signature byte-by-byte.
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.uid !== 'string' || !payload.uid) return null;
  if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;

  return payload;
}

/** True when the id looks like an anonymous guest session id. */
export function isGuestId(uid: string): boolean {
  return /^guest_[A-Za-z0-9_-]+$/.test(uid);
}
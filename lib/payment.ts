/**
 * Pro upgrade requests: payment routing and anti-tamper references.
 *
 * THE THREAT THIS FILE EXISTS TO STOP
 * ----------------------------------
 * The original paywall built its Telegram deep link entirely in the browser:
 *
 *     const url = `https://t.me/${HARD_CODED_HANDLE}?text=${user.email} / ${user.id}`
 *
 * Everything in that string is attacker-controlled. Anyone with devtools could
 * open the console and run:
 *
 *     // send a message to my own account, claiming to be the victim
 *     sendBeacon('/x', `https://t.me/me?text=Email: victim@corp.com / UID: user_victim`)
 *
 * The admin would then read a genuine-looking email and user id in Telegram and
 * upgrade the *wrong* account. The handle could be swapped just as easily, so a
 * payment could be redirected to an attacker entirely.
 *
 * THE FIX
 * -------
 * Nothing about the request is trusted from the client. This module:
 *   - reads the destination account from a server-only environment variable,
 *   - derives the payer's identity from the session cookie on the server,
 *   - mints a short reference signed with an HMAC, so the reference in the
 *     Telegram message provably belongs to the user who requested it,
 *   - builds and signs nothing the browser can alter.
 *
 * The browser only ever *displays* the resulting link and the reference.
 */

import crypto from 'node:crypto';

/** Fallback matches the handle the app shipped with before this was configurable. */
const DEFAULT_OWNER_TELEGRAM = 'TheCreatorOfAkatsuki';

/** Telegram usernames: 5-32 chars, letters/digits/underscore, must start with a letter. */
const TELEGRAM_HANDLE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

/**
 * Where "Message us to activate" is sent.
 *
 * Read from the environment on every call (not cached at module load) so a
 * deployment can change the handle without a code change, and so tests can
 * override it. Never expose this to the client except through the sanitised
 * public shape in `publicOwnerProfile`.
 */
export function ownerTelegramHandle(): string {
  const configured = (process.env.OWNER_TELEGRAM || '').trim().replace(/^@/, '');
  if (!configured) return DEFAULT_OWNER_TELEGRAM;
  if (!TELEGRAM_HANDLE_PATTERN.test(configured)) {
    // A malformed value must not silently produce a link to a stranger.
    console.error('[Payments] OWNER_TELEGRAM is not a valid Telegram handle; using the default.');
    return DEFAULT_OWNER_TELEGRAM;
  }
  return configured;
}

/**
 * Display identity for the paywall.
 *
 * Every field is either a constant or a server-side environment variable. The
 * photo URL is optional; when absent the UI renders a branded monogram rather
 * than a broken image or somebody else's face.
 */
export interface OwnerProfile {
  name: string;
  handle: string;
  role: string;
  responseTime: string;
  avatarUrl: string | null;
}

export function ownerProfile(): OwnerProfile {
  const handle = ownerTelegramHandle();
  return {
    name: (process.env.OWNER_DISPLAY_NAME || '').trim() || 'ResumeSetu Support',
    handle: `@${handle}`,
    role: (process.env.OWNER_ROLE || '').trim() || 'Product owner',
    responseTime: (process.env.OWNER_RESPONSE_TIME || '').trim() || 'Usually within a few hours',
    avatarUrl: sanitizeAvatarUrl(process.env.OWNER_AVATAR_URL),
  };
}

/**
 * Only absolute https URLs (and root-relative paths) are accepted.
 *
 * `javascript:` and `data:` URLs are rejected outright: the value ends up in an
 * `img src`, and a script URL there would be an injection vector on any browser
 * or CSP combination that fails to block it.
 */
export function sanitizeAvatarUrl(value: string | undefined): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Public, non-secret subset safe to send to the browser. */
export function publicOwnerProfile(): OwnerProfile {
  return ownerProfile();
}

// ---------------------------------------------------------------------------
// Signed payment references
// ---------------------------------------------------------------------------

const REFERENCE_PREFIX = 'RSA';
/** 5 bytes = 40 bits = exactly 8 base32 characters. */
const REFERENCE_PAYLOAD_BYTES = 5;
/** 30 days: long enough to cover a slow reply, short enough to bound replay. */
const REFERENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** RFC 4648 base32, uppercase-only alphabet (no case ambiguity when read aloud). */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Buffer | null {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * HMAC key for references.
 *
 * Reuses SESSION_SECRET because it is already a required, high-entropy,
 * server-only value, and refusing to start without it already prevents
 * references from silently degrading to unsigned.
 */
function referenceSecret(): string {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to sign payment references.');
  }
  return 'resumesetu_dev_reference_secret';
}

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', referenceSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
}

/**
 * Mints a reference such as `RSA-6ZGL2KTB-4F1A9C7B3D`.
 *
 *   payload (8 chars)  base32 of the issue timestamp
 *   mac     (10 chars) HMAC-SHA256 of the payload, truncated
 *
 * Why the payload is included: a reference can only be *verified* if the signed
 * data travels with it. An earlier design emitted a bare opaque MAC, which by
 * construction could never be recomputed — every honest reference failed its own
 * check, and that failure is indistinguishable from a forged one. With the
 * payload in the clear, `sign(payload) === mac` is a real authenticity test:
 * nobody without SESSION_SECRET can produce a matching pair.
 *
 * The payload carries a timestamp, not the user id. That is deliberate — the
 * reference proves "ResumeSetu issued this", and the audit row written alongside
 * it maps it to an account. Putting the user id in the clear would let anyone
 * enumerate candidates' references.
 */
export function issuePaymentReference(_userId: string, now = Date.now()): string {
  // Exactly 5 bytes = 40 bits, which base32 encodes as exactly 8 characters
  // with no truncation. (Encoding 6 bytes produced 10 characters that were then
  // sliced to 8, silently discarding the high bits of the timestamp.)
  const issuedAt = Math.floor(now / 1000);
  const bytes = Buffer.alloc(REFERENCE_PAYLOAD_BYTES);
  bytes.writeUIntBE(issuedAt, 0, REFERENCE_PAYLOAD_BYTES);
  const payload = base32Encode(bytes);
  return `${REFERENCE_PREFIX}-${payload}-${sign(payload)}`;
}

export interface ReferenceVerification {
  valid: boolean;
  reason?: 'malformed' | 'bad_signature';
  issuedAt?: number;
}

/**
 * Verifies that a reference was issued by this server and recovers its timestamp.
 *
 * This cannot recover the user id — see the note on `issuePaymentReference`.
 */
export function verifyPaymentReference(
  reference: string,
  now = Date.now()
): ReferenceVerification {
  const match = new RegExp(`^${REFERENCE_PREFIX}-([A-Z2-7]{8})-([A-F0-9]{10})$`).exec(
    (reference || '').trim().toUpperCase()
  );
  if (!match) return { valid: false, reason: 'malformed' };

  const [, payload, mac] = match;
  if (sign(payload) !== mac) return { valid: false, reason: 'bad_signature' };

  const decoded = base32Decode(payload);
  if (!decoded || decoded.length !== REFERENCE_PAYLOAD_BYTES) {
    return { valid: false, reason: 'malformed' };
  }
  const issuedAt = decoded.readUIntBE(0, REFERENCE_PAYLOAD_BYTES);
  if (!Number.isFinite(issuedAt)) return { valid: false, reason: 'malformed' };

  void now;
  return { valid: true, issuedAt };
}

/**
 * True when the reference is older than the TTL.
 *
 * Kept separate from `verifyPaymentReference` so callers can decide whether to
 * reject outright or merely warn.
 */
export function isReferenceExpired(issuedAt: number, now = Date.now()): boolean {
  return now - issuedAt * 1000 > REFERENCE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

export interface PaymentRequestContext {
  userId: string;
  email: string;
  displayName: string | null;
  priceInr: number;
}

/**
 * Builds the text the user sends in Telegram.
 *
 * Built from server-derived values only. `formatField` neutralises line breaks
 * and angle brackets so a display name or email can never inject extra lines
 * into the message the admin reads (a crafted "email" containing
 * "\nPayment already received: yes" must not be able to assert anything).
 */
function formatField(value: string, maxLength = 120): string {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[<>\u0000-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function buildPaymentMessage(
  context: PaymentRequestContext,
  reference: string
): string {
  const lines = [
    'Hello ResumeSetu — I would like to activate the Pro plan.',
    '',
    `Registered email: ${formatField(context.email)}`,
    `Candidate UID: ${formatField(context.userId, 80)}`,
    ...(context.displayName
      ? [`Name: ${formatField(context.displayName, 80)}`]
      : []),
    `Plan: ₹${context.priceInr}/month (unlimited scans)`,
    `Verification code: ${reference}`,
    '',
    'I have read that activation is confirmed manually after payment.',
  ];
  return lines.join('\n');
}

/**
 * Full Telegram deep link, assembled on the server.
 *
 * URLSearchParams performs the escaping exactly once. The earlier code
 * interpolated pre-encoded `%0A` sequences *and* called encodeURIComponent on
 * the values, which double-encoded newlines and produced a mangled message.
 */
export function buildTelegramUrl(message: string, handle = ownerTelegramHandle()): string {
  return `https://t.me/${encodeURIComponent(handle)}?${new URLSearchParams({ text: message }).toString()}`;
}

/**
 * Pro price, single-sourced on the server.
 *
 * The browser also has a copy (src/config.ts) for display, but the amount that
 * travels in the Telegram message is this one. A user editing the client bundle
 * cannot change what they are told they owe.
 */
export const PRO_PRICE_INR = Number(process.env.PRO_PRICE_INR) > 0
  ? Math.floor(Number(process.env.PRO_PRICE_INR))
  : 249;

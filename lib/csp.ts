/**
 * Content-Security-Policy construction.
 *
 * Extracted from server.ts so the policy can be unit tested. A CSP that is
 * slightly wrong in one direction is a security hole; in the other direction it
 * silently breaks the product. Both failures are invisible until a real browser
 * hits them, so the rules live here where they can be asserted.
 */

/**
 * Extracts the Clerk Frontend API origin from a publishable key.
 *
 * Format: `pk_(test|live)_<base64url of "host$">`.
 *
 * Why this matters: Clerk serves `clerk-js` from the *instance's own* Frontend
 * API host, not from clerk.com. A policy listing only `https://clerk.com` blocks
 * the Clerk bundle outright — every sign-in fails in production while local
 * tests pass, because the local dev server never applies the header.
 *
 * The decoded value is interpolated into a response header, so it is validated
 * against Clerk's own domain shape rather than trusted. A malformed key yields
 * null and the origin is simply omitted from the policy.
 */
export function clerkFrontendOrigin(publishableKey?: string | null): string | null {
  const key = (publishableKey || '').trim();
  const match = /^pk_(?:test|live)_([A-Za-z0-9_-]+)$/.exec(key);
  if (!match) return null;

  try {
    const body = match[1];
    const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
    const host = Buffer.from(padded, 'base64url').toString('utf8').replace(/\$$/, '').trim();
    if (!/^[a-z0-9][a-z0-9-]*\.clerk\.accounts\.dev$/i.test(host)) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

/** OAuth providers that may render inside a popup during the Clerk flow. */
const OAUTH_FRAME_SOURCES = ['https://accounts.google.com', 'https://*.google.com'];

export interface CspOptions {
  /** `true` in development: relaxes `script-src` for Vite HMR. */
  isDev: boolean;
  /** `VITE_CLERK_PUBLISHABLE_KEY`, used to derive the Clerk origin. */
  clerkPublishableKey?: string | null;
  /** Extra connect-src entries (e.g. a configured AI gateway). */
  extraConnectSources?: string[];
}

/**
 * Builds the full policy.
 *
 * `'unsafe-inline'` is required for styles because Clerk injects its own <style>
 * elements and Tailwind v4 emits a runtime stylesheet. Scripts stay locked down:
 * there is no inline <script> anywhere in this app and no handler attributes.
 */
export function buildContentSecurityPolicy(options: CspOptions): string {
  const { isDev, clerkPublishableKey } = options;
  const clerkOrigin = clerkFrontendOrigin(clerkPublishableKey);

  const clerkSources = ['https://clerk.com', clerkOrigin].filter(Boolean).join(' ');
  const oauthSources = OAUTH_FRAME_SOURCES.join(' ');
  const extraConnect = (options.extraConnectSources ?? []).filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    // fonts.googleapis.com is required in BOTH environments.
    //
    // index.html unconditionally loads IBM Plex Sans / Space Grotesk / Caveat /
    // JetBrains Mono from Google Fonts, so gating this host on `isDev` blocked
    // every font stylesheet in production and silently fell back to system
    // fonts — the policy was tighter than the document it governed. Only the
    // dev-only 'unsafe-eval' for Vite HMR is environment dependent.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self'${isDev ? " 'unsafe-eval'" : ''} ${clerkSources}`,
    // No inline event handlers anywhere in the app.
    "script-src-attr 'none'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${clerkSources} ${oauthSources}${extraConnect ? ` ${extraConnect}` : ''}`,
    `frame-src 'self' ${oauthSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? '' : 'upgrade-insecure-requests',
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * Non-CSP response headers applied to every request.
 *
 * Kept next to the policy so the two are reviewed together.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'off',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
};

export const HSTS_HEADER = 'max-age=31536000; includeSubDomains';

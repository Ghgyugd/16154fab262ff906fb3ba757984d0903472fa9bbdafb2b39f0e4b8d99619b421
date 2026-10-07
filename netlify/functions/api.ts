import { createRequire } from 'module';
import serverless from 'serverless-http';

/**
 * Netlify entry point for the whole ResumeSetu API.
 *
 * Netlify only publishes `dist`, so every `fetch('/api/...')` made by the SPA
 * used to fall through to the static 404 page. `res.json()` then failed, the
 * client fell back to an empty object, and AuthContext surfaced
 * "Could not sync your account. Please try again." even though Clerk had
 * already signed the user in.
 *
 * netlify.toml rewrites `/api/*` onto this function, which mounts the exact
 * same Express app the local `tsx server.ts` dev server runs.
 */

interface NetlifyEvent {
  path?: string;
  rawPath?: string;
  rawUrl?: string;
  httpMethod?: string;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  queryStringParameters?: Record<string, string | undefined>;
  multiValueQueryStringParameters?: Record<string, string[]>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: Record<string, unknown>;
}

interface NetlifyContext {
  ip?: string;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string | number | boolean>;
  multiValueHeaders?: Record<string, string[]>;
  body?: string;
  isBase64Encoded?: boolean;
}

type ExpressAdapter = (event: NetlifyEvent, context?: unknown) => Promise<NetlifyResponse>;

const FUNCTION_PREFIX = '/.netlify/functions/api';

/**
 * Express routes are mounted on `/api/...`. Depending on how the request
 * reached us, `event.path` is either the original browser path or the
 * rewritten function path — normalise both onto `/api/...`.
 */
function toApiPath(event: NetlifyEvent): string {
  let pathname = event.rawPath || event.path || '';

  if (!pathname && typeof event.rawUrl === 'string') {
    try {
      pathname = new URL(event.rawUrl).pathname;
    } catch {
      pathname = '';
    }
  }

  pathname = pathname || '/';
  if (pathname === FUNCTION_PREFIX) return '/api';
  if (pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
    return `/api${pathname.slice(FUNCTION_PREFIX.length)}`;
  }
  return pathname;
}

/**
 * Pin the event to the API-Gateway v1 shape serverless-http expects: it
 * otherwise branches on `version === '2.0'` and reads `rawPath`/`rawQueryString`,
 * which Netlify does not provide.
 */
function normalizeEvent(event: NetlifyEvent, clientIp?: string): NetlifyEvent {
  const normalized: NetlifyEvent = {
    ...event,
    path: toApiPath(event),
    headers: { ...(event.headers || {}), ...(clientIp ? { 'x-resumesetu-client-ip': clientIp } : {}) },
  };
  normalized.httpMethod = event.httpMethod || 'GET';
  delete (normalized as { version?: unknown }).version;
  delete (normalized as { rawPath?: unknown }).rawPath;
  return normalized;
}

let adapterPromise: Promise<ExpressAdapter> | null = null;

/**
 * Bundled CommonJS dependencies reach for `require('node:builtin')` through
 * esbuild's `__require` helper, which throws "Dynamic require ... is not
 * supported" when the output format is ES module. Netlify compiles this
 * function with esbuild and may emit either format, so install a fallback
 * require before any of server.ts's dependencies are evaluated. Node builtins
 * resolve from any base file, so the project root is a safe anchor.
 */
function installRequireFallback(): void {
  const scope = globalThis as typeof globalThis & { require?: unknown };
  if (typeof scope.require === 'function') return;
  scope.require = createRequire(`${process.cwd()}/package.json`);
}

function getAdapter(): Promise<ExpressAdapter> {
  if (!adapterPromise) {
    adapterPromise = (async () => {
      installRequireFallback();
      // server.ts starts listening on import; flag the serverless runtime first
      // so it only exposes the Express app (no port bind, no Vite middleware).
      (globalThis as { __RESUMESETU_SERVERLESS__?: boolean }).__RESUMESETU_SERVERLESS__ =
        true;
      const { app } = await import('../../server.js');
      return serverless(app as never) as unknown as ExpressAdapter;
    })();
  }
  return adapterPromise;
}

export const handler = async (event: NetlifyEvent, context?: NetlifyContext): Promise<NetlifyResponse> => {
  const adapter = await getAdapter();
  return adapter(normalizeEvent(event ?? {}, context?.ip));
};

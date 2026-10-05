/**
 * Tests the Netlify Function that serves the whole ResumeSetu API.
 *
 * The original production bug was that `/api/*` never reached Express, so this
 * suite asserts the exact contract the browser depends on: JSON responses, on
 * both the original `/api/...` path and the rewritten `/.netlify/functions/api/...`
 * path, in BOTH module formats Netlify may emit (ESM and CJS).
 *
 * Run with: npm test
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectRoot, 'node_modules', '.cache', 'resumesetu-fn-test');
const EXTERNALS = ['express', 'vite', 'serverless-http'];

// ---------------------------------------------------------------------------
// assertion helpers
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function isJson(res) {
  const type = String(res.headers?.['content-type'] || '');
  return type.includes('application/json');
}

function json(res) {
  try {
    return JSON.parse(res.body ?? '');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// assertions against one built bundle
// ---------------------------------------------------------------------------
async function runAssertions(bundlePath) {
  const format = bundlePath.endsWith('.cjs') ? 'cjs' : 'esm';
  const mod =
    format === 'cjs'
      ? require(bundlePath)
      : await import(pathToFileURL(bundlePath).href);
  const { handler } = mod;

  const base = {
    headers: { host: 'resumesetu.netlify.app', 'content-type': 'application/json' },
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: '',
    isBase64Encoded: false,
  };

  const request = (event) =>
    handler({ ...base, ...event }).catch((err) => ({
      statusCode: 0,
      headers: {},
      body: JSON.stringify({ thrown: err.message }),
    }));

  console.log(`\n[${format}] ${path.relative(projectRoot, bundlePath)}`);

  // 1. The serverless bundle must never bind a port.
  const activeServers = (process._getActiveHandles?.() || []).filter(
    (h) => h && h.constructor && h.constructor.name === 'Server'
  );
  check('does not bind a port when imported', activeServers.length === 0, `${activeServers.length} server handle(s)`);

  // 2. Liveness probe on the original browser path.
  const health = await request({ path: '/api/health', httpMethod: 'GET' });
  check('GET /api/health -> 200', health.statusCode === 200, `got ${health.statusCode}`);
  check('GET /api/health returns JSON', isJson(health), String(health.headers?.['content-type']));
  check('GET /api/health payload', json(health)?.service === 'resumesetu-api', health.body);

  // 3. Same route through the rewritten function path (how Netlify rewrites it).
  const rewritten = await request({
    path: '/.netlify/functions/api/health',
    httpMethod: 'GET',
  });
  check('rewritten /.netlify/functions/api/health -> 200', rewritten.statusCode === 200, `got ${rewritten.statusCode}`);
  check('rewritten path maps onto /api', json(rewritten)?.service === 'resumesetu-api', rewritten.body);

  // 4. Query strings survive the adapter.
  const withQuery = await request({
    path: '/api/health',
    httpMethod: 'GET',
    queryStringParameters: { a: '1' },
  });
  check('query string request -> 200', withQuery.statusCode === 200, `got ${withQuery.statusCode}`);

  // 5. Unauthenticated /api/auth/me must be JSON 401 — this is the endpoint the
  //    client hit on every boot, and a non-JSON response here caused the bug.
  const me = await request({ path: '/api/auth/me', httpMethod: 'GET' });
  check('GET /api/auth/me -> 401', me.statusCode === 401, `got ${me.statusCode}`);
  check('GET /api/auth/me is JSON', isJson(me), String(me.headers?.['content-type']));
  check('GET /api/auth/me has an error message', typeof json(me)?.error === 'string', me.body);

  // 6. Corrupt session cookie must not throw.
  const badCookie = await request({
    path: '/api/auth/me',
    httpMethod: 'GET',
    headers: { host: 'x', cookie: 'resumesetu_session=not.a-valid-token' },
  });
  check('garbage session cookie -> 401', badCookie.statusCode === 401, `got ${badCookie.statusCode}`);

  // 7. POST with a JSON body and no Clerk bearer token (AuthContext's login call).
  const loginBody = JSON.stringify({ guestToken: 'guest_abc' });
  const login = await request({
    path: '/api/auth/login',
    httpMethod: 'POST',
    headers: {
      host: 'resumesetu.netlify.app',
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(loginBody)),
      origin: 'https://resumesetu.netlify.app',
    },
    body: loginBody,
  });
  check('POST /api/auth/login -> 401 (no bearer)', login.statusCode === 401, `got ${login.statusCode}`);
  check('POST /api/auth/login is JSON', isJson(login), String(login.headers?.['content-type']));
  check(
    'POST /api/auth/login explains itself',
    json(login)?.error === 'A valid Clerk session is required.',
    login.body
  );

  // 8. Unknown API route stays a JSON 404 and never falls back to index.html.
  const missing = await request({ path: '/api/definitely-not-a-route', httpMethod: 'GET' });
  check('unknown /api route -> 404', missing.statusCode === 404, `got ${missing.statusCode}`);
  check('unknown /api route -> JSON 404', isJson(missing), String(missing.headers?.['content-type']));
  check('unknown /api route is not the SPA shell', !String(missing.body).includes('<div id="root"'), missing.body);

  // 9. A thrown error must surface as JSON (the module-scope error handler),
  //    because AuthContext parses every response as JSON.
  const brokenBody = '{bad:}';
  const broken = await request({
    path: '/api/auth/login',
    httpMethod: 'POST',
    headers: {
      host: 'x',
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(brokenBody)),
    },
    body: brokenBody,
  });
  check('malformed JSON body -> JSON error response', isJson(broken), String(broken.headers?.['content-type']));
  check('malformed JSON body -> 400', broken.statusCode === 400, `got ${broken.statusCode}`);
  check('malformed JSON body -> actionable message', typeof json(broken)?.error === 'string', broken.body);
}

// ---------------------------------------------------------------------------
// build both module formats, then run each in its own process
// ---------------------------------------------------------------------------
async function build(format) {
  const esbuild = require('esbuild');
  const outfile = path.join(outDir, `api.${format === 'cjs' ? 'cjs' : 'mjs'}`);
  fs.mkdirSync(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(projectRoot, 'netlify', 'functions', 'api.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format,
    target: 'node20',
    external: EXTERNALS,
    logLevel: 'silent',
    absWorkingDir: projectRoot,
  });
  return outfile;
}

async function main() {
  if (process.argv[2]) {
    await runAssertions(process.argv[2]);
    console.log(failures.length ? `\nFAILED (${failures.length})` : `\nPASSED (${passed})`);
    process.exit(failures.length ? 1 : 0);
  }

  console.log('Building the Netlify Function bundle (esm + cjs)…');
  const bundles = [await build('esm'), await build('cjs')];

  let totalFailures = 0;
  for (const bundle of bundles) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), bundle], {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    if (result.status !== 0) totalFailures += 1;
  }

  if (totalFailures > 0) {
    console.error(`\n${totalFailures} format(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll function tests passed in both ESM and CJS output formats.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

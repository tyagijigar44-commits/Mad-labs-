import express from 'express';
import serverless from 'serverless-http';
import { getStore, connectLambda } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { apiRouter } from '../../server/routes.ts';
import { db } from '../../server/db.ts';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

const DB_KEY = 'database-v1';
const SECRET_KEY = 'session-secret';
let cachedSecret = '';
let storageMode: 'blobs' | 'memory' = 'blobs';
let storageError = '';

// Must be called AFTER connectLambda(event) has run (see handler at the bottom).
function openStore() {
  return getStore({ name: 'labpulse-ai-database', consistency: 'strong' });
}

// If SESSION_SECRET is not set in Netlify, create one automatically and keep it in Netlify Blobs
// so login tokens stay valid across all function instances.
async function ensureSessionSecret(store: ReturnType<typeof openStore> | null) {
  if (process.env.SESSION_SECRET) return;
  if (cachedSecret) { process.env.SESSION_SECRET = cachedSecret; return; }
  let secret: string | null = null;
  if (store) {
    try {
      secret = await store.get(SECRET_KEY);
      if (!secret) { secret = randomBytes(48).toString('base64url'); await store.set(SECRET_KEY, secret); }
    } catch (e) { console.warn('Could not read/write session secret in Blobs:', e); secret = null; }
  }
  cachedSecret = secret || randomBytes(48).toString('base64url');
  process.env.SESSION_SECRET = cachedSecret;
}

// Health check: no authentication, also reports storage status for debugging.
app.get(['/health', '/api/health', '/.netlify/functions/api/health'], async (_req, res) => {
  try {
    const store = openStore();
    await store.get(DB_KEY);
    res.status(200).json({ ok: true, service: 'LabPulse AI API', storage: 'Netlify Blobs connected' });
  } catch (e: any) {
    res.status(200).json({ ok: true, service: 'LabPulse AI API', storage: 'Netlify Blobs NOT available - running in temporary memory mode', detail: String(e?.message || e) });
  }
});

// Load saved data before each request and save it after any request that changes data.
app.use(async (req, res, next) => {
  let store: ReturnType<typeof openStore> | null = null;
  try {
    store = openStore();
    const saved = await store.get(DB_KEY, { type: 'json' }) as any;
    if (saved) {
      if (!db.loadSnapshot(saved)) throw new Error('Stored database snapshot is invalid.');
    } else {
      await store.setJSON(DB_KEY, db.exportSnapshot());
    }
    storageMode = 'blobs'; storageError = '';
  } catch (error: any) {
    // Do not break login if Blobs is not configured; fall back to temporary in-memory data.
    console.error('Netlify Blobs unavailable, using temporary memory:', error?.message || error);
    storageMode = 'memory'; storageError = String(error?.message || error);
    store = null;
  }

  try { await ensureSessionSecret(store); } catch (e) { console.error('Session secret setup failed:', e); }

  res.setHeader('x-labpulse-storage', storageMode);
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (store && isWrite) {
    const originalEnd = res.end.bind(res) as (...args: any[]) => any;
    let endCalled = false;
    (res as any).end = (...args: any[]) => {
      if (endCalled) return res;
      endCalled = true;
      store!.setJSON(DB_KEY, db.exportSnapshot())
        .catch((error: unknown) => console.error('Could not persist LabPulse data:', error))
        .finally(() => originalEnd(...args));
      return res;
    };
  }
  next();
});

// Netlify may deliver the path as /auth/login, /api/auth/login or /.netlify/functions/api/auth/login.
// Mount the router on all three so every form works.
app.use(['/', '/api', '/.netlify/functions/api'], apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('LabPulse API error:', err?.message || err);
  if (res.headersSent) return res.end();
  res.status(500).json({ error: 'Server error. Please try again.' + (storageError ? ' (storage: ' + storageError + ')' : '') });
});

const inner = serverless(app, { binary: ['application/pdf', 'image/*', 'application/octet-stream'] });

// Netlify Blobs needs connectLambda(event) inside classic (Lambda-style) functions.
export const handler = async (event: any, context: any) => {
  try { connectLambda(event); } catch (e) { console.warn('connectLambda failed:', e); }
  return inner(event, context);
};

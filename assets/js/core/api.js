/**
 * api.js — the bridge between the web app and the MAAC back-end (the `maac-api` project).
 *
 * On every page load we ask `GET /api/health` once:
 *   answers { ok: true }  → mode "api"  → services talk to the real server (HttpOnly cookie session)
 *   anything else         → mode "mock" → the browser-only demo services (works on GitHub Pages / any static host)
 *
 * So the same files run in both worlds. To force the demo mode while the server is up:
 *   localStorage.setItem('maac:mode', 'mock')      (and removeItem to go back)
 *
 * The API is expected on the SAME origin under /api (the maac-api server also serves this web app,
 * so there is no CORS and the session cookie is first-party).
 */

import { bus } from './event-bus.js';

export const API_BASE = '/api';
const FORCE_MODE_KEY = 'maac:mode';
const TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 120000;

/** An error answered by the server: `{ code, message(ar), fields? }` — the same shape the mock services throw. */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function detectMode() {
  try {
    if (localStorage.getItem(FORCE_MODE_KEY) === 'mock') return 'mock';
  } catch {
    /* storage blocked → keep probing */
  }
  // Static hosts have no back-end: skip the probe (it would only add a 404 to the console).
  if (location.protocol === 'file:' || location.hostname.endsWith('.github.io')) return 'mock';
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return 'mock';
    const body = await response.json();
    if (body?.ok !== true) return 'mock';
    // The server says whether it is a development instance (demo accounts allowed) or production.
    serverDemo = body.demo === true;
    return 'api';
  } catch {
    return 'mock';
  }
}

/** True while the server runs in development (demo accounts may be shown). Always true in browser-only demo mode. */
let serverDemo = false;

export const apiMode = await detectMode();
export const useApi = apiMode === 'api';
export const showDemoAccounts = !useApi || serverDemo;

const SESSION_LOST = new Set(['unauthenticated', 'session_expired']);

async function request(method, path, body, { init = {}, timeout = TIMEOUT_MS } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
      ...init,
    });
  } catch {
    throw new ApiError(0, 'network', 'مش قادر أوصل للسيرفر. اتأكد إن الاتصال شغال وحاول تاني.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new ApiError(
      response.status,
      data?.code ?? 'server_error',
      data?.message ?? 'حصلت مشكلة عندنا، جرّب تاني بعد شوية.',
      data?.fields,
    );
    // The cookie is gone / expired (not a wrong password) → the auth service sends the person to the login page.
    if (response.status === 401 && SESSION_LOST.has(error.code)) bus.emit('auth:expired', error);
    throw error;
  }
  return data ?? {};
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  delete: (path) => request('DELETE', path),
  /** Sends a file as the raw request body (the name travels in a header) — see maac-api/src/modules/files. */
  upload: (path, file) => request('POST', path, undefined, {
    timeout: UPLOAD_TIMEOUT_MS,
    init: {
      headers: { Accept: 'application/json', 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    },
  }),
};

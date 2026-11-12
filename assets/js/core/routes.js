/**
 * Single source of truth for page URLs (no hard-coded links elsewhere).
 *
 * The site has three parts:
 *
 *   /login.html … reset.html     shared sign-in / sign-up / recovery pages
 *   /app/*.html                  the USER area   (role "user")
 *   /admin/*.html                the ADMIN area  (role "admin")
 *
 * `routes.home`, `routes.chat`, `routes.upload` … always point inside the area of the
 * page that is open (or of the signed-in role on the shared pages), so the same page
 * scripts / sidebar work for both areas without knowing where they live.
 * Every URL is an absolute path built from this file's own location, so the site
 * also works when it is served from a sub-folder.
 */

import { storage, sessionStore } from './storage.js';

/** Site root = the folder that contains /assets/ */
const ROOT = new URL('../../../', import.meta.url);
const abs = (path) => new URL(path, ROOT).pathname;

const AREAS = {
  user: { dir: 'app/', pages: { home: 'index.html', chat: 'chat.html', upload: 'upload.html', payment: 'payment.html' } },
  admin: { dir: 'admin/', pages: { home: 'index.html', chat: 'chat.html', upload: 'upload.html', subscriptions: 'subscriptions.html' } },
};

const SAFE_NEXT = {
  user: /^app\/(index|chat|upload|payment)\.html(\?[\w%=&.-]*)?$/,
  admin: /^admin\/(index|chat|upload|subscriptions)\.html(\?[\w%=&.-]*)?$/,
};

export const normalizeRole = (role) => (role === 'admin' ? 'admin' : 'user');

/** Role of the signed-in person ("admin" | "user"), or null. (Display only — the real check is server-side.) */
const storedRole = () => {
  const session = storage.get('session') ?? sessionStore.get('session');
  return session?.user ? normalizeRole(session.user.role) : null;
};

/** The area of the open page: `<html data-area>` on app pages, the signed-in role on the shared auth pages. */
export const currentArea = () => {
  const declared = document.documentElement.dataset.area;
  return declared === 'admin' || declared === 'user' ? declared : (storedRole() ?? 'user');
};

const inArea = (name) => {
  const area = AREAS[currentArea()];
  return abs(area.dir + (area.pages[name] ?? area.pages.home));
};

/** Home page of a role. */
export const homeFor = (role) => {
  const area = AREAS[normalizeRole(role)];
  return abs(area.dir + area.pages.home);
};

export const routes = {
  // shared pages
  login: abs('login.html'),
  signup: abs('signup.html'),
  forgot: abs('forgot.html'),
  verify: abs('verify.html'),
  reset: abs('reset.html'),

  // area pages (resolved when read, see above)
  get home() { return inArea('home'); },
  get chat() { return inArea('chat'); },
  get upload() { return inArea('upload'); },
  get payment() { return inArea('payment'); },             // user area only
  get subscriptions() { return inArea('subscriptions'); }, // admin area only
};

export const chatUrl = (id) => `${routes.chat}?id=${encodeURIComponent(id)}`;

export const getParam = (name) => new URLSearchParams(window.location.search).get(name);

export const navigate = (url) => {
  window.location.href = url;
};

/** Like navigate(), but the current page is not kept in the history (back button friendly). */
export const replace = (url) => {
  window.location.replace(url);
};

/* ---- Authentication redirects ------------------------------------------ */

/** login.html URL, optionally remembering where to return to (`next`) and why (`reason`). */
export const loginUrl = ({ next, reason } = {}) => {
  const params = new URLSearchParams();
  if (reason) params.set('reason', reason);
  if (next) params.set('next', next);
  const query = params.toString();
  return query ? `${routes.login}?${query}` : routes.login;
};

/** The open page relative to the site root ("app/chat.html?id=c-1") — the format of `?next=`. */
export const currentPage = () => {
  const path = window.location.pathname;
  const relative = path.startsWith(ROOT.pathname) ? path.slice(ROOT.pathname.length) : path.split('/').pop();
  return (relative || 'index.html') + window.location.search;
};

/**
 * Returns the `?next=` target as a URL when it is one of the pages this ROLE may open,
 * otherwise the role's home page → no open redirects, and nobody is sent into the other area.
 */
export const safeNext = (value, role) => {
  const safeRole = normalizeRole(role);
  return typeof value === 'string' && SAFE_NEXT[safeRole].test(value) ? abs(value) : homeFor(safeRole);
};

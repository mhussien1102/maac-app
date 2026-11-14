/**
 * Auth service — login (admin OR user), sign-up, password reset and the current session.
 *
 * Two modes (chosen automatically by core/api.js):
 *   "api"  → the real back-end (maac-api): the server owns the accounts and the role, and the real
 *            session is an HttpOnly cookie. `maac:session` below is only a UI hint for the instant
 *            redirect guard — it grants nothing (every API call is checked by the server).
 *   "mock" → browser-only demo on top of the mock accounts / otp services (GitHub Pages, no server).
 *
 * One login for the whole site. The e-mail decides where you land:
 *   an e-mail from data/users.seed.js → ADMIN_USERS  → role "admin" → /admin/…
 *   any other registered e-mail                      → role "user"  → /app/…
 *   an unknown e-mail → "no_account" (the login page offers to create one → role "user")
 *
 * Session shape: { user: { id, name, email, role: 'admin' | 'user', title, firstName?, lastName?, company? }, createdAt, expiresAt, remember }
 *   `role` is what the route guards check; `title` is the text shown under the name in the sidebar.
 * Stored under "maac:session" — localStorage when "تذكّرني" is ticked (30 days),
 * sessionStorage otherwise (until the tab closes, 12 hours at most).
 * The same key is read by assets/js/boot.js for the instant redirect guard.
 */

import { storage, sessionStore, STORAGE_PREFIX } from '../core/storage.js';
import { bus } from '../core/event-bus.js';
import { wait } from '../core/dom.js';
import { currentPage, homeFor, loginUrl, replace } from '../core/routes.js';
import { accountsService, toProfile } from './accounts.service.js';
import { adminsService } from './admins.service.js';
import { otpService } from './otp.service.js';
import { api, useApi } from '../core/api.js';
import { normalizePhone } from '../core/validators.js';
import { onlyDigits } from '../core/format.js';

const KEY = 'session';
const RESET_KEY = 'reset-grant';
const HOUR = 60 * 60 * 1000;
const SESSION_TTL = 12 * HOUR;
const REMEMBER_TTL = 30 * 24 * HOUR;
const RESET_TTL = 10 * 60 * 1000;

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const readStored = () => storage.get(KEY) ?? sessionStore.get(KEY);

const clearStored = () => {
  storage.remove(KEY);
  sessionStore.remove(KEY);
};

const isValid = (session) => Boolean(session?.user && session.expiresAt > Date.now());

const adminSessionUser = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: 'admin',
  title: admin.title,
});

const userSessionUser = (account) => ({
  id: account.id,
  firstName: account.firstName,
  lastName: account.lastName,
  name: `${account.firstName} ${account.lastName}`.trim(),
  email: account.email,
  role: 'user',
  title: account.jobTitle,
  company: account.company,
});

function openSession(user, remember) {
  const now = Date.now();
  const session = { user, createdAt: now, expiresAt: now + (remember ? REMEMBER_TTL : SESSION_TTL), remember };
  clearStored();
  (remember ? storage : sessionStore).set(KEY, session);
  bus.emit('auth:changed', { user: session.user });
  return session;
}

let watching = false;

/** Logging out in one tab logs out every open tab. */
function watchOtherTabs() {
  if (watching) return;
  watching = true;
  window.addEventListener('storage', (event) => {
    if (event.key === `${STORAGE_PREFIX}${KEY}` && !event.newValue) {
      replace(loginUrl({ reason: 'logout' }));
    }
  });
}

const mockAuth = {
  /* ---------------------------------------------------------------- session */

  /** The active session, or null (an expired session is removed on the way). */
  getSession() {
    const session = readStored();
    // A hint written in the other mode (e.g. demo session, server now running) is useless → drop it.
    if (isValid(session) && Boolean(session.api) === useApi) return session;
    if (session) clearStored();
    return null;
  },

  getUser() {
    return this.getSession()?.user ?? null;
  },

  isAuthenticated() {
    return this.getSession() !== null;
  },

  logout() {
    clearStored();
    bus.emit('auth:changed', { user: null });
  },

  /**
   * Page guard (called by every protected page). Sends visitors without a valid
   * session to login.html and remembers where they wanted to go.
   * @param {'admin'|'user'} [area] the area of the page; a signed-in person of the OTHER role is sent to their own home
   * @returns {object|null} the user, or null when a redirect has been started
   */
  requireAuth(area) {
    const user = this.getUser();
    if (!user) {
      replace(loginUrl({ next: currentPage() }));
      return null;
    }
    if (area && user.role !== area) {
      replace(homeFor(user.role));
      return null;
    }
    watchOtherTabs();
    return user;
  },

  /* ------------------------------------------------------------------ login */

  /**
   * Signs in an admin or a user — the e-mail decides which.
   * @returns the new session; `session.user.role` is 'admin' or 'user' (the login page redirects by it)
   * @throws {AuthError} "invalid_credentials" · "no_account" (unknown e-mail) ·
   *                     "not_verified" (correct password, e-mail not confirmed yet)
   */
  async login({ email, password, remember = false }) {
    await wait(700 + Math.random() * 400);   // fake network latency
    // Real API: POST /api/auth/login → { user: { …, role }, expiresAt }

    // 1) administrators (reserved e-mails)
    if (adminsService.isAdminEmail(email)) {
      const admin = adminsService.check(email, password);
      if (!admin) throw new AuthError('invalid_credentials', 'البريد الإلكتروني أو كلمة المرور غلط');
      return openSession(adminSessionUser(admin), remember);
    }

    // 2) everybody else is a user
    const existing = await accountsService.findByEmail(email);
    if (!existing) throw new AuthError('no_account', 'مفيش حساب بالإيميل ده.');

    const account = await accountsService.checkPassword(email, password);
    if (!account) throw new AuthError('invalid_credentials', 'البريد الإلكتروني أو كلمة المرور غلط');
    if (!account.verified) throw new AuthError('not_verified', 'لازم تأكّد الإيميل الأول');

    return openSession(userSessionUser(account), remember);
  },

  /* ---------------------------------------------------------------- sign-up */

  /**
   * Creates the (unverified) account and "e-mails" a 6-digit code.
   * @throws {AccountError} "email_taken"
   */
  async register(profile) {
    // Real API: POST /api/auth/register → 201, then the server e-mails the code
    const account = await accountsService.register(profile);
    await otpService.issue(account.email, 'signup');
    return account;
  },

  /** Verifies the code typed on verify.html and routes the flow. */
  async verifyOtp(code) {
    const { email, purpose } = await otpService.verify(code);

    if (purpose === 'signup') {
      const account = await accountsService.markVerified(email);
      openSession(userSessionUser(account), false);
      return { purpose, email };
    }

    // purpose === "reset": allow the next step (choosing a new password) for a few minutes
    sessionStore.set(RESET_KEY, { email, expiresAt: Date.now() + RESET_TTL });
    return { purpose, email };
  },

  /* --------------------------------------------------------- forgot password */

  /** Always resolves the same way, whether or not the e-mail is registered. */
  async requestPasswordReset(email) {
    // Real API: POST /api/auth/forgot-password { email }
    await otpService.issue(email, 'reset');
  },

  canResetPassword() {
    const grant = sessionStore.get(RESET_KEY);
    return Boolean(grant && grant.expiresAt > Date.now());
  },

  async resetPassword(newPassword) {
    await wait(600);
    const grant = sessionStore.get(RESET_KEY);
    if (!grant || grant.expiresAt <= Date.now()) throw new AuthError('reset_expired', 'انتهت مهلة تغيير كلمة المرور، ابدأ من الأول');
    await accountsService.setPassword(grant.email, newPassword);
    sessionStore.remove(RESET_KEY);
    clearStored();
  },

  /** Fresh profile (with subscription + payments) for the payment page. */
  async getAccount() {
    const user = this.getUser();
    if (!user) return null;
    const account = await accountsService.getById(user.id);   // (admins have no account → null)
    return account ? toProfile(account) : null;
  },
};

/* ====================================================================================
 * Real back-end — these methods replace the mock ones when /api/health answers.
 * Endpoints: POST /auth/{login,register,verify-otp,forgot-password,reset-password,logout} · GET /auth/me
 * ==================================================================================== */

const sessionUserFromApi = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
  email: user.email,
  role: user.role === 'admin' ? 'admin' : 'user',   // decided by the server
  title: user.title ?? '',
  company: user.company ?? '',
});

/** Stores the UI hint (the cookie itself is set by the server and is invisible to JavaScript). */
function openApiSession(user, expiresAt, remember) {
  const now = Date.now();
  const session = {
    user: sessionUserFromApi(user),
    createdAt: now,
    expiresAt: Date.parse(expiresAt) || now + (remember ? REMEMBER_TTL : SESSION_TTL),
    remember,
    api: true,
  };
  clearStored();
  (remember ? storage : sessionStore).set(KEY, session);
  bus.emit('auth:changed', { user: session.user });
  return session;
}

const remoteAuth = {
  async login({ email, password, remember = false }) {
    // 404 no_account · 401 invalid_credentials · 403 not_verified — the login page switches on `error.code`
    const { user, expiresAt } = await api.post('/auth/login', { email, password, remember });
    return openApiSession(user, expiresAt, remember);
  },

  async register(profile) {
    const { confirmPassword: _confirm, ...values } = profile;
    const data = await api.post('/auth/register', {
      ...values,
      phone: normalizePhone(values.phone),
      taxId: onlyDigits(values.taxId),
    });   // 409 email_taken
    otpService.startPending(data.email, 'signup', data.devCode);
    return { email: data.email };
  },

  async verifyOtp(code) {
    const result = await otpService.verify(code);
    if (result.purpose === 'signup') {
      openApiSession(result.user, result.expiresAt, false);   // the server already set the cookie
      return { purpose: result.purpose, email: result.email };
    }
    sessionStore.set(RESET_KEY, { email: result.email, resetToken: result.resetToken, expiresAt: Date.now() + RESET_TTL });
    return { purpose: result.purpose, email: result.email };
  },

  async resetPassword(newPassword) {
    const grant = sessionStore.get(RESET_KEY);
    if (!grant?.resetToken || grant.expiresAt <= Date.now()) {
      throw new AuthError('reset_expired', 'انتهت مهلة تغيير كلمة المرور، ابدأ من الأول');
    }
    await api.post('/auth/reset-password', { resetToken: grant.resetToken, password: newPassword });
    sessionStore.remove(RESET_KEY);
    clearStored();
  },

  /** Clears the hint at once, then asks the server to drop the cookie. */
  async logout() {
    clearStored();
    bus.emit('auth:changed', { user: null });
    try {
      await api.post('/auth/logout');
    } catch {
      /* offline → the hint is gone; the cookie dies with its own expiry */
    }
  },

  /** Asks the server who we really are (role + profile) and corrects the hint if it drifted. */
  async refresh() {
    try {
      const { user } = await api.get('/auth/me');
      const session = readStored();
      if (!session?.api) return;
      const next = sessionUserFromApi(user);
      const roleChanged = next.role !== session.user.role;
      (session.remember ? storage : sessionStore).set(KEY, { ...session, user: next });
      if (roleChanged) replace(homeFor(next.role));
    } catch {
      /* 401 → the 'auth:expired' handler below redirects; a network error is ignored (the next call will tell) */
    }
  },

  requireAuth(area) {
    // ?bounced=1 → the SERVER just refused this visit although the saved hint claimed another role (e.g. an admin who
    // was demoted). Don't trust the hint (and don't bounce back, which would loop): ask the server and follow its answer.
    if (new URLSearchParams(location.search).get('bounced') === '1') {
      const hinted = this.getUser();
      if (hinted && area && hinted.role !== area) {
        this.refresh();
        return null;
      }
    }
    const user = mockAuth.requireAuth.call(this, area);
    if (user) this.refresh();   // the hint is only a hint: confirm with the server in the background
    return user;
  },
};

if (useApi) {
  bus.on('auth:expired', () => {
    clearStored();
    if (document.documentElement.getAttribute('data-auth') === 'required') replace(loginUrl({ reason: 'expired' }));
  });
}

export const authService = useApi ? { ...mockAuth, ...remoteAuth } : mockAuth;

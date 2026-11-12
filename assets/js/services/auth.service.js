/**
 * Auth service — login (admin OR user), sign-up, password reset and the current session.
 *
 * ⚠️ MOCK: it sits on top of the mock accounts / otp services. To connect a real
 * back-end, replace the bodies with API calls (see the examples in each method)
 * and prefer an HTTP-only cookie for the real session token.
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

export const authService = {
  /* ---------------------------------------------------------------- session */

  /** The active session, or null (an expired session is removed on the way). */
  getSession() {
    const session = readStored();
    if (isValid(session)) return session;
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

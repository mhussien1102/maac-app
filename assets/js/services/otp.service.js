/**
 * OTP service — the 6-digit code sent to the user's e-mail.
 *
 * ⚠️ MOCK: no e-mail is sent. The code is generated here, kept in sessionStorage
 * and shown in the "كود تجريبي" box on the verification page. With a real
 * back-end: `issue()` asks the server to e-mail the code, `verify()` sends the
 * typed code back, and nothing secret lives in the browser.
 *
 * Purposes: "signup" (confirm the e-mail of a new account) · "reset" (forgot password)
 */

import { sessionStore } from '../core/storage.js';
import { wait } from '../core/dom.js';
import { accountsService } from './accounts.service.js';

const KEY = 'otp';
export const OTP_LENGTH = 6;
const TTL_MS = 10 * 60 * 1000;           // a code is valid for 10 minutes
const RESEND_AFTER_MS = 60 * 1000;       // "إعادة الإرسال" unlocks after 60 seconds
const MAX_ATTEMPTS = 5;

export class OtpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OtpError';
    this.code = code;
  }
}

function randomCode() {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return String(value % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, '0');
}

const read = () => sessionStore.get(KEY);

export const otpService = {
  /**
   * "Sends" a code. For the "reset" purpose an unknown e-mail gets no code but the
   * exact same response, so the screen never reveals which e-mails are registered.
   */
  async issue(email, purpose) {
    await wait(700 + Math.random() * 400);   // fake e-mail latency

    const normalized = String(email).trim().toLowerCase();
    const account = await accountsService.findByEmail(normalized);
    const deliverable = purpose === 'signup' ? Boolean(account) : Boolean(account?.verified);
    const now = Date.now();

    sessionStore.set(KEY, {
      email: normalized,
      purpose,
      code: deliverable ? randomCode() : null,
      sentAt: now,
      expiresAt: now + TTL_MS,
      attempts: 0,
    });
    return this.pending();
  },

  /** Public state of the code being waited for (never contains the code itself). */
  pending() {
    const state = read();
    if (!state) return null;
    const { code: _code, ...rest } = state;
    return rest;
  },

  /** Demo box only — the code that a real server would have e-mailed. */
  peekDemoCode() {
    return read()?.code ?? null;
  },

  /** Seconds left before "resend" unlocks (0 = available). */
  resendIn() {
    const state = read();
    if (!state) return 0;
    return Math.max(0, Math.ceil((state.sentAt + RESEND_AFTER_MS - Date.now()) / 1000));
  },

  async resend() {
    const state = read();
    if (!state) throw new OtpError('no_pending', 'ابدأ من الأول');
    if (this.resendIn() > 0) throw new OtpError('too_soon', 'استنى شوية قبل ما تطلب كود جديد');
    return this.issue(state.email, state.purpose);
  },

  /**
   * @returns {Promise<{ email: string, purpose: string }>}
   * @throws {OtpError} codes: no_pending · expired · locked · invalid
   */
  async verify(input) {
    await wait(500 + Math.random() * 300);

    const state = read();
    if (!state) throw new OtpError('no_pending', 'الجلسة انتهت، ابدأ من الأول');
    if (Date.now() > state.expiresAt) throw new OtpError('expired', 'الكود انتهت صلاحيته، اطلب كود جديد');
    if (state.attempts >= MAX_ATTEMPTS) throw new OtpError('locked', 'حاولت كتير، اطلب كود جديد');

    if (!state.code || String(input) !== state.code) {
      state.attempts += 1;
      sessionStore.set(KEY, state);
      const left = MAX_ATTEMPTS - state.attempts;
      throw new OtpError('invalid', left > 0 ? `الكود غلط (فاضل ${left} محاولات)` : 'حاولت كتير، اطلب كود جديد');
    }

    sessionStore.remove(KEY);
    return { email: state.email, purpose: state.purpose };
  },

  clear() {
    sessionStore.remove(KEY);
  },
};

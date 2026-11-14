/**
 * Accounts service — the user database.
 *
 * ⚠️ MOCK: accounts live in this browser's localStorage and passwords are only
 * salted-hashed for the demo. A real back-end owns all of this (hashing with
 * bcrypt/argon2, unique e-mail constraint, e-mail verification …). Keep the
 * method names and make them call your API instead.
 *
 * Used by BOTH areas: the user area signs people in / records payments, the admin area lists them.
 *
 * Account shape:
 *   { id, firstName, lastName, email, phone, jobTitle, company, taxId,
 *     salt, passwordHash, verified, createdAt, subscription: null | {…}, payments: [] }
 */

import { storage } from '../core/storage.js';
import { normalizePhone } from '../core/validators.js';
import { onlyDigits } from '../core/format.js';
import { DEMO_USER } from '../data/users.seed.js';
import { adminsService } from './admins.service.js';
import { api, useApi } from '../core/api.js';

const KEY = 'accounts';

export class AccountError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
  }
}

/* ---- password hashing (demo-grade) ------------------------------------- */

const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

async function hashPassword(password, salt) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    return toHex(await crypto.subtle.digest('SHA-256', data));
  }
  // Insecure contexts (plain http on a LAN address) have no crypto.subtle — tiny non-cryptographic fallback.
  let h = 0x811c9dc5;
  for (const ch of `${salt}:${password}`) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0;
  return `fnv-${h.toString(16)}`;
}

const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(12)));
const uid = () => `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const normalizeEmail = (email) => String(email).trim().toLowerCase();

/* ---- storage ------------------------------------------------------------ */

let cache = null;
let seeding = null;

async function load() {
  if (cache) return cache;
  seeding ??= (async () => {
    const stored = storage.get(KEY);
    if (stored) {
      cache = stored;
      return;
    }
    const salt = newSalt();
    cache = [
      {
        id: DEMO_USER.id,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        email: DEMO_USER.email,
        phone: normalizePhone(DEMO_USER.phone),
        jobTitle: DEMO_USER.jobTitle,
        company: DEMO_USER.company,
        taxId: DEMO_USER.taxId,
        salt,
        passwordHash: await hashPassword(DEMO_USER.password, salt),
        verified: true,
        createdAt: Date.now(),
        subscription: null,
        payments: [],
      },
    ];
    storage.set(KEY, cache);
  })();
  await seeding;
  return cache;
}

const persist = () => storage.set(KEY, cache);

/** What the rest of the app may see (never the hash / salt). */
export function toProfile(account) {
  const { salt: _salt, passwordHash: _hash, ...profile } = account;
  return profile;
}

/* ---- API ---------------------------------------------------------------- */

const mockAccounts = {
  /** All accounts (without hashes) — used by the admin subscriptions page. */
  async listAll() {
    const accounts = await load();
    return accounts.map(toProfile);
  },

  /** Forget the in-memory copy so the next call re-reads localStorage (another tab may have changed it). */
  reload() {
    cache = null;
    seeding = null;
  },

  async findByEmail(email) {
    const accounts = await load();
    return accounts.find((account) => account.email === normalizeEmail(email)) ?? null;
  },

  async getById(id) {
    const accounts = await load();
    return accounts.find((account) => account.id === id) ?? null;
  },

  /**
   * Creates an UNVERIFIED account (it becomes usable after the e-mail OTP).
   * @throws {AccountError} code "email_taken" when a verified account already uses the e-mail
   */
  async register({ firstName, lastName, email, password, phone, jobTitle, company, taxId }) {
    const accounts = await load();
    const normalized = normalizeEmail(email);
    // Admin e-mails are reserved: nobody can sign up with one (it would be a way into the admin area).
    if (adminsService.isAdminEmail(normalized)) throw new AccountError('email_taken', 'البريد ده مسجّل قبل كده، جرّب تسجّل دخول');
    const existing = accounts.find((account) => account.email === normalized);
    if (existing?.verified) throw new AccountError('email_taken', 'البريد ده مسجّل قبل كده، جرّب تسجّل دخول');

    const salt = newSalt();
    const account = {
      id: existing?.id ?? uid(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalized,
      phone: normalizePhone(phone),
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      taxId: onlyDigits(taxId),
      salt,
      passwordHash: await hashPassword(password, salt),
      verified: false,
      createdAt: Date.now(),
      subscription: null,
      payments: [],
    };

    if (existing) accounts.splice(accounts.indexOf(existing), 1, account);   // re-registering an unverified e-mail
    else accounts.push(account);
    persist();
    return toProfile(account);
  },

  /** @returns {Promise<object|null>} the account when the password matches */
  async checkPassword(email, password) {
    const account = await this.findByEmail(email);
    if (!account) return null;
    return (await hashPassword(password, account.salt)) === account.passwordHash ? account : null;
  },

  async markVerified(email) {
    const account = await this.findByEmail(email);
    if (!account) return null;
    account.verified = true;
    persist();
    return account;
  },

  async setPassword(email, newPassword) {
    const account = await this.findByEmail(email);
    if (!account) throw new AccountError('not_found', 'الحساب مش موجود');
    account.salt = newSalt();
    account.passwordHash = await hashPassword(newPassword, account.salt);
    persist();
  },

  /** Stores the active subscription + a receipt line (never card data — only the last 4 digits). */
  async recordPayment(id, { subscription, payment }) {
    const account = await this.getById(id);
    if (!account) throw new AccountError('not_found', 'الحساب مش موجود');
    account.subscription = subscription;
    account.payments = [payment, ...(account.payments ?? [])];
    persist();
    return toProfile(account);
  },
};

/* ---- Real back-end ------------------------------------------------------------------------------
 * Accounts live on the server: sign-up / sign-in / OTP never touch this file in "api" mode (see
 * auth.service.js). Only two readers remain:
 *   · the admin subscriptions page  → GET /api/admin/users   (admin-only, enforced by the server)
 *   · the payment page              → GET /api/auth/me
 * ⚠️ Plans / payments / subscriptions are the NEXT back-end milestone, so for now they are still
 *    kept per browser (localStorage "billing") and merged into the profiles below.
 */

const BILLING_KEY = 'billing';
const EMPTY_BILLING = { subscription: null, payments: [] };

const readBilling = () => storage.get(BILLING_KEY) ?? {};
const withBilling = (user) => ({
  ...user,
  createdAt: Date.parse(user.createdAt) || Date.now(),
  ...(readBilling()[user.id] ?? EMPTY_BILLING),
});

const remoteAccounts = {
  async listAll() {
    const { users } = await api.get('/admin/users');
    return users.filter((user) => user.role !== 'admin').map(withBilling);
  },

  reload() {},

  async getById(id) {
    const { user } = await api.get('/auth/me');
    return user.id === id ? withBilling(user) : null;
  },

  async recordPayment(id, { subscription, payment }) {
    const all = readBilling();
    const current = all[id] ?? EMPTY_BILLING;
    all[id] = { subscription, payments: [payment, ...(current.payments ?? [])] };
    storage.set(BILLING_KEY, all);
    return this.getById(id);
  },
};

export const accountsService = useApi ? { ...mockAccounts, ...remoteAccounts } : mockAccounts;

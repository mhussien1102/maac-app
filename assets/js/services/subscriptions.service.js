/**
 * Subscriptions service — the admin's view of every subscriber.
 *
 * It is built from the REAL accounts of the user area (services/accounts.service.js):
 *   a user who signed up and confirmed the e-mail but did not pay yet → 'pending'  (في انتظار الدفع)
 *   a user with a running subscription (paid on payment.html)        → 'paid'     (دفع)
 *   a user whose subscription ended                                  → 'expired'  (منتهي)
 * so a new sign-up appears here immediately and flips to "دفع" when they pay.
 *
 * ⚠️ MOCK storage (the browser's localStorage). With a real back-end this becomes
 * `GET /api/admin/subscribers` (admin-only on the server).
 */

import { accountsService } from './accounts.service.js';
import { SAMPLE_SUBSCRIPTIONS, SHOW_SAMPLE_SUBSCRIBERS } from '../data/subscriptions.seed.js';

export const PLAN_LABELS = { yearly: 'سنوي', monthly: 'شهري' };

export const STATUS_LABELS = {
  paid: 'دفع',
  pending: 'في انتظار الدفع',
  expired: 'منتهي',
};

const statusOf = (subscription) => {
  if (!subscription) return 'pending';
  return new Date(subscription.expiresAt) > new Date() ? 'paid' : 'expired';
};

const isoDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

/** Everyone who confirmed their e-mail, newest sign-up first, then the sample rows. */
async function load() {
  const accounts = (await accountsService.listAll()).filter((account) => account.verified);
  accounts.sort((a, b) => b.createdAt - a.createdAt);

  const real = accounts.map((account) => ({
    id: account.id,
    name: `${account.firstName} ${account.lastName}`.trim(),
    detail: account.company || account.email,
    plan: account.subscription?.planId ?? null,
    status: statusOf(account.subscription),
    start: isoDate(account.subscription?.startedAt),
    end: isoDate(account.subscription?.expiresAt),
    sample: false,
  }));

  const samples = SHOW_SAMPLE_SUBSCRIBERS ? SAMPLE_SUBSCRIPTIONS.map((row) => ({ ...row, sample: true })) : [];
  return [...real, ...samples];
}

export const subscriptionsService = {
  /** @returns {Promise<{ rows: object[], summary: { total, paid, pending, expired } }>} */
  async snapshot() {
    const rows = await load();
    const count = (status) => rows.filter((row) => row.status === status).length;
    return { rows, summary: { total: rows.length, paid: count('paid'), pending: count('pending'), expired: count('expired') } };
  },

  /** @param {'all'|'paid'|'pending'|'expired'} status */
  filter(rows, status = 'all') {
    return status === 'all' ? rows : rows.filter((row) => row.status === status);
  },
};

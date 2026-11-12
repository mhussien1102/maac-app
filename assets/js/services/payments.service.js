/**
 * Payments service — plans, price quote and the (simulated) Visa charge.
 *
 * ⚠️ MOCK: nothing is charged. In production NEVER send raw card numbers through
 * your own server or store them: use the payment gateway's hosted fields / SDK
 * (Paymob, Fawry, Stripe, …) so the card goes straight from the browser to the
 * gateway and you only receive a token / transaction id.
 *
 * Demo cards:  4111 1111 1111 1111 → approved   ·   4000 0000 0000 0002 → declined
 * Only the last 4 digits are ever kept (in the receipt).
 */

import { wait } from '../core/dom.js';
import { onlyDigits } from '../core/format.js';
import { CURRENCY, PLANS, VAT_RATE } from '../data/plans.seed.js';
import { authService } from './auth.service.js';
import { accountsService } from './accounts.service.js';

export { PLANS, CURRENCY, VAT_RATE };

export class PaymentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}

const round2 = (value) => Math.round(value * 100) / 100;

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const reference = () => `MAAC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export const paymentsService = {
  getPlan(planId) {
    return PLANS.find((plan) => plan.id === planId) ?? PLANS[0];
  },

  /** @returns {{ plan, subtotal: number, vat: number, total: number, currency: string }} */
  quote(planId) {
    const plan = this.getPlan(planId);
    const subtotal = plan.price;
    const vat = round2(subtotal * VAT_RATE);
    return { plan, subtotal, vat, total: round2(subtotal + vat), currency: CURRENCY };
  },

  /** 'none' | 'active' | 'expired' */
  statusOf(subscription) {
    if (!subscription) return 'none';
    return new Date(subscription.expiresAt) > new Date() ? 'active' : 'expired';
  },

  /**
   * @param {{ planId: string, card: { number: string, name: string, expiry: string, cvv: string } }} order
   * @throws {PaymentError} "card_declined"
   */
  async charge({ planId, card }) {
    await wait(1400 + Math.random() * 700);   // gateway latency
    // Real API: POST /api/payments { planId, paymentMethodToken }

    const digits = onlyDigits(card.number);
    if (digits.endsWith('0002')) {
      throw new PaymentError('card_declined', 'البنك رفض العملية. جرّب كارت تاني أو اتواصل مع البنك.');
    }

    const user = authService.getUser();
    if (!user) throw new PaymentError('not_signed_in', 'سجّل دخولك الأول');

    const { plan, total, vat, subtotal } = this.quote(planId);
    const paidAt = new Date();
    const payment = {
      reference: reference(),
      planId: plan.id,
      planName: plan.name,
      subtotal,
      vat,
      amount: total,
      currency: CURRENCY,
      last4: digits.slice(-4),
      paidAt: paidAt.toISOString(),
    };

    // Renewing before the end extends the current subscription instead of overlapping it.
    const account = await authService.getAccount();
    const current = account?.subscription;
    const startsFrom = current && this.statusOf(current) === 'active' ? new Date(current.expiresAt) : paidAt;
    const subscription = {
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      startedAt: paidAt.toISOString(),
      expiresAt: addMonths(startsFrom, plan.months).toISOString(),
    };

    await accountsService.recordPayment(user.id, { subscription, payment });
    return { payment, subscription };
  },
};

/**
 * Page: payment.html — pick a plan and pay the subscription with a Visa card.
 *
 *   plan cards → card form (+ live card preview) → "ادفع الآن" → receipt
 *
 * ⚠️ The charge is simulated (services/payments.service.js). Card numbers never
 * leave this page and are not stored — only the last 4 digits go into the receipt.
 */

import { onReady, qs } from '../core/dom.js';
import { html, mount, raw } from '../core/html.js';
import { hydrateIcons, icon } from '../core/icons.js';
import { formatCardNumber, formatDateAr, formatExpiry, formatMoney, onlyDigits } from '../core/format.js';
import { getParam, routes } from '../core/routes.js';
import { validators } from '../core/validators.js';
import { authService } from '../services/auth.service.js';
import { PLANS, paymentsService } from '../services/payments.service.js';
import { initAppShell } from '../components/app-shell.js';
import { createForm } from '../components/form-controller.js';
import { mountCardPreview } from '../components/card-preview.js';
import { showToast } from '../components/toast.js';

/* ------------------------------------------------------------------ views */

const daysLeft = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86_400_000));

/** Banner at the top: no subscription / active / expired. */
function statusView(subscription) {
  const state = paymentsService.statusOf(subscription);

  if (state === 'active') {
    const left = daysLeft(subscription.expiresAt);
    return html`
      <div class="sub-status sub-status--active">
        <span class="sub-status__icon">${raw(icon('badge-check', { size: 26 }))}</span>
        <div class="sub-status__text">
          <strong>اشتراكك ${subscription.planName} مفعّل</strong>
          <span>بينتهي يوم ${formatDateAr(subscription.expiresAt)}</span>
        </div>
        <span class="badge badge--success">فاضل ${left} يوم</span>
      </div>
    `;
  }

  if (state === 'expired') {
    return html`
      <div class="sub-status sub-status--expired">
        <span class="sub-status__icon">${raw(icon('circle-alert', { size: 26 }))}</span>
        <div class="sub-status__text">
          <strong>اشتراكك انتهى</strong>
          <span>خلص يوم ${formatDateAr(subscription.expiresAt)} — جدّد دلوقتي عشان تكمّل.</span>
        </div>
      </div>
    `;
  }

  return html`
    <div class="sub-status sub-status--none">
      <span class="sub-status__icon">${raw(icon('info', { size: 26 }))}</span>
      <div class="sub-status__text">
        <strong>اشتراكك لسه مش مفعّل</strong>
        <span>اختار باقة وادفع بكارت Visa عشان تبدأ.</span>
      </div>
    </div>
  `;
}

function planView(plan, selected) {
  const perMonth = Math.round(plan.price / plan.months);
  return html`
    <label class="plan ${selected ? 'is-selected' : ''}">
      <input class="sr-only" type="radio" name="plan" value="${plan.id}" ${selected ? raw('checked') : ''}>
      <span class="plan__top">
        <span class="plan__name">${plan.name}</span>
        ${plan.badge ? html`<span class="plan__badge">${plan.badge}</span>` : ''}
        <span class="plan__check">${raw(icon('check', { size: 16, strokeWidth: 2.5 }))}</span>
      </span>
      <span class="plan__price">
        <strong>${formatMoney(plan.price, '').trim()}</strong>
        <span>ج.م / ${plan.months === 1 ? 'شهر' : 'سنة'}</span>
      </span>
      ${plan.months > 1 ? html`<span class="plan__per-month">يعني حوالي ${formatMoney(perMonth)} في الشهر</span>` : ''}
      <ul class="plan__perks">
        ${plan.perks.map((perk) => html`<li>${raw(icon('check', { size: 15, strokeWidth: 2.5 }))}<span>${perk}</span></li>`)}
      </ul>
    </label>
  `;
}

function summaryView(quote) {
  return html`
    <div class="summary__row"><dt>باقة ${quote.plan.name}</dt><dd>${formatMoney(quote.subtotal)}</dd></div>
    <div class="summary__row"><dt>ضريبة القيمة المضافة (14%)</dt><dd>${formatMoney(quote.vat)}</dd></div>
    <div class="summary__row summary__row--total"><dt>الإجمالي</dt><dd>${formatMoney(quote.total)}</dd></div>
  `;
}

const historyRow = (payment) => html`
  <tr>
    <td>${formatDateAr(payment.paidAt)}</td>
    <td>${payment.planName}</td>
    <td class="data-table__strong">${formatMoney(payment.amount)}</td>
    <td><bdi dir="ltr">•••• ${payment.last4}</bdi></td>
    <td><bdi dir="ltr">${payment.reference}</bdi></td>
  </tr>
`;

function receiptView({ payment, subscription }) {
  const rows = [
    ['رقم العملية', html`<bdi dir="ltr">${payment.reference}</bdi>`],
    ['الباقة', `باقة ${payment.planName}`],
    ['تاريخ الدفع', formatDateAr(payment.paidAt)],
    ['الكارت', html`<bdi dir="ltr">Visa •••• ${payment.last4}</bdi>`],
    ['المبلغ (شامل الضريبة)', formatMoney(payment.amount)],
    ['الاشتراك ساري لحد', formatDateAr(subscription.expiresAt)],
  ];

  return html`
    <div class="receipt__hero">
      <span class="receipt__icon">${raw(icon('check', { size: 34, strokeWidth: 2.5 }))}</span>
      <h2 class="display receipt__title">تم الدفع بنجاح</h2>
      <p class="lead">اشتراكك اتفعّل — تقدر تبدأ تسأل عن ملفاتك دلوقتي.</p>
    </div>

    <dl class="receipt__list">
      ${rows.map(([label, value]) => html`<div class="receipt__row"><dt>${label}</dt><dd>${value}</dd></div>`)}
    </dl>

    <div class="receipt__actions">
      <a class="btn btn--primary btn--lg" href="${routes.home}">ابدأ استخدام المساعد</a>
      <button class="btn btn--outline btn--lg" type="button" id="print-receipt">
        ${raw(icon('receipt', { size: 18 }))}<span>طباعة الإيصال</span>
      </button>
    </div>
  `;
}

/* --------------------------------------------------------------- behaviour */

onReady(async () => {
  if (!initAppShell({ active: 'payment' })) return;   // not signed in → already redirecting to login.html
  hydrateIcons();

  const state = { planId: PLANS.some((plan) => plan.id === getParam('plan')) ? getParam('plan') : PLANS[1].id };

  /* ---- plans + summary ---- */
  const renderPlans = () => mount(qs('#plans'), PLANS.map((plan) => planView(plan, plan.id === state.planId)));
  const renderSummary = () => mount(qs('#summary'), summaryView(paymentsService.quote(state.planId)));

  qs('#plans').addEventListener('change', (event) => {
    if (event.target.name !== 'plan') return;
    state.planId = event.target.value;
    renderPlans();
    renderSummary();
    qs(`input[value="${state.planId}"]`, qs('#plans')).focus();
  });

  /* ---- status + history (read from the account) ---- */
  const renderAccount = async () => {
    // (with the real back-end this is a network call → a failure must not break the page)
    const account = await authService.getAccount().catch(() => null);
    mount(qs('#status'), statusView(account?.subscription));

    const payments = account?.payments ?? [];
    qs('#history').hidden = payments.length === 0;
    mount(qs('#history-body'), payments.map(historyRow));

    if (paymentsService.statusOf(account?.subscription) !== 'none') qs('[data-label]', qs('#pay-button')).textContent = 'جدّد الاشتراك';
  };

  renderPlans();
  renderSummary();
  await renderAccount();     // (before the form, so the button label it remembers is the right one)

  /* ---- card form ---- */
  const preview = mountCardPreview(qs('#card-preview'));
  const formEl = qs('#pay-form');

  const form = createForm(formEl, {
    fields: {
      cardNumber: { validate: validators.visaNumber, format: formatCardNumber },
      cardName: { validate: validators.cardholder, format: (value) => value.toUpperCase() },
      expiry: { validate: validators.expiry, format: formatExpiry },
      cvv: { validate: validators.cvv, format: (value) => onlyDigits(value).slice(0, 3) },
    },
    busyLabel: 'جاري الدفع…',
    shakeTarget: qs('#card-title').closest('.card'),

    async onSubmit(values) {
      const result = await paymentsService.charge({
        planId: state.planId,
        card: { number: values.cardNumber, name: values.cardName, expiry: values.expiry, cvv: values.cvv },
      });

      // success → clear the card data right away and show the receipt
      formEl.reset();
      preview.update();
      form.setBusy(false);
      qs('#pay-layout').hidden = true;
      mount(qs('#receipt'), receiptView(result));
      qs('#receipt').hidden = false;
      qs('#print-receipt').addEventListener('click', () => window.print());
      await renderAccount();
      qs('#main').scrollTo({ top: 0, behavior: 'smooth' });
      showToast('تم الدفع واتفعّل اشتراكك');
    },
  });

  formEl.addEventListener('input', () => {
    const values = form.values();
    preview.update({ number: values.cardNumber, name: values.cardName, expiry: values.expiry });
  });

  /* ---- demo helper ---- */
  qs('#fill-card').addEventListener('click', () => {
    const year = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
    form.fill({ cardNumber: '4111 1111 1111 1111', cardName: 'MAAC DEMO USER', expiry: `12/${year}`, cvv: '123' });
    formEl.dispatchEvent(new Event('input'));
    qs('#pay-button').focus();
  });

});

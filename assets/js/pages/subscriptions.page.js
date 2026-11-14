/**
 * Page: admin/subscriptions.html — summary cards, filter tabs and the subscribers table.
 * The rows are the REAL users of the user area (new sign-ups show up as "في انتظار الدفع"
 * and flip to "دفع" after they pay). The table refreshes by itself when another tab changes the data.
 */

import { onReady, qs, delegate } from '../core/dom.js';
import { html, mount } from '../core/html.js';
import { initAppShell } from '../components/app-shell.js';
import { STORAGE_PREFIX } from '../core/storage.js';
import { accountsService } from '../services/accounts.service.js';
import { PLAN_LABELS, STATUS_LABELS, subscriptionsService } from '../services/subscriptions.service.js';

const STATS = [
  { key: 'total', label: 'إجمالي المشتركين', tone: 'info' },
  { key: 'paid', label: 'دفعوا الاشتراك', tone: 'success' },
  { key: 'pending', label: 'في انتظار الدفع', tone: 'warning' },
  { key: 'expired', label: 'اشتراكات منتهية', tone: 'danger' },
];

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'paid', label: 'دفعوا' },
  { key: 'pending', label: 'في انتظار الدفع' },
  { key: 'expired', label: 'منتهية' },
];

const STATUS_TONES = { paid: 'success', pending: 'warning', expired: 'danger' };

/* ------------------------------------------------------------------ views */

const statCard = (stat, summary) => html`
  <article class="stat-card stat-card--${stat.tone}">
    <p class="stat-card__label">${stat.label}</p>
    <p class="stat-card__value">${summary[stat.key]}</p>
    <div class="stat-card__bar" aria-hidden="true"></div>
  </article>
`;

const tab = (item, selected) => html`
  <button type="button" class="tabs__tab" role="tab" data-filter="${item.key}" aria-selected="${selected}">
    ${item.label}
  </button>
`;

const dateCell = (value) => (value ? html`<bdi dir="ltr">${value}</bdi>` : '—');

const row = (subscription) => html`
  <tr>
    <td>
      <span class="data-table__strong">${subscription.name}</span>
      <span class="subs__meta"><bdi>${subscription.detail}</bdi>${subscription.sample ? html`<span class="subs__tag">بيانات تجريبية</span>` : ''}</span>
    </td>
    <td>${PLAN_LABELS[subscription.plan] ?? '—'}</td>
    <td><span class="badge badge--${STATUS_TONES[subscription.status]}">${STATUS_LABELS[subscription.status]}</span></td>
    <td class="is-date">${dateCell(subscription.start)}</td>
    <td class="is-date">${dateCell(subscription.end)}</td>
  </tr>
`;

const emptyRow = html`<tr><td class="data-table__empty" colspan="5">مفيش اشتراكات في التصنيف ده</td></tr>`;

/* --------------------------------------------------------------- behaviour */

onReady(async () => {
  if (!initAppShell({ active: 'subscriptions' })) return;   // not signed in / not an admin → already redirecting

  const tabsEl = qs('#tabs');
  const bodyEl = qs('#subs-body');
  let filter = 'all';
  let snapshot = { rows: [], summary: { total: 0, paid: 0, pending: 0, expired: 0 } };

  const renderTabs = () => mount(tabsEl, TABS.map((item) => tab(item, item.key === filter)));
  const renderRows = () => {
    const rows = subscriptionsService.filter(snapshot.rows, filter);
    mount(bodyEl, rows.length ? rows.map(row) : emptyRow);
  };
  const renderStats = () => mount(qs('#stats'), STATS.map((stat) => statCard(stat, snapshot.summary)));

  const refresh = async () => {
    try {
      snapshot = await subscriptionsService.snapshot();
    } catch (error) {
      // real back-end only: server down / not allowed → say so instead of leaving an empty table
      mount(bodyEl, html`<tr><td class="data-table__empty" colspan="5">${error.message || 'مقدرتش أحمّل الاشتراكات، جرّب تاني.'}</td></tr>`);
      return;
    }
    renderStats();
    renderRows();
  };

  renderTabs();
  await refresh();

  // A user signing up / paying in another tab changes the accounts → update the table live.
  window.addEventListener('storage', (event) => {
    if (event.key !== `${STORAGE_PREFIX}accounts`) return;
    accountsService.reload();
    refresh();
  });

  delegate(tabsEl, 'click', '[data-filter]', (_event, button) => {
    filter = button.dataset.filter;
    renderTabs();
    renderRows();
  });
});

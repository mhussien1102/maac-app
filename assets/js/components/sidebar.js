/**
 * Sidebar — brand, "new chat", navigation, conversation history, theme, user.
 *
 *   mountSidebar(el, { active: 'upload' | 'payment' | 'subscriptions' | 'history' | null,
 *                      conversationId: 'c-601',
 *                      user: { name, title, role } })   ← the signed-in person (see auth.service.js)
 *
 * One sidebar for both areas: an admin gets "عرض الاشتراكات", a user gets "الاشتراك والدفع".
 */

import { html, mount, raw } from '../core/html.js';
import { icon } from '../core/icons.js';
import { bus } from '../core/event-bus.js';
import { initialOf } from '../core/format.js';
import { routes, chatUrl, currentArea, loginUrl, replace } from '../core/routes.js';
import { authService } from '../services/auth.service.js';
import { conversationsService } from '../services/conversations.service.js';
import { mountThemeRow } from './theme-toggle.js';

// The role-specific entry: admins manage subscribers, users pay for their own subscription.
const roleItem = () =>
  currentArea() === 'admin'
    ? { key: 'subscriptions', label: 'عرض الاشتراكات', icon: 'users', href: routes.subscriptions }
    : { key: 'payment', label: 'الاشتراك والدفع', icon: 'credit-card', href: routes.payment };

const navItems = (latestConversation) => [
  { key: 'upload', label: 'إضافة ملفات', icon: 'upload', href: routes.upload },
  roleItem(),
  // "السجل" opens the most recent conversation (or the home screen if there is none yet).
  { key: 'history', label: 'السجل', icon: 'clock', href: latestConversation ? chatUrl(latestConversation.id) : routes.home },
];

function renderNav(active) {
  return navItems(conversationsService.latest()).map(
    (item) => html`
      <a class="nav__item ${item.key === active ? 'is-active' : ''}" href="${item.href}"
         ${item.key === active ? raw('aria-current="page"') : ''}>
        ${raw(icon(item.icon, { size: 18 }))}
        <span>${item.label}</span>
      </a>
    `,
  );
}

function renderHistory(conversationId) {
  const conversations = conversationsService.list();
  if (!conversations.length) return html`<p class="history__empty">لسه مفيش محادثات</p>`;

  return conversations.map(
    (conversation) => html`
      <a class="history__item ${conversation.id === conversationId ? 'is-active' : ''}"
         href="${chatUrl(conversation.id)}" title="${conversation.title}">${conversation.title}</a>
    `,
  );
}

export function mountSidebar(container, { active = null, conversationId = null, user = null } = {}) {
  const initial = initialOf(user?.name);

  mount(
    container,
    html`
      <a class="brand" href="${routes.home}" aria-label="MAAC — الرئيسية">
        <span class="brand__logo">${raw(icon('trending-up', { size: 28 }))}</span>
        <span class="brand__text">
          <span class="brand__name">MAAC</span>
          <span class="brand__tag">Accounting &amp; Auditing</span>
        </span>
      </a>

      <a class="btn btn--primary btn--block sidebar__new" href="${routes.home}">
        ${raw(icon('plus', { size: 22 }))}
        <span>محادثة جديدة</span>
      </a>

      <nav class="nav" aria-label="التنقل الرئيسي" data-nav>${renderNav(active)}</nav>

      <section class="history" aria-labelledby="history-label">
        <h2 class="history__label" id="history-label">المحادثات السابقة</h2>
        <div class="history__list" data-history>${renderHistory(conversationId)}</div>
      </section>

      <div class="sidebar__footer">
        <div class="theme-row" data-theme-row></div>
        <div class="user">
          <span class="user__avatar" aria-hidden="true">${initial}</span>
          <span class="user__meta">
            <span class="user__name">${user?.name ?? ''}</span>
            <span class="user__role">${user?.title ?? ''}</span>
          </span>
          <button type="button" class="icon-btn icon-btn--ghost user__logout" data-logout
                  aria-label="تسجيل الخروج" title="تسجيل الخروج">
            ${raw(icon('log-out', { size: 18 }))}
          </button>
        </div>
      </div>
    `,
  );

  mountThemeRow(container.querySelector('[data-theme-row]'));

  container.querySelector('[data-logout]').addEventListener('click', () => {
    authService.logout();
    replace(loginUrl({ reason: 'logout' }));
  });

  // Keep the history list + "السجل" link fresh when conversations change.
  bus.on('conversations:changed', () => {
    mount(container.querySelector('[data-history]'), renderHistory(conversationId));
    mount(container.querySelector('[data-nav]'), renderNav(active));
  });
}

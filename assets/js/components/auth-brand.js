/**
 * Brand panel of the auth screens (login / sign-up / OTP / forgot / reset) — the
 * navy panel on the physical left, hidden on small screens.
 *
 *   mountAuthBrand(el, { headline })
 */

import { html, mount, raw } from '../core/html.js';
import { icon } from '../core/icons.js';

const DEFAULT_HEADLINE = 'اسأل عن أي رقم، وهنجاوبك من ملفاتك.';

const FEATURES = [
  { icon: 'file-text', text: 'بيقرا ملفاتك (PDF وExcel وWord وصور) ويفهرسها لوحده' },
  { icon: 'shield-check', text: 'كل إجابة معاها اسم الملف ورقم الصفحة اللي اتجابت منها' },
  { icon: 'download', text: 'صدّر النتائج لـ Excel وWord وPDF بضغطة واحدة' },
];

const CHART = `
  <svg class="auth-brand__chart" viewBox="0 0 560 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="auth-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0.32" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 168 C50 160 84 122 132 130 S214 84 270 96 S372 44 430 58 S520 24 560 12 V200 H0 Z" fill="url(#auth-area)" />
    <path d="M0 168 C50 160 84 122 132 130 S214 84 270 96 S372 44 430 58 S520 24 560 12"
          fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" />
  </svg>`;

export function mountAuthBrand(container, { headline = DEFAULT_HEADLINE } = {}) {
  container.classList.add('auth__brand');
  container.setAttribute('aria-label', 'عن MAAC');

  mount(
    container,
    html`
      <div class="auth-brand__head">
        <span class="logo-mark" aria-hidden="true">${raw(icon('trending-up', { size: 26 }))}</span>
        <span class="auth-brand__text">
          <span class="auth-brand__name">MAAC</span>
          <span class="auth-brand__tag">Accounting &amp; Auditing · Tax Services</span>
        </span>
      </div>

      <div class="auth-brand__body">
        <h2 class="auth-brand__headline">${headline}</h2>
        <ul class="auth-brand__features">
          ${FEATURES.map(
            (feature) => html`
              <li>
                <span class="auth-brand__feature-icon">${raw(icon(feature.icon, { size: 18 }))}</span>
                <span>${feature.text}</span>
              </li>
            `,
          )}
        </ul>
      </div>

      ${raw(CHART)}
    `,
  );
}

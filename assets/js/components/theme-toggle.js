/**
 * Theme row: "المظهر: فاتح/داكن" label + sun⇄moon switch.
 * The thumb animation is pure CSS driven by <html data-theme>; this component
 * only wires the click and keeps the label / aria state in sync.
 */

import { html, mount, raw } from '../core/html.js';
import { icon } from '../core/icons.js';
import { bus } from '../core/event-bus.js';
import { themeService } from '../services/theme.service.js';

export function mountThemeRow(container) {
  mount(
    container,
    html`
      <span class="theme-row__label" data-theme-label></span>
      <button type="button" class="theme-toggle" role="switch" aria-label="تبديل المظهر بين الفاتح والداكن">
        <span class="theme-toggle__thumb"></span>
        <span class="theme-toggle__icon theme-toggle__icon--sun">${raw(icon('sun', { size: 15 }))}</span>
        <span class="theme-toggle__icon theme-toggle__icon--moon">${raw(icon('moon', { size: 15 }))}</span>
      </button>
    `,
  );

  const label = container.querySelector('[data-theme-label]');
  const toggle = container.querySelector('.theme-toggle');

  const sync = () => {
    label.textContent = `المظهر: ${themeService.label()}`;
    toggle.setAttribute('aria-checked', String(themeService.get() === 'dark'));
  };

  toggle.addEventListener('click', () => themeService.toggle());
  bus.on('theme:changed', sync);
  sync();
}

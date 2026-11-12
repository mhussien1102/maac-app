/**
 * Toast — short, auto-dismissing feedback message.
 *   showToast('تم النسخ');
 */

import { html, mount } from '../core/html.js';
import { icon } from '../core/icons.js';
import { raw } from '../core/html.js';

let region = null;

function getRegion() {
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  return region;
}

export function showToast(message, { duration = 2400, iconName = 'check' } = {}) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  mount(toast, html`${raw(icon(iconName, { size: 16 }))}<span>${message}</span>`);
  getRegion().append(toast);

  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

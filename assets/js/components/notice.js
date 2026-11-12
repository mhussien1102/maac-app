/**
 * Inline banner helper for `.notice` elements (see components/form.css).
 *
 *   showNotice(el, { tone: 'success' | 'warning' | 'danger' | 'info', icon: 'circle-check', text: '…' })
 */

import { icon } from '../core/icons.js';

const TONES = ['success', 'warning', 'danger'];

export function showNotice(element, { tone = 'info', icon: iconName = 'info', text }) {
  element.classList.remove(...TONES.map((name) => `notice--${name}`));
  if (TONES.includes(tone)) element.classList.add(`notice--${tone}`);
  element.querySelector('[data-notice-icon]').innerHTML = icon(iconName, { size: 18 });
  element.querySelector('[data-notice-text]').textContent = text;
  element.hidden = false;
}

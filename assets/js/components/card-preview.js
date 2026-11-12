/**
 * Visual bank card that mirrors what the user types in the payment form.
 * Decorative only (aria-hidden): the real inputs are the form fields.
 *
 *   const preview = mountCardPreview(el);
 *   preview.update({ number: '4111 1111', name: 'AHMED', expiry: '12/29' });
 */

import { html, mount } from '../core/html.js';
import { onlyDigits } from '../core/format.js';

const PLACEHOLDER_NUMBER = '•••• •••• •••• ••••';

function maskedNumber(value) {
  const digits = onlyDigits(value).padEnd(16, '•').slice(0, 16);
  return digits.match(/.{4}/g).join(' ');
}

export function mountCardPreview(container) {
  mount(
    container,
    html`
      <div class="vcard" aria-hidden="true">
        <div class="vcard__top">
          <span class="vcard__brand">MAAC</span>
          <span class="vcard__network">VISA</span>
        </div>
        <span class="vcard__chip"></span>
        <div class="vcard__number" data-number dir="ltr">${PLACEHOLDER_NUMBER}</div>
        <div class="vcard__bottom" dir="ltr">
          <div>
            <span class="vcard__label">CARD HOLDER</span>
            <span class="vcard__value" data-name>YOUR NAME</span>
          </div>
          <div>
            <span class="vcard__label">EXPIRES</span>
            <span class="vcard__value" data-expiry>MM/YY</span>
          </div>
        </div>
      </div>
    `,
  );

  const numberEl = container.querySelector('[data-number]');
  const nameEl = container.querySelector('[data-name]');
  const expiryEl = container.querySelector('[data-expiry]');

  return {
    update({ number = '', name = '', expiry = '' } = {}) {
      numberEl.textContent = maskedNumber(number);
      nameEl.textContent = name.trim().toUpperCase() || 'YOUR NAME';
      expiryEl.textContent = expiry || 'MM/YY';
    },
  };
}

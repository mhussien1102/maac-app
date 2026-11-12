/**
 * Password helpers: show/hide button, strength meter and Caps Lock hint.
 *
 *   mountPasswordToggle(inputEl, buttonEl)
 *   mountStrengthMeter(inputEl, meterEl)       // meterEl: <div class="strength" hidden>4 bars + label</div>
 *   mountCapsLockHint(inputEl, hintEl)
 */

import { icon } from '../core/icons.js';
import { passwordStrength } from '../core/validators.js';

export function mountPasswordToggle(input, button) {
  button.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    button.innerHTML = icon(show ? 'eye-off' : 'eye', { size: 18 });
    input.focus();
  });
}

export function mountStrengthMeter(input, meter) {
  const label = meter.querySelector('.strength__label');

  const update = () => {
    const { score, label: text } = passwordStrength(input.value);
    meter.hidden = score === 0;
    meter.dataset.strength = String(score);
    label.textContent = text ? `قوة كلمة المرور: ${text}` : '';
  };

  input.addEventListener('input', update);
  update();
}

export function mountCapsLockHint(input, hint) {
  const sync = (event) => {
    hint.hidden = !event.getModifierState?.('CapsLock');
  };
  input.addEventListener('keydown', sync);
  input.addEventListener('keyup', sync);
  input.addEventListener('blur', () => {
    hint.hidden = true;
  });
}

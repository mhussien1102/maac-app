/**
 * OTP input — one box per digit.
 *
 *   const otp = mountOtpInput(container, { length: 6, onComplete: (code) => … });
 *   otp.value() · otp.clear() · otp.focus() · otp.setState('error' | 'success' | null) · otp.setDisabled(true)
 *
 * Handles typing (auto-advance), Backspace, arrow keys, pasting a whole code,
 * browser/SMS autofill, and Arabic-Indic digits (٠-٩).
 * The row is always left-to-right so the digits read in the order they are typed.
 */

import { onlyDigits } from '../core/format.js';

export function mountOtpInput(container, { length = 6, onComplete = () => {}, onChange = () => {} } = {}) {
  container.classList.add('otp');
  container.setAttribute('dir', 'ltr');
  container.setAttribute('role', 'group');

  const boxes = Array.from({ length }, (_, index) => {
    const box = document.createElement('input');
    box.className = 'otp__digit';
    box.type = 'text';
    box.inputMode = 'numeric';
    box.maxLength = length;           // (not 1: SMS/keyboard autofill inserts the whole code into the focused box)
    box.autocomplete = index === 0 ? 'one-time-code' : 'off';
    box.setAttribute('aria-label', `الرقم ${index + 1} من ${length}`);
    box.dataset.index = String(index);
    return box;
  });
  container.replaceChildren(...boxes);

  const value = () => boxes.map((box) => box.value).join('');

  const notify = () => {
    boxes.forEach((box) => box.classList.toggle('is-filled', box.value !== ''));
    const code = value();
    onChange(code);
    if (code.length === length) onComplete(code);
  };

  /** Writes `digits` into the boxes starting at `from`, then focuses the next empty one. */
  const fillFrom = (from, digits) => {
    [...digits].slice(0, length - from).forEach((digit, offset) => {
      boxes[from + offset].value = digit;
    });
    const next = Math.min(from + digits.length, length - 1);
    boxes[next].focus();
    notify();
  };

  boxes.forEach((box, index) => {
    // remember what the box held before the edit (to tell "typed over a filled box" from "autofilled code")
    box.addEventListener('beforeinput', () => {
      box.dataset.prev = box.value;
    });

    box.addEventListener('input', () => {
      let digits = onlyDigits(box.value);
      const prev = box.dataset.prev ?? '';
      if (prev && digits.length === 2) {
        // typed one more digit into an already-filled box → keep only the new one
        if (digits[0] === prev) digits = digits[1];
        else if (digits[1] === prev) digits = digits[0];
      }
      box.value = '';
      box.dataset.prev = '';
      if (digits) fillFrom(index, digits);
      else notify();
    });

    box.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        if (box.value) {
          box.value = '';
          notify();
        } else if (index > 0) {
          boxes[index - 1].value = '';
          boxes[index - 1].focus();
          notify();
        }
        event.preventDefault();
      } else if (event.key === 'ArrowLeft' && index > 0) {
        boxes[index - 1].focus();
        event.preventDefault();
      } else if (event.key === 'ArrowRight' && index < length - 1) {
        boxes[index + 1].focus();
        event.preventDefault();
      } else if (event.key === 'Home') {
        boxes[0].focus();
        event.preventDefault();
      } else if (event.key === 'End') {
        boxes[length - 1].focus();
        event.preventDefault();
      }
    });

    box.addEventListener('paste', (event) => {
      event.preventDefault();
      const digits = onlyDigits(event.clipboardData?.getData('text') ?? '').slice(0, length);
      if (digits) fillFrom(digits.length === length ? 0 : index, digits);
    });

    box.addEventListener('focus', () => box.select());
  });

  return {
    value,

    focus(index = 0) {
      boxes[index].focus();
    },

    /** Sets the whole code without firing onComplete (demo helper). */
    setValue(code) {
      boxes.forEach((box, index) => {
        box.value = code[index] ?? '';
      });
      boxes.forEach((box) => box.classList.toggle('is-filled', box.value !== ''));
    },

    clear({ focus = true } = {}) {
      boxes.forEach((box) => {
        box.value = '';
      });
      if (focus) boxes[0].focus();
      onChange('');
    },

    /** 'error' (red + shake) · 'success' (green) · null (neutral) */
    setState(state) {
      container.classList.toggle('is-error', state === 'error');
      container.classList.toggle('is-success', state === 'success');
      boxes.forEach((box) => box.setAttribute('aria-invalid', String(state === 'error')));
      if (state === 'error') {
        container.classList.remove('is-shaking');
        void container.offsetWidth;
        container.classList.add('is-shaking');
      }
    },

    setDisabled(disabled) {
      boxes.forEach((box) => {
        box.disabled = disabled;
      });
    },
  };
}

/**
 * Form controller — validation, formatting, busy state and error display for any
 * form that follows the markup convention below (see login.html / signup.html):
 *
 *   <form id="…" novalidate>
 *     <div class="notice notice--danger" data-form-error hidden> … <span data-error-text></span></div>
 *     <div class="field">
 *       <div class="input"><input name="email" id="email" …></div>
 *       <p class="field__error" id="email-error" hidden><span data-error-text></span></p>
 *     </div>
 *     <button type="submit"><span data-spinner hidden></span><span data-label>دخول</span></button>
 *   </form>
 *
 *   const form = createForm(el, {
 *     fields: { email: { validate: validators.email, format?, watch?, trim? } },
 *     busyLabel: 'جاري الدخول…',
 *     onSubmit: async (values, form) => { … },        // throw to show an error
 *     onError: (error, form) => true | false,          // true = handled (field-level message)
 *   });
 */

import { qs } from '../core/dom.js';

const SEPARATORS = /[\s/-]/g;

/** Re-formats an input while typing and keeps the caret next to the same character. */
function applyFormat(input, format) {
  const before = input.value;
  const caret = input.selectionStart ?? before.length;
  const significantBefore = before.slice(0, caret).replace(SEPARATORS, '').length;
  const after = format(before);
  if (after === before) return;

  input.value = after;
  let position = 0;
  let seen = 0;
  while (position < after.length && seen < significantBefore) {
    if (!/[\s/-]/.test(after[position])) seen += 1;
    position += 1;
  }
  try {
    input.setSelectionRange(position, position);
  } catch {
    /* some input types don't support selection */
  }
}

export function createForm(form, { fields, onSubmit, onError, busyLabel = 'جاري التنفيذ…', shakeTarget }) {
  const names = Object.keys(fields);
  const submit = qs('[type="submit"], button[form]', form) ?? document.querySelector(`[type="submit"][form="${form.id}"]`);
  const submitLabel = submit ? qs('[data-label]', submit) : null;
  const spinner = submit ? qs('[data-spinner]', submit) : null;
  const formError = qs('[data-form-error]', form);
  const idleLabel = submitLabel?.textContent ?? '';
  const card = shakeTarget ?? form.closest('.auth__card');
  let busy = false;

  const input = (name) => form.elements[name];

  /* ---- values ---- */
  const valueOf = (name) => {
    const el = input(name);
    if (el.type === 'checkbox') return el.checked;
    const keep = fields[name].trim === false || el.type === 'password';
    return keep ? el.value : el.value.trim();
  };

  const values = () => Object.fromEntries(names.map((name) => [name, valueOf(name)]));

  /* ---- errors ---- */
  const setError = (name, message) => {
    const el = input(name);
    const error = qs(`#${name}-error`, form);
    el.closest('.input')?.classList.toggle('is-invalid', Boolean(message));
    el.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) {
      qs('[data-error-text]', error).textContent = message;
      error.hidden = !message;
    }
  };

  const isInvalid = (name) => input(name).getAttribute('aria-invalid') === 'true';

  const validate = (name) => {
    const message = fields[name].validate?.(valueOf(name), values()) ?? '';
    setError(name, message);
    return message === '';
  };

  const setFormError = (message) => {
    if (!formError) return;
    qs('[data-error-text]', formError).textContent = message;
    formError.hidden = !message;
  };

  const shake = () => {
    if (!card) return;
    card.classList.remove('is-shaking');
    void card.offsetWidth;                  // restart the animation
    card.classList.add('is-shaking');
  };

  const focus = (name) => {
    const el = input(name);
    el.focus();
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };

  /* ---- busy state ---- */
  const setBusy = (value) => {
    busy = value;
    if (submit) submit.disabled = value;
    if (spinner) spinner.hidden = !value;
    if (submitLabel) submitLabel.textContent = value ? busyLabel : idleLabel;
    form.setAttribute('aria-busy', String(value));
  };

  /* ---- events ---- */
  names.forEach((name) => {
    const el = input(name);
    const config = fields[name];

    el.addEventListener('input', () => {
      if (config.format) applyFormat(el, config.format);
      setFormError('');
      if (isInvalid(name)) validate(name);

      // fields that depend on this one (confirm-password ← password) are re-checked once they have content
      names.forEach((other) => {
        if (other !== name && fields[other].watch?.includes(name) && input(other).value) validate(other);
      });
    });

    el.addEventListener('change', () => {
      if (el.type === 'checkbox') setFormError('');
    });

    el.addEventListener('blur', () => {
      if (el.type !== 'checkbox' && valueOf(name)) validate(name);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    setFormError('');

    const results = names.map((name) => [name, validate(name)]);
    const firstInvalid = results.find(([, ok]) => !ok);
    if (firstInvalid) {
      focus(firstInvalid[0]);
      return;
    }

    setBusy(true);
    try {
      await onSubmit(values(), api);
      // success: the page is navigating away — keep the busy state until it does
    } catch (error) {
      setBusy(false);
      shake();
      if (onError?.(error, api)) return;
      setFormError(error?.message || 'حصلت مشكلة غير متوقعة، حاول تاني.');
    }
  });

  const api = {
    values,
    input,
    setError,
    setFormError,
    setBusy,
    focus,
    shake,
    validate,
    /** Sets field values programmatically (demo buttons) and clears every message. */
    fill(data) {
      Object.entries(data).forEach(([name, value]) => {
        if (!input(name)) return;
        if (input(name).type === 'checkbox') input(name).checked = Boolean(value);
        else input(name).value = fields[name]?.format ? fields[name].format(value) : value;
      });
      names.forEach((name) => setError(name, ''));
      setFormError('');
    },
  };

  return api;
}

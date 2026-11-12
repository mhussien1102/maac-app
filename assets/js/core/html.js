/**
 * Tiny safe-by-default HTML templating.
 *
 *   const view = html`<li class="x">${userText}</li>`;
 *   mount(listEl, view);
 *
 * Every interpolated value is HTML-escaped unless it is itself the result of
 * `html` / `raw` (so nested templates, arrays of templates and icons just work).
 */

const SAFE = Symbol('safe-html');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Marks an already-trusted string (e.g. an SVG from icons.js) as safe. */
export function raw(value) {
  return { [SAFE]: true, value: String(value) };
}

const isSafe = (v) => v !== null && typeof v === 'object' && v[SAFE] === true;

function renderValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (isSafe(value)) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}

/** Tagged template → safe HTML object. */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < values.length) out += renderValue(values[i]);
  });
  return raw(out);
}

/** Replaces the content of `el` with the rendered template. */
export function mount(el, view) {
  el.innerHTML = renderValue(view);
}

/** Converts a safe-html object to a plain string. */
export function toString(view) {
  return renderValue(view);
}

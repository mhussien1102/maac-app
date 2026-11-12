/**
 * Small DOM helpers.
 */

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Event delegation: one listener on `root`, runs `handler` when the event
 * originates inside an element matching `selector`.
 * Returns a function that removes the listener.
 */
export function delegate(root, type, selector, handler) {
  const listener = (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

/** Runs `fn` once the DOM is ready. */
export function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

/** Promise-based delay (used by the mock services). */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

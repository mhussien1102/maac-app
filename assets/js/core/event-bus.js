/**
 * Minimal pub/sub built on EventTarget.
 * Services emit events (e.g. "files:changed"); components subscribe to them.
 */

const target = new EventTarget();

export const bus = {
  /** Subscribe. Returns an unsubscribe function. */
  on(type, handler) {
    const listener = (event) => handler(event.detail);
    target.addEventListener(type, listener);
    return () => target.removeEventListener(type, listener);
  },

  emit(type, detail) {
    target.dispatchEvent(new CustomEvent(type, { detail }));
  },
};

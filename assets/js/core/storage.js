/**
 * Web-storage wrappers: namespaced keys, JSON values, and they never throw
 * (private mode / blocked storage simply behave like an empty store).
 *
 *   storage      → localStorage   (survives closing the browser)
 *   sessionStore → sessionStorage (cleared when the tab / browser closes)
 */

/** One namespace for the whole site (admin + user areas share the same browser storage). */
export const STORAGE_PREFIX = 'maac:';
const PREFIX = STORAGE_PREFIX;

function createStore(getArea) {
  return {
    get(key, fallback = null) {
      try {
        const value = getArea().getItem(PREFIX + key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        getArea().setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      try {
        getArea().removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const storage = createStore(() => localStorage);
export const sessionStore = createStore(() => sessionStorage);

/**
 * Theme service — light / dark.
 * The initial theme is applied by assets/js/boot.js (before first paint);
 * this service keeps the same storage key and handles switching.
 */

import { storage } from '../core/storage.js';
import { bus } from '../core/event-bus.js';

const KEY = 'theme';
const THEMES = ['light', 'dark'];

export const themeService = {
  get() {
    const current = document.documentElement.getAttribute('data-theme');
    return THEMES.includes(current) ? current : 'light';
  },

  set(theme) {
    if (!THEMES.includes(theme)) return;
    document.documentElement.setAttribute('data-theme', theme);
    storage.set(KEY, theme);
    bus.emit('theme:changed', theme);
  },

  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  /** Arabic label used by the sidebar ("المظهر: داكن"). */
  label(theme = this.get()) {
    return theme === 'dark' ? 'داكن' : 'فاتح';
  },
};

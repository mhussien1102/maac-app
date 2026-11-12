/**
 * Shared start-up of every auth screen: icons, theme switch, brand panel.
 *
 *   initAuthLayout({ headline: '…' })     // headline is optional
 */

import { qs } from '../core/dom.js';
import { hydrateIcons } from '../core/icons.js';
import { mountAuthBrand } from './auth-brand.js';
import { mountThemeRow } from './theme-toggle.js';

export function initAuthLayout({ headline } = {}) {
  mountAuthBrand(qs('#brand'), { headline });
  hydrateIcons();
  mountThemeRow(qs('[data-theme-row]'));
  window.__MAAC_BOOTED__ = true;   // lets boot.js know the modules loaded (file:// hint)
}

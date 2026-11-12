/**
 * App shell — mounts the sidebar and the mobile drawer behaviour.
 * Every page calls `initAppShell()` once.
 */

import { qs } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { currentArea } from '../core/routes.js';
import { authService } from '../services/auth.service.js';
import { mountSidebar } from './sidebar.js';

export function initAppShell({ active = null, conversationId = null } = {}) {
  // Every app page is protected: without a session we are already being sent to login.html,
  // and a person of the other role is sent to their own area (/admin ↔ /app).
  const user = authService.requireAuth(currentArea());
  if (!user) return null;

  const shell = qs('.app-shell');
  const sidebar = qs('#sidebar', shell);

  mountSidebar(sidebar, { active, conversationId, user });
  setupMobileDrawer(shell, sidebar);

  // Lets assets/js/boot.js know the modules loaded (see the file:// hint).
  window.__MAAC_BOOTED__ = true;
  return user;
}

function setupMobileDrawer(shell, sidebar) {
  const bar = document.createElement('div');
  bar.className = 'mobile-bar';
  bar.innerHTML =
    `<button type="button" class="mobile-bar__btn" aria-label="فتح القائمة" aria-controls="sidebar">${icon('menu', { size: 22 })}</button>` +
    '<span class="mobile-bar__title">MAAC</span>';

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  shell.prepend(bar);
  shell.append(overlay);

  const setOpen = (open) => shell.classList.toggle('is-sidebar-open', open);

  bar.querySelector('button').addEventListener('click', () => setOpen(true));
  overlay.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

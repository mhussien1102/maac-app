/**
 * boot.js — the ONLY classic (non-module) script. It runs synchronously in <head>.
 *
 * 1) Applies the saved theme before the first paint (no light→dark flash).
 * 2) Route guard — redirects before anything is painted. Every page declares:
 *
 *      data-auth="required"  + data-area="user|admin"
 *            → no session                 → login.html (remembering the page in ?next=)
 *            → session of the OTHER role  → that role's own home page
 *      data-auth="guest"     (login, sign-up, OTP …)
 *            → already signed in          → the role's home page
 *      data-auth="entry"     (root index.html)
 *            → signed in → role's home, otherwise login.html
 *
 *    The real source of truth is assets/js/services/auth.service.js (it re-checks on
 *    load and owns the session format). Keep the keys below in sync with it.
 *    ⚠️ This is only a convenience: the role must ALSO be enforced by the server.
 * 3) If the page is opened straight from the file system (file://) the browser
 *    blocks ES modules, so we show a short hint instead of a blank page.
 */
(function () {
  var STORAGE_PREFIX = 'maac:';
  var THEME_KEY = STORAGE_PREFIX + 'theme';
  var SESSION_KEY = STORAGE_PREFIX + 'session';
  var HOMES = { admin: 'admin/index.html', user: 'app/index.html' };
  var root = document.documentElement;
  var theme = 'light';

  try {
    var saved = JSON.parse(localStorage.getItem(THEME_KEY));
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (e) {
    /* storage unavailable (private mode …) — keep the default */
  }

  root.setAttribute('data-theme', theme);

  /* ---- Route guard ---------------------------------------------------- */
  var authMode = root.getAttribute('data-auth');
  var area = root.getAttribute('data-area');

  // Site root, derived from this script's own URL (…/assets/js/boot.js).
  var script = document.currentScript;
  var rootUrl = script && script.src ? script.src.replace(/assets\/js\/boot\.js(\?.*)?$/, '') : '/';
  var rootPath = '/';
  try { rootPath = new URL(rootUrl, location.href).pathname; } catch (e) { /* keep "/" */ }

  /** @returns {{state: 'valid'|'expired'|'none', role: 'admin'|'user'|null}} */
  function readSession() {
    var stores = [];
    try { stores.push(window.localStorage); } catch (e) { /* blocked */ }
    try { stores.push(window.sessionStorage); } catch (e) { /* blocked */ }

    for (var i = 0; i < stores.length; i++) {
      try {
        var session = JSON.parse(stores[i].getItem(SESSION_KEY));
        if (session && session.user) {
          if (session.expiresAt <= Date.now()) return { state: 'expired', role: null };
          return { state: 'valid', role: session.user.role === 'admin' ? 'admin' : 'user' };
        }
      } catch (e) { /* unreadable → ignore */ }
    }
    return { state: 'none', role: null };
  }

  function redirect(path) {
    root.style.visibility = 'hidden';   // nothing flashes while we leave
    location.replace(new URL(path, new URL(rootUrl, location.href)).href);
  }

  if (authMode) {
    var session = readSession();
    var valid = session.state === 'valid';

    if (authMode === 'required') {
      if (!valid) {
        var relative = location.pathname.indexOf(rootPath) === 0 ? location.pathname.slice(rootPath.length) : location.pathname.split('/').pop();
        var page = (relative || 'index.html') + location.search;
        redirect('login.html?' + (session.state === 'expired' ? 'reason=expired&' : '') + 'next=' + encodeURIComponent(page));
      } else if (area && session.role !== area) {
        redirect(HOMES[session.role]);          // signed in, but this page belongs to the other role
      }
    } else if (authMode === 'guest' && valid) {
      redirect(HOMES[session.role]);
    } else if (authMode === 'entry') {
      redirect(valid ? HOMES[session.role] : 'login.html');
    }
  }

  if (location.protocol === 'file:') {
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (window.__MAAC_BOOTED__) return;
        var box = document.createElement('div');
        box.setAttribute('role', 'alert');
        box.style.cssText =
          'position:fixed;inset:auto 16px 16px 16px;z-index:9999;padding:14px 18px;border-radius:12px;' +
          'background:#141413;color:#fff;font:14px/1.7 system-ui,Tahoma,sans-serif;direction:rtl;text-align:right';
        box.innerHTML =
          'المشروع بيستخدم ES Modules فلازم يتفتح من سيرفر محلي مش بالضغط المزدوج على الملف.<br>' +
          'جرّب: <code dir="ltr" style="background:#333;padding:2px 6px;border-radius:6px">npx serve .</code> ' +
          'أو <code dir="ltr" style="background:#333;padding:2px 6px;border-radius:6px">python -m http.server 8000</code> ' +
          'أو إضافة Live Server في VS Code.';
        document.body.appendChild(box);
      }, 1200);
    });
  }
})();

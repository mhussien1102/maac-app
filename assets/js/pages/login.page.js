/**
 * Page: login.html — the single sign-in page for the whole site.
 *
 * The e-mail decides the area (see services/auth.service.js):
 *   admin e-mail          → /admin/…  (or the `?next=` page when it belongs to the admin area)
 *   registered user       → /app/…    (or the `?next=` page when it belongs to the user area)
 *   unknown e-mail        → message + a "create account" link that keeps the e-mail → sign-up → OTP → /app/…
 * Signed-in visitors never see this page (see assets/js/boot.js).
 * Account without a confirmed e-mail → a new code is "sent" and verify.html opens.
 */

import { onReady, qs } from '../core/dom.js';
import { getParam, replace, routes, safeNext } from '../core/routes.js';
import { validators } from '../core/validators.js';
import { ADMIN_USERS, DEMO_USER } from '../data/users.seed.js';
import { showDemoAccounts } from '../core/api.js';
import { authService } from '../services/auth.service.js';
import { otpService } from '../services/otp.service.js';
import { initAuthLayout } from '../components/auth-layout.js';
import { createForm } from '../components/form-controller.js';
import { mountCapsLockHint, mountPasswordToggle } from '../components/password-field.js';
import { showNotice } from '../components/notice.js';

/** Banner shown above the form, chosen with `?reason=`. */
const REASONS = {
  logout: { tone: 'success', icon: 'circle-check', text: 'تم تسجيل الخروج بنجاح.' },
  expired: { tone: 'warning', icon: 'circle-alert', text: 'الجلسة انتهت، سجّل دخولك تاني عشان تكمّل.' },
  reset: { tone: 'success', icon: 'circle-check', text: 'تم تغيير كلمة المرور. سجّل دخولك بالكلمة الجديدة.' },
};

onReady(() => {
  initAuthLayout();

  const reason = REASONS[getParam('reason')];
  if (reason) showNotice(qs('#page-notice'), reason);

  const nextParam = getParam('next');
  const remember = qs('#remember');
  const signupLink = qs('#signup-link');

  const form = createForm(qs('#login-form'), {
    fields: {
      email: { validate: validators.email },
      password: { validate: validators.password },
    },
    busyLabel: 'جاري الدخول…',

    async onSubmit({ email, password }) {
      const session = await authService.login({ email, password, remember: remember.checked });
      // admin → /admin/…, user → /app/… (a `next` page of the other area is ignored)
      replace(safeNext(nextParam, session.user.role));
    },

    onError(error, f) {
      if (error.code === 'not_verified') {
        // Right password, but the e-mail was never confirmed → finish the sign-up with a fresh code.
        f.setFormError('الحساب لسه مش متفعّل — بنبعتلك كود تأكيد جديد…');
        otpService.issue(f.values().email, 'signup')
          .then(() => replace(routes.verify))
          .catch((failure) => f.setFormError(failure.message));
        return true;
      }
      if (error.code === 'no_account') {
        // Demo (browser-only) mode: its accounts are fake, so it may say so. The real server never does — it
        // answers invalid_credentials for an unknown e-mail (see the fall-through below).
        // New e-mail → the way in is a user account: offer sign-up with the e-mail already filled.
        const typed = f.values().email.trim();
        signupLink.href = `${routes.signup}?email=${encodeURIComponent(typed)}`;
        signupLink.classList.add('is-attention');
        f.setFormError('مفيش حساب بالإيميل ده. اضغط «إنشاء حساب جديد» تحت وكمّل بنفس الإيميل.');
        f.focus('email');
        return true;
      }
      // Wrong e-mail or wrong password look the same (the server never says which) → keep the sign-up link handy.
      signupLink.href = `${routes.signup}?email=${encodeURIComponent(f.values().email.trim())}`;
      f.input('password').value = '';
      f.focus('password');
      return false;
    },
  });

  mountPasswordToggle(qs('#password'), qs('[data-toggle-password]'));
  mountCapsLockHint(qs('#password'), qs('#caps-hint'));

  // Demo helper: one-click fill for the two demo accounts. Shown ONLY in development / browser-only demo mode:
  // a production server answers /api/health with demo:false and the box stays hidden (and its data is empty).
  const [DEMO_ADMIN] = ADMIN_USERS;
  if (showDemoAccounts && DEMO_ADMIN && DEMO_USER.email) {
    const demos = { user: DEMO_USER, admin: DEMO_ADMIN };
    qs('#demo-box').hidden = false;
    qs('#demo-user-email').textContent = DEMO_USER.email;
    qs('#demo-user-password').textContent = DEMO_USER.password;
    qs('#demo-admin-email').textContent = DEMO_ADMIN.email;
    qs('#demo-admin-password').textContent = DEMO_ADMIN.password;
    document.querySelectorAll('[data-fill-demo]').forEach((button) => {
      button.addEventListener('click', () => {
        const demo = demos[button.dataset.fillDemo];
        form.fill({ email: demo.email, password: demo.password });
        qs('[type="submit"]').focus();
      });
    });
  }

  form.focus('email');
});

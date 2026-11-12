/**
 * Page: reset.html — choose a new password (only reachable right after a verified reset code).
 */

import { onReady, qs } from '../core/dom.js';
import { loginUrl, replace, routes } from '../core/routes.js';
import { validators } from '../core/validators.js';
import { authService } from '../services/auth.service.js';
import { initAuthLayout } from '../components/auth-layout.js';
import { createForm } from '../components/form-controller.js';
import { mountPasswordToggle, mountStrengthMeter } from '../components/password-field.js';

onReady(() => {
  if (!authService.canResetPassword()) {
    replace(routes.forgot);   // no verified code (or it expired) → start again
    return;
  }

  initAuthLayout();

  const form = createForm(qs('#reset-form'), {
    fields: {
      password: { validate: validators.newPassword },
      confirmPassword: { validate: validators.confirmPassword, watch: ['password'] },
    },
    busyLabel: 'جاري الحفظ…',

    async onSubmit({ password }) {
      await authService.resetPassword(password);
      replace(loginUrl({ reason: 'reset' }));
    },
  });

  const [passwordToggle, confirmToggle] = document.querySelectorAll('[data-toggle-password]');
  mountPasswordToggle(qs('#password'), passwordToggle);
  mountPasswordToggle(qs('#confirmPassword'), confirmToggle);
  mountStrengthMeter(qs('#password'), qs('#password-strength'));

  form.focus('password');
});

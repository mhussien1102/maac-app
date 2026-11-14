/**
 * Page: signup.html — create an account.
 *
 * Flow: fill the form → account is created UNVERIFIED and a 6-digit code is
 * "e-mailed" → verify.html (OTP) → the USER home (/app/index.html).
 * Admin e-mails cannot be registered here (they are reserved, see services/admins.service.js).
 * `?email=` (from the login page) pre-fills the e-mail field.
 */

import { onReady, qs } from '../core/dom.js';
import { formatPhone, formatTaxId } from '../core/format.js';
import { getParam, replace, routes } from '../core/routes.js';
import { validators } from '../core/validators.js';
import { authService } from '../services/auth.service.js';
import { initAuthLayout } from '../components/auth-layout.js';
import { createForm } from '../components/form-controller.js';
import { mountPasswordToggle, mountStrengthMeter } from '../components/password-field.js';

onReady(() => {
  initAuthLayout({ headline: 'ابدأ في دقيقتين، وخلّي ملفاتك تجاوب عنك.' });

  const form = createForm(qs('#signup-form'), {
    fields: {
      firstName: { validate: validators.personName('الاسم الأول') },
      lastName: { validate: validators.personName('الاسم التاني') },
      email: { validate: validators.email },
      password: { validate: validators.newPassword, watch: [] },
      confirmPassword: { validate: validators.confirmPassword, watch: ['password'] },
      phone: { validate: validators.phone, format: formatPhone },
      jobTitle: { validate: validators.required('الوظيفة') },
      company: { validate: validators.required('اسم الشركة') },
      taxId: { validate: validators.taxId, format: formatTaxId },
    },
    busyLabel: 'جاري إنشاء الحساب…',

    async onSubmit(values) {
      await authService.register(values);
      replace(routes.verify);
    },

    onError(error, f) {
      if (error.code === 'email_taken') {
        f.setError('email', error.message);
        f.focus('email');
        return true;
      }
      // The server re-checks every field (and rejects very common passwords) → show its message under the field.
      const [name, messages] = Object.entries(error.fields ?? {})[0] ?? [];
      if (name && f.input(name)) {
        f.setError(name, Array.isArray(messages) ? messages[0] : String(messages));
        f.focus(name);
        return true;
      }
      return false;
    },
  });

  // Coming from the login page with an unknown e-mail → keep what the person typed.
  const prefill = (getParam('email') ?? '').trim();
  if (prefill && validators.email(prefill) === '') form.fill({ email: prefill });

  const [passwordToggle, confirmToggle] = document.querySelectorAll('[data-toggle-password]');
  mountPasswordToggle(qs('#password'), passwordToggle);
  mountPasswordToggle(qs('#confirmPassword'), confirmToggle);
  mountStrengthMeter(qs('#password'), qs('#password-strength'));

  form.focus('firstName');
});

/**
 * Page: forgot.html — "I forgot my password".
 *
 * Flow: e-mail → a 6-digit code is "e-mailed" → verify.html → reset.html → login.
 * The screen answers the same way whether or not the e-mail is registered.
 */

import { onReady, qs } from '../core/dom.js';
import { replace, routes } from '../core/routes.js';
import { validators } from '../core/validators.js';
import { authService } from '../services/auth.service.js';
import { initAuthLayout } from '../components/auth-layout.js';
import { createForm } from '../components/form-controller.js';

onReady(() => {
  initAuthLayout();

  const form = createForm(qs('#forgot-form'), {
    fields: { email: { validate: validators.email } },
    busyLabel: 'جاري الإرسال…',

    async onSubmit({ email }) {
      await authService.requestPasswordReset(email);
      replace(routes.verify);
    },
  });

  form.focus('email');
});

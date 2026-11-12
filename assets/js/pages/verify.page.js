/**
 * Page: verify.html — enter the 6-digit code that was e-mailed.
 *
 *   sign-up  → code OK → account activated + signed in → home page
 *   reset    → code OK → reset.html (choose a new password)
 *
 * Opened without a pending code (e.g. typed the URL) → back to the login screen.
 */

import { onReady, qs, wait } from '../core/dom.js';
import { formatCountdown, maskEmail } from '../core/format.js';
import { homeFor, replace, routes } from '../core/routes.js';
import { authService } from '../services/auth.service.js';
import { OTP_LENGTH, otpService } from '../services/otp.service.js';
import { initAuthLayout } from '../components/auth-layout.js';
import { mountOtpInput } from '../components/otp-input.js';
import { showNotice } from '../components/notice.js';

onReady(() => {
  const pending = otpService.pending();
  if (!pending) {
    replace(routes.login);
    return;
  }

  initAuthLayout();

  const form = qs('#verify-form');
  const submit = qs('[type="submit"]', form);
  const submitLabel = qs('[data-label]', submit);
  const spinner = qs('[data-spinner]', submit);
  const error = qs('#otp-error');
  const notice = qs('#page-notice');
  const resend = qs('#resend');
  const timer = qs('#resend-timer');
  let busy = false;
  let countdown = null;

  /* ---- copy that depends on why we are here ---- */
  qs('#verify-email').textContent = maskEmail(pending.email);
  if (pending.purpose === 'reset') {
    qs('#back-link').href = routes.forgot;
    qs('#back-label').textContent = 'تعديل الإيميل';
  }

  /* ---- helpers ---- */
  const setError = (message) => {
    qs('[data-error-text]', error).textContent = message;
    error.hidden = !message;
  };

  const setBusy = (value) => {
    busy = value;
    submit.disabled = value;
    spinner.hidden = !value;
    submitLabel.textContent = value ? 'جاري التأكيد…' : 'تأكيد';
    otp.setDisabled(value);
  };

  const showDemoCode = () => {
    const code = otpService.peekDemoCode();
    qs('#demo-code').textContent = code ?? (pending.purpose === 'reset' ? 'مفيش حساب بالإيميل ده (للتجربة بس)' : '—');
    qs('#fill-code').hidden = !code;
  };

  /* ---- resend countdown ---- */
  const tick = () => {
    const left = otpService.resendIn();
    resend.disabled = left > 0;
    timer.textContent = left > 0 ? `(${formatCountdown(left)})` : '';
    if (left === 0) {
      clearInterval(countdown);
      countdown = null;
    }
  };

  const startCountdown = () => {
    clearInterval(countdown);
    tick();
    if (otpService.resendIn() > 0) countdown = setInterval(tick, 1000);
  };

  /* ---- verify ---- */
  async function verify(code) {
    if (busy) return;
    if (code.length < OTP_LENGTH) {
      setError('ادخل الـ 6 أرقام كلهم');
      otp.setState('error');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const result = await authService.verifyOtp(code);
      otp.setState('success');
      showNotice(notice, { tone: 'success', icon: 'circle-check', text: 'تم التأكيد! بنحوّلك دلوقتي…' });
      await wait(700);
      replace(result.purpose === 'signup' ? homeFor('user') : routes.reset);   // a new sign-up is always a user
    } catch (failure) {
      setBusy(false);
      otp.clear();                      // (clearing resets the state, so mark the error afterwards)
      otp.setState('error');
      setError(failure.message);
    }
  }

  const otp = mountOtpInput(qs('#otp'), {
    length: OTP_LENGTH,
    onChange() {
      // typing again removes the red state
      if (!error.hidden) setError('');
      otp.setState(null);
    },
    onComplete: verify,
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    verify(otp.value());
  });

  /* ---- resend ---- */
  resend.addEventListener('click', async () => {
    resend.disabled = true;
    try {
      await otpService.resend();
      otp.clear();
      setError('');
      showNotice(notice, { tone: 'success', icon: 'mail-check', text: 'بعتنالك كود جديد على الإيميل.' });
      showDemoCode();
    } catch (failure) {
      setError(failure.message);
    }
    startCountdown();
  });

  /* ---- demo helper ---- */
  qs('#fill-code').addEventListener('click', () => {
    const code = otpService.peekDemoCode();
    if (code) otp.setValue(code);
    otp.focus(OTP_LENGTH - 1);
  });

  showDemoCode();
  startCountdown();
  otp.focus();
});

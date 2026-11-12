/**
 * Form validators — every function returns an error message ("" when the value is valid).
 * Messages are written for the person filling the form, in the app's voice.
 */

import { onlyDigits, toLatinDigits } from './format.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s'’.-]*$/u;      // letters (Arabic / Latin), spaces, ' . -
const EGYPT_MOBILE = /^(?:\+?20|0)?1[0125]\d{8}$/;      // 010 / 011 / 012 / 015 + 8 digits
const INTERNATIONAL = /^\+\d{8,15}$/;

/** Egyptian tax registration number = exactly 9 digits (e.g. 100-492-657). */
export const TAX_ID_LENGTH = 9;

export const normalizePhone = (value) => toLatinDigits(value).replace(/[\s()-]/g, '');

/** Luhn checksum — catches typos in card numbers. */
export function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export const validators = {
  required: (label) => (value) => (String(value).trim() ? '' : `اكتب ${label}`),

  personName: (label) => (value) => {
    const text = String(value).trim();
    if (!text) return `اكتب ${label}`;
    if (text.length < 2) return `${label} قصير أوي`;
    if (!NAME_PATTERN.test(text)) return `${label} لازم يكون حروف بس`;
    return '';
  },

  email: (value) => {
    const text = String(value).trim();
    if (!text) return 'اكتب البريد الإلكتروني';
    if (!EMAIL_PATTERN.test(text)) return 'البريد الإلكتروني مش مكتوب صح (مثال: name@company.com)';
    return '';
  },

  /** Sign-up / reset: at least 8 characters with a letter and a digit. */
  newPassword: (value) => {
    if (!value) return 'اكتب كلمة المرور';
    if (value.length < 8) return 'كلمة المرور لازم تكون 8 حروف أو أرقام على الأقل';
    if (!/[A-Za-z؀-ۿ]/.test(value) || !/\d/.test(value)) return 'لازم تحتوي على حروف وأرقام';
    return '';
  },

  password: (value) => (value ? '' : 'اكتب كلمة المرور'),

  confirmPassword: (value, all) => {
    if (!value) return 'أكّد كلمة المرور';
    return value === all.password ? '' : 'كلمتين المرور مش متطابقتين';
  },

  phone: (value) => {
    const phone = normalizePhone(value);
    if (!phone) return 'اكتب رقم الموبايل';
    if (EGYPT_MOBILE.test(phone) || INTERNATIONAL.test(phone)) return '';
    return 'رقم الموبايل مش صحيح (مثال: 01012345678)';
  },

  taxId: (value) => {
    const digits = onlyDigits(value);
    if (!digits) return 'اكتب رقم التسجيل الضريبي';
    if (digits.length !== TAX_ID_LENGTH) return `رقم التسجيل الضريبي لازم يكون ${TAX_ID_LENGTH} أرقام`;
    return '';
  },

  /** Visa only: starts with 4, 16 digits, valid Luhn. */
  visaNumber: (value) => {
    const digits = onlyDigits(value);
    if (!digits) return 'اكتب رقم الكارت';
    if (!digits.startsWith('4')) return 'الدفع متاح بكروت Visa بس (بيبدأ بـ 4)';
    if (digits.length !== 16) return 'رقم الكارت لازم يكون 16 رقم';
    if (!passesLuhn(digits)) return 'رقم الكارت مش صحيح، راجعه تاني';
    return '';
  },

  cardholder: (value) => {
    const text = String(value).trim();
    if (!text) return 'اكتب الاسم زي ما هو مكتوب على الكارت';
    if (!/^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(text)) return 'الاسم لازم يكون بالإنجليزي زي الكارت';
    return '';
  },

  expiry: (value, _all, now = new Date()) => {
    const match = /^(\d{2})\/(\d{2})$/.exec(String(value));
    if (!match) return 'اكتب التاريخ بصيغة MM/YY';
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) return 'الشهر لازم يكون من 01 لـ 12';
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    return endOfMonth < now ? 'الكارت منتهي' : '';
  },

  cvv: (value) => {
    const digits = onlyDigits(value);
    if (!digits) return 'اكتب كود CVV';
    return digits.length === 3 ? '' : 'كود CVV من 3 أرقام';
  },
};

/**
 * Password strength for the meter under the field.
 * @returns {{ score: 0|1|2|3|4, label: string }}
 */
export function passwordStrength(value) {
  if (!value) return { score: 0, label: '' };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z؀-ۿ]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9؀-ۿ]/.test(value)) score += 1;
  if (value.length < 8) score = Math.min(score, 1);
  const labels = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'];
  const clamped = Math.max(1, Math.min(4, score));
  return { score: clamped, label: labels[clamped] };
}

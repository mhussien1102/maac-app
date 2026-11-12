/**
 * Formatting helpers.
 */

const arabicNumber = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });

/** 4656250 → "٤٬٦٥٦٬٢٥٠" (Eastern Arabic digits, as shown in the assistant answers). */
export const formatNumberAr = (value) => arabicNumber.format(value);

/** First N words of a text — used to build a conversation title. */
export function truncateWords(text, maxWords = 6) {
  const words = String(text).trim().split(/\s+/);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}…` : words.join(' ');
}

/** "report.final.PDF" → "pdf" */
export const getExtension = (fileName) => {
  const match = /\.([^.]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : '';
};

/**
 * First letter of a person's name for an avatar. The Arabic definite article is
 * skipped, so "المدير" → "م" (not "ا").
 */
export const initialOf = (name) => {
  const clean = String(name ?? '').trim().replace(/^ال(?=\S)/, '');
  return (clean.charAt(0) || '?').toUpperCase();
};

/* ---- Digits, phone, card & money helpers (forms + payment) ---------------- */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** "٠١٠١٢٣" / "۰۱۰۱۲۳" → "010123" (people often type with an Arabic keyboard). */
export const toLatinDigits = (value) =>
  String(value ?? '').replace(/[٠-٩۰-۹]/g, (ch) => {
    const index = ARABIC_DIGITS.indexOf(ch);
    return String(index >= 0 ? index : PERSIAN_DIGITS.indexOf(ch));
  });

export const onlyDigits = (value) => toLatinDigits(value).replace(/\D/g, '');

/** "4111111111111111" → "4111 1111 1111 1111" */
export const formatCardNumber = (value) => (onlyDigits(value).slice(0, 19).match(/.{1,4}/g) ?? []).join(' ');

/** "1229" → "12/29" */
export const formatExpiry = (value) => {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** "100492657" → "100-492-657" (Egyptian tax registration number: 9 digits) */
export const formatTaxId = (value) => (onlyDigits(value).slice(0, 9).match(/.{1,3}/g) ?? []).join('-');

/** "01012345678" stays as typed (digits, spaces and + only). */
export const formatPhone = (value) => toLatinDigits(value).replace(/[^\d+\s]/g, '').slice(0, 18);

/** 568.86 → "568.86 ج.م" · 499 → "499 ج.م" */
export const formatMoney = (amount, currency = 'ج.م') => {
  const n = Number(amount);
  const digits = Number.isInteger(n) ? 0 : 2;            // 4,990  /  5,688.60
  return `${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`.trim();
};

/** Date → "11 ديسمبر 2026" (Latin digits, Arabic month names). */
export const formatDateAr = (value) =>
  new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

/** "ahmed@outlook.com" → "a***d@outlook.com" */
export const maskEmail = (email) => {
  const [name = '', domain = ''] = String(email).split('@');
  if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
  return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
};

/** "mm:ss" for the resend countdown. */
export const formatCountdown = (seconds) => {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

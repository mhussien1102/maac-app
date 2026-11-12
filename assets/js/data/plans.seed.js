/**
 * Subscription plans — DEMO prices, replace with the real ones (or load them from the API).
 */

export const CURRENCY = 'ج.م';
export const VAT_RATE = 0.14;        // Egyptian VAT

export const PLANS = [
  {
    id: 'monthly',
    name: 'شهري',
    months: 1,
    price: 499,
    perks: ['أسئلة غير محدودة على ملفاتك', 'رفع ملفات PDF وExcel وWord وصور', 'تصدير النتائج'],
  },
  {
    id: 'yearly',
    name: 'سنوي',
    months: 12,
    price: 4990,
    badge: 'وفّر شهرين',
    perks: ['كل مميزات الباقة الشهرية', 'الدفع مرة واحدة في السنة', 'أولوية في الدعم'],
  },
];

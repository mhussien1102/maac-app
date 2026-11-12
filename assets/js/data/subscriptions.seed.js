/**
 * Sample subscribers for the admin "عرض الاشتراكات" page (DEMO ONLY).
 * They are listed AFTER the people who really signed up in this browser, so the page is never empty.
 * Set SHOW_SAMPLE_SUBSCRIBERS to false (or delete this file) to see only real sign-ups.
 *
 * status: 'paid' | 'pending' | 'expired'   ·   plan: 'yearly' | 'monthly'
 */
export const SHOW_SAMPLE_SUBSCRIBERS = true;

export const SAMPLE_SUBSCRIPTIONS = [
  { id: 's-1', name: 'سارة علي', detail: 'مكتب علي للمراجعة', plan: 'monthly', status: 'paid', start: '2026-10-20', end: '2026-11-20' },
  { id: 's-2', name: 'شركة النور', detail: 'finance@alnour.example', plan: 'yearly', status: 'pending', start: '2026-11-05', end: '2027-11-05' },
  { id: 's-3', name: 'محمد حسن', detail: 'mohamed@hassan.example', plan: 'monthly', status: 'expired', start: '2026-09-01', end: '2026-10-01' },
  { id: 's-4', name: 'منى إبراهيم', detail: 'mona@ibrahim.example', plan: 'yearly', status: 'expired', start: '2025-10-15', end: '2026-10-15' },
];

/**
 * Demo account for the login screen.
 * ---------------------------------------------------------------------------
 * ⚠️ DEMO ONLY. A real application must NEVER ship passwords (or password
 *    checks) to the browser: delete this file together with the mock
 *    services (accounts / otp / auth) and let the server own all of it.
 */

export const DEMO_USER = {
  id: 'u-demo',
  firstName: 'أحمد',
  lastName: 'محمود',
  email: 'user@maac.com',
  password: 'User@123',
  phone: '01012345678',
  jobTitle: 'محاسب',
  company: 'شركة النور للتجارة',
  taxId: '100492657',
};

/**
 * Admin accounts — an e-mail in this list signs in to the ADMIN area (/admin/…).
 * Every other e-mail is a normal user (/app/…). Add more admins here.
 * ⚠️ DEMO ONLY: in production the server decides the role; never ship admin passwords.
 */
export const ADMIN_USERS = [
  {
    id: 'u-admin',
    email: 'admin@maac.com',
    password: 'Admin@123',
    name: 'المدير',
    title: 'Admin',
  },
];

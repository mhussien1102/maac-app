/**
 * Admins service — who is an administrator.
 *
 * ⚠️ MOCK: admin accounts come from data/users.seed.js. With a real back-end the
 * server returns the role in the login response (and puts it in the session
 * token) — delete this file and read `user.role` from that response instead.
 *
 * E-mails of admins are RESERVED: nobody can register a normal account with one,
 * and the "forgot password" flow never issues a code for them.
 */

import { ADMIN_USERS } from '../data/users.seed.js';

const normalize = (email) => String(email).trim().toLowerCase();

export const adminsService = {
  isAdminEmail(email) {
    return ADMIN_USERS.some((admin) => admin.email === normalize(email));
  },

  /** @returns the admin record when e-mail AND password match, otherwise null */
  check(email, password) {
    return ADMIN_USERS.find((admin) => admin.email === normalize(email) && admin.password === password) ?? null;
  },
};

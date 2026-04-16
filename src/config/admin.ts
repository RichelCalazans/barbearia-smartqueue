/**
 * Central list of Super Admin emails.
 *
 * Any email in this list is granted SUPER_ADMIN access both on the client
 * (useAuth, ConfigService) and on the server (firestore.rules must mirror
 * this list manually — Firestore rules cannot import TS files).
 *
 * To change: update this file, then mirror the change in firestore.rules
 * (`isSuperAdmin` function) and redeploy rules with `firebase deploy --only firestore:rules`.
 */
export const SUPER_ADMIN_EMAILS = [
  'richelcalazans6@gmail.com',
  'teste@teste.com',
] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (SUPER_ADMIN_EMAILS as readonly string[]).includes(email);
}

/** Default barber email used as fallback in app config. */
export const DEFAULT_BARBER_EMAIL = SUPER_ADMIN_EMAILS[0];

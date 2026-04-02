/**
 * Логика SwiftifyPlus (срок plus_expires_at в app_metadata / user_metadata).
 * Согласована с `src/lib/userProfile.ts`.
 */
export function userHasPlusAccess(user) {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata ?? {};

  const marked =
    meta.swiftify_plus === true ||
    app.swiftify_plus === true ||
    meta.swiftify_pro === true ||
    app.swiftify_pro === true ||
    meta.plan === 'plus' ||
    meta.subscription === 'plus' ||
    meta.plan === 'pro' ||
    meta.subscription === 'pro' ||
    app.plan === 'plus' ||
    app.subscription === 'plus' ||
    app.plan === 'pro' ||
    app.subscription === 'pro';

  if (!marked) return false;

  const expRaw = app.plus_expires_at ?? meta.plus_expires_at;
  if (typeof expRaw === 'string' && expRaw.length > 0) {
    const t = Date.parse(expRaw);
    if (!Number.isNaN(t) && t <= Date.now()) return false;
  }
  return true;
}

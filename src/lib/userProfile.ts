import type { User } from '@supabase/supabase-js';

/** Подписка SwiftifyPlus: флаги в metadata; если задан plus_expires_at — проверяется срок. */
export function hasSwiftifyPlus(user: User): boolean {
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata as Record<string, unknown> | undefined;

  const marked =
    meta.swiftify_plus === true ||
    app?.swiftify_plus === true ||
    meta.swiftify_pro === true ||
    app?.swiftify_pro === true ||
    meta.plan === 'plus' ||
    meta.subscription === 'plus' ||
    meta.plan === 'pro' ||
    meta.subscription === 'pro' ||
    app?.plan === 'plus' ||
    app?.subscription === 'plus' ||
    app?.plan === 'pro' ||
    app?.subscription === 'pro';

  if (!marked) return false;

  const expRaw = app?.plus_expires_at ?? meta.plus_expires_at;
  if (typeof expRaw === 'string' && expRaw.length > 0) {
    const t = Date.parse(expRaw);
    if (!Number.isNaN(t) && t <= Date.now()) return false;
  }
  return true;
}

/**
 * Имя (Google OAuth) или почта (регистрация по email).
 */
export function getProfilePrimaryLabel(user: User): string {
  const viaGoogle = user.identities?.some((i) => i.provider === 'google');
  const meta = user.user_metadata ?? {};
  if (viaGoogle) {
    const name = meta.full_name ?? meta.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return user.email?.trim() || '—';
}

export function getSubscriptionBadge(user: User): { isPlus: boolean; label: string } {
  const isPlus = hasSwiftifyPlus(user);
  if (!isPlus) {
    return { isPlus: false, label: 'Пробный период' };
  }
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const expRaw = (app?.plus_expires_at ?? meta.plus_expires_at) as string | undefined;
  if (typeof expRaw === 'string' && expRaw.length > 0) {
    const d = new Date(expRaw);
    if (!Number.isNaN(d.getTime())) {
      return { isPlus: true, label: `Plus до ${d.toLocaleDateString('ru-RU')}` };
    }
  }
  return { isPlus: true, label: 'SwiftifyPlus' };
}

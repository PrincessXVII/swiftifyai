import type { User } from '@supabase/supabase-js';

/** Признак подписки SwiftifyPro в метаданных Supabase (задаётся с бэкенда или вручную в Dashboard). */
function hasSwiftifyPro(user: User): boolean {
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata as Record<string, unknown> | undefined;
  if (meta.swiftify_pro === true || app?.swiftify_pro === true) return true;
  if (meta.plan === 'pro' || meta.subscription === 'pro') return true;
  if (app?.plan === 'pro' || app?.subscription === 'pro') return true;
  return false;
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

export function getSubscriptionBadge(user: User): { isPro: boolean; label: string } {
  const isPro = hasSwiftifyPro(user);
  return {
    isPro,
    label: isPro ? 'SwiftifyPro' : 'Пробный период',
  };
}

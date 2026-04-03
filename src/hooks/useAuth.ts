import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

/** Не чаще одного успешного refresh подряд (метаданные вроде Plus подтягиваются без перелогина). */
const METADATA_SYNC_MIN_MS = 45_000;
/** Пока вкладка открыта — дополнительная подстраховка для долгих сессий. */
const METADATA_SYNC_POLL_MS = 4 * 60_000;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const lastMetadataSyncOkAt = useRef(0);

  const applyRefreshedSession = useCallback((next: Session) => {
    lastMetadataSyncOkAt.current = Date.now();
    setSession(next);
    setUser(next.user);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          applyRefreshedSession(data.session);
        } else {
          setSession(s);
          setUser(s.user);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [applyRefreshedSession]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const syncMetadataFromServer = async () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMetadataSyncOkAt.current < METADATA_SYNC_MIN_MS) return;

      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!s) return;

      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        applyRefreshedSession(data.session);
      }
    };

    const onVisibleOrFocus = () => void syncMetadataFromServer();

    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener('focus', onVisibleOrFocus);
    const pollId = window.setInterval(() => void syncMetadataFromServer(), METADATA_SYNC_POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener('focus', onVisibleOrFocus);
      window.clearInterval(pollId);
    };
  }, [applyRefreshedSession]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      applyRefreshedSession(data.session);
    }
  }, [applyRefreshedSession]);

  return {
    session,
    user,
    loading,
    signOut,
    refreshSession,
    /** false → вход не настроен, главная ведёт себя как раньше (только «Начать»). */
    isConfigured: isSupabaseConfigured,
  };
}

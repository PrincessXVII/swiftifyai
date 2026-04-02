import { getSupabaseClient } from '../lib/supabase';

/** Singleton from `lib/supabase` — same client as auth. May be null if env is incomplete. */
export const supabase = getSupabaseClient();

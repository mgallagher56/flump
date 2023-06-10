import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

export const getSupaBaseUrl = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_URL : window?.env?.SUPABASE_URL;
export const getSupabaseAnonKey = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_ANON_KEY : window?.env?.SUPABASE_ANON_KEY;

export default createClient(getSupaBaseUrl(isServer), getSupabaseAnonKey(isServer));

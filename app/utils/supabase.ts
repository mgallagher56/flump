import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';
const mode = process.env.NODE_ENV;

const getSeverUrl = () => {
  if (mode === 'test') return process.env.SUPABASE_URL_STAGING;
  return process.env.SUPABASE_URL;
};

const getClientUrl = () => {
  if (mode === 'test') return window?.env?.SUPABASE_URL_STAGING;
  return window?.env?.SUPABASE_URL;
};

const getServerAnonKey = () => {
  if (mode === 'test') return process.env.SUPABASE_ANON_KEY_STAGING;
  return process.env.SUPABASE_ANON_KEY;
};

const getClientAnonKey = () => {
  if (mode === 'test') return window?.env?.SUPABASE_ANON_KEY_STAGING;
  return window?.env?.SUPABASE_ANON_KEY;
};

const supabaseUrl = isServer ? getSeverUrl() : getClientUrl();

const supabaseAnonKey = isServer ? getServerAnonKey() : getClientAnonKey();

export default createClient(supabaseUrl, supabaseAnonKey);

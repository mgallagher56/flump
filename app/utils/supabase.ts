import { createClient } from "@supabase/supabase-js";

const isServer = typeof window === "undefined";
const mode = process.env.NODE_ENV;
const serverUrl = mode === "test" ? process.env.SUPABASE_URL_STAGING : process.env.SUPABASE_URL;
const clientUrl = mode === "test" ? window.env.SUPABASE_URL_STAGING : window.env.SUPABASE_URL;
const serverAnonKey = mode === "test" ? process.env.SUPABASE_ANON_KEY_STAGING : process.env.SUPABASE_ANON_KEY;
const clientAnonKey = mode === "test" ? window.env.SUPABASE_ANON_KEY_STAGING : window.env.SUPABASE_ANON_KEY;

const supabaseUrl = isServer
  ? serverUrl
  : clientUrl;

const supabaseAnonKey = isServer
  ? serverAnonKey
  : clientAnonKey;

export default createClient(supabaseUrl, supabaseAnonKey);

import { createBrowserClient, createServerClient } from '@supabase/auth-helpers-remix';

import type { Database } from 'db_types';

const isServer = typeof window === 'undefined';

export const getSupaBaseUrl = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_URL : window?.env?.SUPABASE_URL;
export const getSupabaseAnonKey = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_ANON_KEY : window?.env?.SUPABASE_ANON_KEY;

const supabase = createBrowserClient<Database>(getSupaBaseUrl(isServer), getSupabaseAnonKey(isServer));

export const createSupaBaseServerClient = ({ request, response }: { request: Request; response: Response }) =>
  createServerClient<Database>(getSupaBaseUrl(isServer), getSupabaseAnonKey(isServer), { request, response });

export default supabase;

import { createBrowserClient, createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

import type { Database } from 'db_types';

declare global {
  interface Window {
    env: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

const isServer = typeof window === 'undefined';

export const getSupaBaseUrl = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_URL : window?.env?.SUPABASE_URL;
export const getSupabaseAnonKey = (isServer: boolean): string =>
  isServer ? process.env.SUPABASE_ANON_KEY : window?.env?.SUPABASE_ANON_KEY;

const supabase = createBrowserClient<Database>(getSupaBaseUrl(isServer), getSupabaseAnonKey(isServer));

export const createSupaBaseServerClient = (request: Request) => {
  const headers = new Headers();

  return createServerClient<Database>(getSupaBaseUrl(isServer), getSupabaseAnonKey(isServer), {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
        });
      }
    }
  });
};

export default supabase;

declare global {
  interface Window {
    env: {
      ENVIRONMENT: string;
      DEFAULT_LOCALE: string;
      SITE_URL: string;
      NODE_ENV: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      SUPABASE_URL_STAGING: string;
      SUPABASE_ANON_KEY_STAGING: string;
    };
  }
}

export {}

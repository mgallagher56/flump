declare global {
  interface Window {
    env: {
      ENVIRONMENT: string;
      DEFAULT_LOCALE: string;
      SITE_URL: string;
      NODE_ENV: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

export {};

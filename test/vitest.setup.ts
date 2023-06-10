if (!global.window) global.window = {} as any;
Object.defineProperty(window, 'env', {
  value: {
    SUPABASE_URL: 'http://localhost:8000',
    SUPABASE_ANON_KEY: 'anon-key'
  }
});

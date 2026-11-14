// Plain constants with no React or Panda imports, so the marketing Vite config can inline the
// theme script into index.html (see apps/marketing/vite.config.ts).

/**
 * localStorage key for the theme choice, shared by the web app and the marketing site. Storage is
 * per origin, so the choice is remembered on each site separately.
 */
export const THEME_STORAGE_KEY = "flump-theme";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Inline script for <head>: applies the stored (or system) theme to <html> before first paint so
 * the wrong theme never flashes. Both apps inline this exact string.
 */
export const THEME_INIT_SCRIPT = `
  (function() {
    try {
      var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
      var theme = (stored === 'light' || stored === 'dark')
        ? stored
        : (window.matchMedia('${DARK_QUERY}').matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

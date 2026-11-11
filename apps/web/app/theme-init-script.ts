/** Applies the stored (or system) theme to <html> before first paint, preventing a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `
  (function() {
    try {
      var stored = localStorage.getItem('flump-theme');
      var theme = (stored === 'light' || stored === 'dark')
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

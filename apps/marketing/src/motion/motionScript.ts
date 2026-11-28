// Plain constants with no React or Panda imports, so the Vite config can inline the script into
// index.html beside the theme script (see vite.config.ts), as packages/ui's themeScript does.

/**
 * localStorage key for the header's "Reduce motion" choice (UX-GUIDELINES MK14): `reduce` while
 * it is on, absent otherwise. The marketing site only; storage is per origin.
 */
export const MOTION_STORAGE_KEY = "flump-motion";

/** The `<html>` attribute it sets: `REDUCE_MOTION_ATTRIBUTE` in `@repo/ui`'s reduced-motion hook. */
export const MOTION_ATTRIBUTE = "data-motion";

/**
 * Inline script for `<head>`, run in the same tag as the theme script: applies a stored "Reduce
 * motion" choice to `<html>` before first paint, so no motion starts and no motion library is
 * requested. Without JavaScript it never runs and the system setting alone applies.
 */
export const MOTION_INIT_SCRIPT = `
  (function() {
    try {
      if (localStorage.getItem('${MOTION_STORAGE_KEY}') === 'reduce') {
        document.documentElement.setAttribute('${MOTION_ATTRIBUTE}', 'reduce');
      }
    } catch(e) {}
  })();
`;

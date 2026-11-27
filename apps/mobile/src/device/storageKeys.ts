/**
 * Every key the app keeps in expo-secure-store besides the refresh token (`auth/tokenStore.ts`),
 * in one place so the reinstall wipe and the storage notice can list them (E12 S9, decided by the
 * coordinator on 27 November 2026).
 */

/** The colour theme choice: "light" or "dark", absent for System. Kept through sign-out, as web's. */
export const THEME_KEY = "flump.theme";

/** "on" while app lock is switched on. Cleared on sign-out, session end and deletion. */
export const DEVICE_LOCK_KEY = "flump.device-lock";

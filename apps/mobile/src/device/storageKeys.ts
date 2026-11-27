/**
 * Every key the app keeps in expo-secure-store besides the refresh token (`auth/tokenStore.ts`),
 * in one place so the reinstall wipe and the storage notice can list them (E12 S9, decided by the
 * coordinator on 27 November 2026).
 */

/** The colour theme choice: "light" or "dark", absent for System. Kept through sign-out, as web's. */
export const THEME_KEY = "flump.theme";

/** "on" while app lock is switched on. Cleared on sign-out, session end and deletion. */
export const DEVICE_LOCK_KEY = "flump.device-lock";

/**
 * The offline cache's AES-256 key (E12 S7), base64. "When unlocked, this device only", so a backup
 * or a copy of the sealed file on another phone cannot be read. Cleared, with the file, on
 * sign-out, session end, deletion, every new sign-in and a launch with no session.
 */
export const OFFLINE_CACHE_KEY = "flump.offline-cache-key";

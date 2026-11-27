/**
 * The colour theme choice on this phone (E12 S9, decided by the coordinator on 27 November 2026):
 * System, Light or Dark, as web's `flump-theme`. Stored under `THEME_KEY` in expo-secure-store, the
 * one store the app has (the choice is not sensitive), with the same keychain option as the refresh
 * token. Read synchronously, so the first frame already has the chosen colours. Kept through
 * sign-out: nothing that signs out touches this key.
 */
import { THEME_KEY } from "./storageKeys";

export type ThemePreference = "system" | "light" | "dark";

/** The order web's one header button cycles through (`ThemeToggle`'s `cycle` variant). */
export const THEME_CYCLE: readonly ThemePreference[] = ["system", "light", "dark"];

export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? "system";
}

/** The expo-secure-store calls this needs, so tests pass a memory store. */
export interface SyncSecureStoreLike {
  getItem(key: string, options: { keychainAccessible: number }): string | null;
  setItemAsync(key: string, value: string, options: { keychainAccessible: number }): Promise<void>;
  deleteItemAsync(key: string, options: { keychainAccessible: number }): Promise<void>;
}

export interface ThemePreferenceStore {
  /** The stored choice, System when none is stored or the store cannot be read. Never throws. */
  read(): ThemePreference;
  /** Stores the choice (System removes it). Never throws: the choice applies while the app runs. */
  write(preference: ThemePreference): Promise<void>;
}

/** `accessible` is expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY, as the token store's. */
export function createThemePreferenceStore(
  store: SyncSecureStoreLike,
  accessible: number,
): ThemePreferenceStore {
  const options = { keychainAccessible: accessible };
  return {
    read() {
      try {
        const value = store.getItem(THEME_KEY, options);
        return value === "light" || value === "dark" ? value : "system";
      } catch {
        // A locked iPhone cannot read the Keychain: follow the phone until it can.
        return "system";
      }
    },
    async write(preference) {
      try {
        if (preference === "system") await store.deleteItemAsync(THEME_KEY, options);
        else await store.setItemAsync(THEME_KEY, preference, options);
      } catch {
        // Not stored: it still applies until the app is closed.
      }
    },
  };
}

/** A store that keeps the choice in memory only: tests, the gallery, and a host without the module. */
export function memoryThemePreferenceStore(
  initial: ThemePreference = "system",
): ThemePreferenceStore {
  let value = initial;
  return {
    read: () => value,
    async write(preference) {
      value = preference;
    },
  };
}

/**
 * The app's store: expo-secure-store with the token store's keychain option. Loaded only when
 * asked for, so a host app without the native module (Expo Go) still opens, following the phone.
 */
export function deviceThemePreferenceStore(): ThemePreferenceStore {
  try {
    const SecureStore: typeof import("expo-secure-store") = require("expo-secure-store");
    return createThemePreferenceStore(SecureStore, SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
  } catch {
    return memoryThemePreferenceStore();
  }
}

/**
 * Every secure store key besides the refresh token (E12 S9): the theme choice, the app lock flag
 * and, since S7, the offline cache's key, cleared together by the iOS reinstall wipe (`reinstall.ts`). Sign-out keeps the theme, so
 * it does not use this.
 */
import { DEVICE_LOCK_KEY, OFFLINE_CACHE_KEY, THEME_KEY } from "../device/storageKeys";
import type { Clearable } from "./reinstall";
import type { SecureStoreLike } from "./tokenStore";

export function deviceKeys(store: SecureStoreLike, accessible: number): Clearable {
  const options = { keychainAccessible: accessible };
  return {
    async clear() {
      let cleared = true;
      for (const key of [THEME_KEY, DEVICE_LOCK_KEY, OFFLINE_CACHE_KEY]) {
        try {
          await store.deleteItemAsync(key, options);
        } catch {
          cleared = false;
        }
      }
      return cleared;
    },
  };
}

/**
 * Where the refresh token lives (plan section 5.2; storage design sent to the coordinator on
 * 25 November 2026). Only the refresh token is stored, under one key, in expo-secure-store: the iOS
 * Keychain as "when unlocked, this device only", and Keystore-encrypted storage on Android, which
 * Auto Backup leaves out while the app has no custom backup config. The access token stays in
 * memory. Nothing here logs or throws a token value.
 */
export const REFRESH_TOKEN_KEY = "flump.auth.refresh-token";

/** The three expo-secure-store calls this needs, so tests pass a memory store. */
export interface SecureStoreLike {
  getItemAsync(key: string, options: { keychainAccessible: number }): Promise<string | null>;
  setItemAsync(key: string, value: string, options: { keychainAccessible: number }): Promise<void>;
  deleteItemAsync(key: string, options: { keychainAccessible: number }): Promise<void>;
}

export interface TokenStore {
  /**
   * The refresh token, or null when none is stored. Rejects when the store cannot be read right now
   * (an iPhone that is still locked): the caller keeps the session and tries again later.
   */
  read(): Promise<string | null>;
  save(refreshToken: string): Promise<void>;
  /** Resolves false when the delete failed; never throws, so sign-out always finishes. */
  clear(): Promise<boolean>;
}

/** `accessible` is expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY, passed in by `authDeps.ts`. */
export function createTokenStore(store: SecureStoreLike, accessible: number): TokenStore {
  const options = { keychainAccessible: accessible };

  /** Deletes the token; if the delete fails, overwrites it with an empty value, which reads as none. */
  async function clear(): Promise<boolean> {
    try {
      await store.deleteItemAsync(REFRESH_TOKEN_KEY, options);
      return true;
    } catch {
      try {
        await store.setItemAsync(REFRESH_TOKEN_KEY, "", options);
        return true;
      } catch {
        return false;
      }
    }
  }

  return {
    async read() {
      // A read error is not deleted on: a locked iPhone throws for a good token. A value that can
      // never be decrypted (a reset Keystore) leaves the person on the offline screen, whose Sign
      // out clears it.
      return (await store.getItemAsync(REFRESH_TOKEN_KEY, options)) || null;
    },
    save: (refreshToken) => store.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, options),
    clear,
  };
}

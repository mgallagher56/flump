/**
 * Where the refresh token lives (plan section 5.2; storage design sent to the coordinator on
 * 25 November 2026). Only the refresh token is stored, under one key, in expo-secure-store: the iOS
 * Keychain as "when unlocked, this device only", and Keystore-encrypted storage on Android, which
 * Auto Backup leaves out while the app has no custom backup config. The access token stays in
 * memory. Nothing here logs or throws a token value.
 */
export const REFRESH_TOKEN_KEY = "flump.auth.refresh-token";
/**
 * Whose session the refresh token belongs to, as a SHA-256 of the WorkOS `sub` (E12 S7): sealed
 * into the offline cache, so one person's file never opens for another. Never the raw `sub`.
 * Saved and cleared with the refresh token.
 */
export const CACHE_OWNER_KEY = "flump.auth.cache-owner";

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
  /** The hashed owner of the stored session (E12 S7), or null. Rejects when the store is locked. */
  readOwner?(): Promise<string | null>;
  /** Saves the hashed owner; on failure removes any older one, so it never names someone else. */
  saveOwner?(owner: string): Promise<void>;
}

/** `accessible` is expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY, passed in by `authDeps.ts`. */
export function createTokenStore(store: SecureStoreLike, accessible: number): TokenStore {
  const options = { keychainAccessible: accessible };

  /** Deletes a key; if the delete fails, overwrites it with an empty value, which reads as none. */
  async function remove(key: string): Promise<boolean> {
    try {
      await store.deleteItemAsync(key, options);
      return true;
    } catch {
      try {
        await store.setItemAsync(key, "", options);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function clear(): Promise<boolean> {
    const token = await remove(REFRESH_TOKEN_KEY);
    const owner = await remove(CACHE_OWNER_KEY);
    return token && owner;
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
    async readOwner() {
      return (await store.getItemAsync(CACHE_OWNER_KEY, options)) || null;
    },
    async saveOwner(owner) {
      try {
        await store.setItemAsync(CACHE_OWNER_KEY, owner, options);
      } catch {
        await remove(CACHE_OWNER_KEY);
      }
    },
  };
}

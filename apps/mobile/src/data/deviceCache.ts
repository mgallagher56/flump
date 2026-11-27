/**
 * The real pieces behind the offline cache (E12 S7): expo-crypto's AES-256-GCM, expo-file-system for
 * the one sealed file, and expo-secure-store for its key. No new native module: both expo-crypto
 * (since S2a) and expo-file-system (since S9) are already in the app. Not unit tested: the cache's
 * tests drive `cacheStore.ts` and `offlineCache.ts` with in-memory stand-ins.
 */
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from "expo-crypto";
import {
  cacheDirectory,
  deleteAsync,
  EncodingType,
  makeDirectoryAsync,
  moveAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import type { SecureStoreLike } from "../auth/tokenStore";
import { type CacheFile, type CacheStore, createCacheStore, type SealingBox } from "./cacheStore";

/**
 * The folder under the app's cache directory: iOS's `Library/Caches` and Android's `cacheDir`, both
 * left out of device backups. The system may empty it when space is short, which only means the
 * next offline start shows the offline screen.
 */
export const CACHE_FOLDER = "offline/";
/** The file's name says nothing about whose figures are in it. */
export const CACHE_FILE = "reads.sealed";

/** IV then ciphertext then tag: 12 and 16 bytes, stated rather than left to the defaults. */
export const SEALED_LAYOUT = { ivLength: 12, tagLength: 16 } as const;

/** Where the sealed file goes, under `cacheDirectory`; null when the platform gives none. */
export function cacheFileUri(directory: string | null | undefined): string | null {
  if (!directory) return null;
  const base = directory.endsWith("/") ? directory : `${directory}/`;
  return `${base}${CACHE_FOLDER}${CACHE_FILE}`;
}

/**
 * expo-crypto loads its AES module as it is imported, and sign-in (`authDeps.ts`) already imports
 * expo-crypto, so any build that signs in carries it.
 */
function createAesBox(): SealingBox {
  return {
    async generateKey() {
      const key = await AESEncryptionKey.generate(AESKeySize.AES256);
      return key.encoded("base64");
    },
    async seal(key, plaintext, associated) {
      const sealed = await aesEncryptAsync(
        plaintext,
        await AESEncryptionKey.import(key, "base64"),
        { additionalData: associated, tagLength: SEALED_LAYOUT.tagLength },
      );
      return sealed.combined("base64");
    },
    async open(key, sealed, associated) {
      return aesDecryptAsync(
        AESSealedData.fromCombined(sealed, SEALED_LAYOUT),
        await AESEncryptionKey.import(key, "base64"),
        { additionalData: associated, output: "bytes" },
      );
    },
  };
}

/**
 * Written whole to a temporary name, then moved over the file: a kill mid-write leaves at most a
 * complete sealed temporary file (never plaintext, never read), not a half file under the real name.
 */
function createCacheFile(uri: string): CacheFile {
  const folder = uri.slice(0, uri.lastIndexOf("/") + 1);
  const temporary = `${uri}.writing`;
  return {
    async read() {
      try {
        return await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
      } catch {
        return null;
      }
    },
    async write(text) {
      await makeDirectoryAsync(folder, { intermediates: true });
      await writeAsStringAsync(temporary, text, { encoding: EncodingType.UTF8 });
      // iOS's move refuses to replace an existing file, so the old one goes first.
      await deleteAsync(uri, { idempotent: true });
      await moveAsync({ from: temporary, to: uri });
    },
    async remove() {
      await deleteAsync(temporary, { idempotent: true });
      await deleteAsync(uri, { idempotent: true });
    },
  };
}

/** The sealed store, or null when the platform gives no cache directory (no offline cache). */
export function createDeviceCacheStore(
  store: SecureStoreLike,
  accessible: number,
): CacheStore | null {
  const box = createAesBox();
  const uri = cacheFileUri(cacheDirectory);
  if (!uri) return null;
  return createCacheStore({ box, file: createCacheFile(uri), store, accessible });
}

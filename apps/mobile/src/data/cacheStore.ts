/**
 * Where the offline cache lives (E12 S7; plan 4.6, O5 seam 4): one file sealed with AES-256-GCM,
 * whose key is kept in expo-secure-store as "when unlocked, this device only". The file sits in the
 * app's cache folder, which neither iOS nor Android backs up, and the key never leaves this phone,
 * so a backup or a copied file opened anywhere else reads as nothing. GCM's tag also refuses a file
 * that was changed: it is dropped, never half read.
 *
 * Everything is injected (`deviceCache.ts` gives the real ones), so every path is tested on Node.
 * Rules it keeps:
 * - Calls run one at a time, in the order made, so a wipe can never be overtaken by a write that
 *   started before it.
 * - A wipe deletes the key first: if the file then cannot be removed, it is unreadable all the same.
 * - Nothing here logs, and no failure carries the file's text or the key.
 */

import type { SecureStoreLike } from "../auth/tokenStore";
import { OFFLINE_CACHE_KEY } from "../device/storageKeys";

/** AES-256-GCM over a base64 key (expo-crypto's AES calls in the app). */
export interface SealingBox {
  /** A new random 256-bit key, base64. */
  generateKey(): Promise<string>;
  /** IV, ciphertext and tag together, base64. */
  seal(key: string, plaintext: Uint8Array, associated: Uint8Array): Promise<string>;
  /** Rejects when the key, the associated data or any byte of `sealed` does not match. */
  open(key: string, sealed: string, associated: Uint8Array): Promise<Uint8Array>;
}

/** The one sealed file: base64 text in, base64 text out. */
export interface CacheFile {
  /** Null when there is no file. */
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
  /** Succeeds when there is no file. */
  remove(): Promise<void>;
}

export interface CacheStore {
  /** The saved text, or null: no file, no key, a locked store, or a file that does not open. */
  read(): Promise<string | null>;
  /** Seals and saves; makes a key first when there is none. Rejects when it could not save. */
  write(text: string): Promise<void>;
  /** Key, then file. Never throws; false when either could not be removed. */
  wipe(): Promise<boolean>;
}

/**
 * Bound into every seal as associated data: a file sealed for another purpose or an older format
 * does not open as this one.
 */
const ASSOCIATED = utf8Encode("Flump offline cache, format 1");

export function createCacheStore(deps: {
  box: SealingBox;
  file: CacheFile;
  store: SecureStoreLike;
  /** expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY. */
  accessible: number;
}): CacheStore {
  const options = { keychainAccessible: deps.accessible };
  let queue: Promise<unknown> = Promise.resolve();

  /** Runs `step` after every call made before it, whatever they came to. */
  function inTurn<T>(step: () => Promise<T>): Promise<T> {
    const run = queue.then(step, step);
    queue = run.catch(() => undefined);
    return run;
  }

  async function removeKey(): Promise<boolean> {
    try {
      await deps.store.deleteItemAsync(OFFLINE_CACHE_KEY, options);
      return true;
    } catch {
      // As the refresh token: an empty value reads as no key.
      try {
        await deps.store.setItemAsync(OFFLINE_CACHE_KEY, "", options);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function removeFile(): Promise<boolean> {
    try {
      await deps.file.remove();
      return true;
    } catch {
      return false;
    }
  }

  async function wipeNow(): Promise<boolean> {
    const keyGone = await removeKey();
    const fileGone = await removeFile();
    return keyGone && fileGone;
  }

  async function readNow(): Promise<string | null> {
    let key: string | null;
    try {
      key = (await deps.store.getItemAsync(OFFLINE_CACHE_KEY, options)) || null;
    } catch {
      // A locked iPhone: nothing can be read now, and nothing is thrown away.
      return null;
    }
    const sealed = await deps.file.read().catch(() => null);
    if (!sealed) return null;
    if (!key) {
      // A file with no key (a restored backup, a reinstall): it can never be read, so it goes.
      await removeFile();
      return null;
    }
    try {
      return utf8Decode(await deps.box.open(key, sealed, ASSOCIATED));
    } catch {
      // Changed, truncated or sealed with another key: drop both.
      await wipeNow();
      return null;
    }
  }

  async function writeNow(text: string): Promise<void> {
    let key = (await deps.store.getItemAsync(OFFLINE_CACHE_KEY, options)) || null;
    if (!key) {
      key = await deps.box.generateKey();
      await deps.store.setItemAsync(OFFLINE_CACHE_KEY, key, options);
    }
    await deps.file.write(await deps.box.seal(key, utf8Encode(text), ASSOCIATED));
  }

  return {
    read: () => inTurn(readNow),
    write: (text) => inTurn(() => writeNow(text)),
    wipe: () => inTurn(wipeNow),
  };
}

/**
 * UTF-8 by hand: Hermes is not promised to carry `TextDecoder`, and names in the cache (an
 * account called "Café") must come back exactly.
 */
export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

/** The inverse of `utf8Encode`; throws on bytes that are not UTF-8. */
export function utf8Decode(bytes: Uint8Array): string {
  let text = "";
  let i = 0;
  const next = () => {
    const byte = bytes[i++];
    if (byte === undefined || (byte & 0xc0) !== 0x80) throw new Error("Not UTF-8");
    return byte & 0x3f;
  };
  while (i < bytes.length) {
    const first = bytes[i++] as number;
    let code: number;
    if (first < 0x80) code = first;
    else if ((first & 0xe0) === 0xc0) code = ((first & 0x1f) << 6) | next();
    else if ((first & 0xf0) === 0xe0) code = ((first & 0x0f) << 12) | (next() << 6) | next();
    else if ((first & 0xf8) === 0xf0) {
      code = ((first & 0x07) << 18) | (next() << 12) | (next() << 6) | next();
    } else throw new Error("Not UTF-8");
    text += String.fromCodePoint(code);
  }
  return text;
}

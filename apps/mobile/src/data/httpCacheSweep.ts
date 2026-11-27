/**
 * Removes what the phone's HTTP cache already holds (E12 S7). Before the API sent `no-store` and the
 * app asked for it (`noStoreFetch.ts`), React Native's HTTP caches kept API answers, balances and
 * names included, in plain files under the app's cache folder:
 * - Android: OkHttp's cache, every file in `http-cache/` (the folder itself is kept for OkHttp);
 * - iOS: the shared URL cache, `Cache.db` with its `-wal` and `-shm` files and `fsCachedData/`, in
 *   the cache folder or the bundle-named folder inside it.
 * Run on every launch, before the session is read, and with every wipe. Never throws: a file that
 * will not go is tried again next time. A file still open by the cache is unlinked; what the cache
 * writes to it afterwards is gone when the app stops, and new answers are no longer stored.
 */

/** The three expo-file-system calls this needs, so tests pass a memory folder. */
export interface SweepFiles {
  cacheDirectory: string | null;
  /** Names in a folder; rejects when there is no such folder. */
  list(uri: string): Promise<string[]>;
  remove(uri: string): Promise<void>;
}

/** OkHttp's folder under the cache directory (React Native's `OkHttpClientProvider`). */
export const ANDROID_HTTP_CACHE = "http-cache/";
/** The URL cache's files on iOS. */
const IOS_URL_CACHE_FILES = ["Cache.db", "Cache.db-wal", "Cache.db-shm", "fsCachedData"];

const listed = (files: SweepFiles, uri: string) => files.list(uri).catch(() => [] as string[]);

async function quietly(step: () => Promise<void>) {
  try {
    await step();
  } catch {
    // Tried again on the next launch or wipe.
  }
}

/** The URL cache's files in `folder`, if it holds them. */
async function sweepUrlCache(files: SweepFiles, folder: string) {
  const names = await listed(files, folder);
  if (!names.includes("Cache.db") && !names.includes("fsCachedData")) return;
  for (const name of IOS_URL_CACHE_FILES) {
    if (names.includes(name)) await quietly(() => files.remove(`${folder}${name}`));
  }
}

export async function sweepHttpCache(files: SweepFiles): Promise<void> {
  const root = files.cacheDirectory;
  if (!root) return;
  const base = root.endsWith("/") ? root : `${root}/`;
  // Android.
  const okHttp = `${base}${ANDROID_HTTP_CACHE}`;
  for (const name of await listed(files, okHttp)) {
    await quietly(() => files.remove(`${okHttp}${name}`));
  }
  // iOS: the cache folder itself, and each folder in it (the bundle-named one).
  await sweepUrlCache(files, base);
  for (const name of await listed(files, base)) {
    if (name === ANDROID_HTTP_CACHE.slice(0, -1)) continue;
    await sweepUrlCache(files, `${base}${name}/`);
  }
}

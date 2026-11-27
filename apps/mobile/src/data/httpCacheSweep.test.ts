import { ANDROID_HTTP_CACHE, type SweepFiles, sweepHttpCache } from "./httpCacheSweep";

/** A memory folder tree: a path ending in "/" is a folder. */
function tree(paths: string[], root = "file:///app/cache/") {
  const entries = new Set(paths.map((p) => `${root}${p}`));
  const removed: string[] = [];
  const files: SweepFiles & { entries: Set<string>; removed: string[] } = {
    entries,
    removed,
    cacheDirectory: root,
    async list(uri) {
      const names = new Set<string>();
      for (const entry of entries) {
        if (!entry.startsWith(uri) || entry === uri) continue;
        names.add(entry.slice(uri.length).split("/")[0] ?? "");
      }
      if (names.size === 0 && ![...entries].some((e) => e === uri)) throw new Error("no folder");
      return [...names];
    },
    async remove(uri) {
      removed.push(uri);
      for (const entry of [...entries]) {
        if (entry === uri || entry.startsWith(`${uri}/`)) entries.delete(entry);
      }
    },
  };
  return files;
}

const ROOT = "file:///app/cache/";

describe("the HTTP cache sweep", () => {
  it("Android: removes every file in OkHttp's http-cache folder and keeps the folder", async () => {
    const files = tree([
      ANDROID_HTTP_CACHE,
      "http-cache/journal",
      "http-cache/3f2a.0",
      "http-cache/3f2a.1",
      "offline/reads.sealed",
    ]);
    await sweepHttpCache(files);
    expect(files.removed.sort()).toEqual(
      [`${ROOT}http-cache/journal`, `${ROOT}http-cache/3f2a.0`, `${ROOT}http-cache/3f2a.1`].sort(),
    );
    expect(files.entries.has(`${ROOT}${ANDROID_HTTP_CACHE}`)).toBe(true);
    expect(files.entries.has(`${ROOT}offline/reads.sealed`)).toBe(true);
  });

  it("iOS: removes the URL cache in the bundle-named folder, and nothing else there", async () => {
    const files = tree([
      "app.flump.mobile/",
      "app.flump.mobile/Cache.db",
      "app.flump.mobile/Cache.db-wal",
      "app.flump.mobile/Cache.db-shm",
      "app.flump.mobile/fsCachedData/",
      "app.flump.mobile/fsCachedData/ABC",
      "app.flump.mobile/other.plist",
      "exports/",
    ]);
    await sweepHttpCache(files);
    expect(files.removed.sort()).toEqual(
      [
        `${ROOT}app.flump.mobile/Cache.db`,
        `${ROOT}app.flump.mobile/Cache.db-wal`,
        `${ROOT}app.flump.mobile/Cache.db-shm`,
        `${ROOT}app.flump.mobile/fsCachedData`,
      ].sort(),
    );
    expect(files.entries.has(`${ROOT}app.flump.mobile/other.plist`)).toBe(true);
  });

  it("iOS: a URL cache right in the cache folder goes too", async () => {
    const files = tree(["Cache.db", "Cache.db-wal", "keep.txt"]);
    await sweepHttpCache(files);
    expect(files.removed.sort()).toEqual([`${ROOT}Cache.db`, `${ROOT}Cache.db-wal`].sort());
  });

  it("a folder without the URL cache is left alone", async () => {
    const files = tree(["exports/", "exports/flump-export.json", "offline/reads.sealed"]);
    await sweepHttpCache(files);
    expect(files.removed).toEqual([]);
  });

  it("never throws: a file that will not go is left for next time, and the rest still go", async () => {
    const files = tree(["http-cache/a.0", "http-cache/b.0"]);
    const remove = files.remove.bind(files);
    files.remove = async (uri) => {
      if (uri.endsWith("a.0")) throw new Error("busy");
      await remove(uri);
    };
    await expect(sweepHttpCache(files)).resolves.toBeUndefined();
    expect(files.entries.has(`${ROOT}http-cache/b.0`)).toBe(false);
  });

  it("does nothing with no cache directory", async () => {
    const files = tree(["http-cache/a.0"]);
    files.cacheDirectory = null;
    await sweepHttpCache(files);
    expect(files.removed).toEqual([]);
  });
});

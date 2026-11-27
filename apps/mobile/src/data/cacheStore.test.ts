/**
 * The sealed offline cache file (E12 S7). The sealing box here is real AES-256-GCM from Node
 * (`testing/nodeAesBox.ts`), so encryption at rest, tampering and a missing key are tested for real.
 */
import { randomBytes } from "node:crypto";
import type { SecureStoreLike } from "../auth/tokenStore";
import { OFFLINE_CACHE_KEY } from "../device/storageKeys";
import { nodeAesBox } from "../testing/nodeAesBox";
import { type CacheFile, createCacheStore, utf8Decode, utf8Encode } from "./cacheStore";
import { CACHE_FILE, CACHE_FOLDER, cacheFileUri } from "./deviceCache";

jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("expo-crypto", () => ({}));

const ACCESSIBLE = 7;

function memoryStore() {
  const values = new Map<string, string>();
  const calls: string[] = [];
  const store: SecureStoreLike & { values: Map<string, string>; calls: string[] } = {
    values,
    calls,
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      calls.push(`set:${key}`);
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      calls.push(`delete:${key}`);
      values.delete(key);
    }),
  };
  return store;
}

function memoryFile() {
  const state: { text: string | null; calls: string[] } = { text: null, calls: [] };
  const file: CacheFile & typeof state = Object.assign(state, {
    read: jest.fn(async () => state.text),
    write: jest.fn(async (text: string) => {
      state.calls.push("write");
      state.text = text;
    }),
    remove: jest.fn(async () => {
      state.calls.push("remove");
      state.text = null;
    }),
  });
  return file;
}

function setup() {
  const store = memoryStore();
  const file = memoryFile();
  const cache = createCacheStore({ box: nodeAesBox, file, store, accessible: ACCESSIBLE });
  return { store, file, cache };
}

const FIGURES = JSON.stringify({ accounts: [{ name: "Café ISA", balance: 12_345.67 }] });

describe("the sealed cache file", () => {
  it("gives back exactly what was saved", async () => {
    const { cache } = setup();
    await cache.write(FIGURES);
    expect(await cache.read()).toBe(FIGURES);
  });

  it("is encrypted at rest: no figure or name is in the file", async () => {
    const { cache, file } = setup();
    await cache.write(FIGURES);
    const raw = Buffer.from(file.text ?? "", "base64").toString("latin1");
    expect(raw).not.toContain("12345.67");
    expect(raw).not.toContain("ISA");
    expect(file.text).not.toContain("ISA");
  });

  it("keeps its key in the secure store, when unlocked and on this device only", async () => {
    const { cache, store } = setup();
    await cache.write(FIGURES);
    expect(store.setItemAsync).toHaveBeenCalledWith(OFFLINE_CACHE_KEY, expect.any(String), {
      keychainAccessible: ACCESSIBLE,
    });
    // 256 bits.
    expect(Buffer.from(store.values.get(OFFLINE_CACHE_KEY) ?? "", "base64")).toHaveLength(32);
  });

  it("reuses the key it has, so saving again does not make a new one", async () => {
    const { cache, store } = setup();
    await cache.write(FIGURES);
    const key = store.values.get(OFFLINE_CACHE_KEY);
    await cache.write("{}");
    expect(store.values.get(OFFLINE_CACHE_KEY)).toBe(key);
    expect(store.calls.filter((c) => c.startsWith("set:"))).toHaveLength(1);
  });

  it("restored onto a phone without its key (a backup), reads as nothing and the file goes", async () => {
    const { cache, store, file } = setup();
    await cache.write(FIGURES);
    store.values.delete(OFFLINE_CACHE_KEY);
    expect(await cache.read()).toBeNull();
    expect(file.text).toBeNull();
  });

  it("opened with another key (copied from another phone), reads as nothing and both go", async () => {
    const { cache, store, file } = setup();
    await cache.write(FIGURES);
    store.values.set(OFFLINE_CACHE_KEY, randomBytes(32).toString("base64"));
    expect(await cache.read()).toBeNull();
    expect(file.text).toBeNull();
    expect(store.values.has(OFFLINE_CACHE_KEY)).toBe(false);
  });

  it("a changed byte fails the GCM tag: dropped, never half read", async () => {
    const { cache, file } = setup();
    await cache.write(FIGURES);
    const bytes = Buffer.from(file.text ?? "", "base64");
    bytes[20] = (bytes[20] ?? 0) ^ 0x01;
    file.text = bytes.toString("base64");
    expect(await cache.read()).toBeNull();
    expect(file.text).toBeNull();
  });

  it("a truncated file (a write cut short) reads as nothing, with no partial data, and both go", async () => {
    const { cache, store, file } = setup();
    await cache.write(FIGURES);
    const bytes = Buffer.from(file.text ?? "", "base64");
    file.text = bytes.subarray(0, bytes.length - 10).toString("base64");
    expect(await cache.read()).toBeNull();
    expect(file.text).toBeNull();
    expect(store.values.has(OFFLINE_CACHE_KEY)).toBe(false);
  });

  it("an empty or garbled file reads as nothing and never throws", async () => {
    for (const garbage of ["AAAA", "not base64 at all", "x"]) {
      const { cache, file } = setup();
      await cache.write(FIGURES);
      file.text = garbage;
      await expect(cache.read()).resolves.toBeNull();
    }
  });

  it("every write uses a fresh nonce: the same figures sealed twice differ, and both open", async () => {
    const { cache, file } = setup();
    await cache.write(FIGURES);
    const first = file.text ?? "";
    await cache.write(FIGURES);
    const second = file.text ?? "";
    expect(second).not.toBe(first);
    // The first 12 bytes are the IV.
    expect(Buffer.from(second, "base64").subarray(0, 12)).not.toEqual(
      Buffer.from(first, "base64").subarray(0, 12),
    );
    expect(await cache.read()).toBe(FIGURES);
  });

  it("a locked store (an iPhone still locked) reads as nothing and throws nothing away", async () => {
    const { cache, store, file } = setup();
    await cache.write(FIGURES);
    (store.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("locked"));
    expect(await cache.read()).toBeNull();
    expect(file.text).not.toBeNull();
    expect(await cache.read()).toBe(FIGURES);
  });

  it("with no file, reads as nothing", async () => {
    const { cache } = setup();
    expect(await cache.read()).toBeNull();
  });
});

describe("wiping the cache", () => {
  it("deletes the key first, then the file", async () => {
    const { cache, store, file } = setup();
    await cache.write(FIGURES);
    const order: string[] = [];
    (store.deleteItemAsync as jest.Mock).mockImplementationOnce(async (key: string) => {
      order.push("key");
      store.values.delete(key);
    });
    (file.remove as jest.Mock).mockImplementationOnce(async () => {
      order.push("file");
      file.text = null;
    });
    expect(await cache.wipe()).toBe(true);
    expect(order).toEqual(["key", "file"]);
    expect(await cache.read()).toBeNull();
  });

  it("a file that will not go is unreadable all the same, since its key is gone", async () => {
    const { cache, file } = setup();
    await cache.write(FIGURES);
    (file.remove as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    expect(await cache.wipe()).toBe(false);
    expect(file.text).not.toBeNull();
    expect(await cache.read()).toBeNull();
  });

  it("a key that will not delete is overwritten with nothing, which reads as no key", async () => {
    const { cache, store } = setup();
    await cache.write(FIGURES);
    (store.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    expect(await cache.wipe()).toBe(true);
    expect(store.values.get(OFFLINE_CACHE_KEY)).toBe("");
  });

  it("never throws, even when nothing can be removed", async () => {
    const { cache, store, file } = setup();
    (store.deleteItemAsync as jest.Mock).mockRejectedValue(new Error("busy"));
    (store.setItemAsync as jest.Mock).mockRejectedValue(new Error("busy"));
    (file.remove as jest.Mock).mockRejectedValue(new Error("busy"));
    await expect(cache.wipe()).resolves.toBe(false);
  });

  it("a write made before a wipe can never land after it: calls run in the order made", async () => {
    const { cache, file } = setup();
    let release: () => void = () => {};
    (file.write as jest.Mock).mockImplementationOnce(
      (text: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            file.calls.push("write");
            file.text = text;
            resolve();
          };
        }),
    );
    const writing = cache.write(FIGURES);
    const wiping = cache.wipe();
    // Let the write reach the file before releasing it.
    await new Promise((resolve) => setImmediate(resolve));
    release();
    await Promise.all([writing, wiping]);
    expect(file.calls).toEqual(["write", "remove"]);
    expect(await cache.read()).toBeNull();
  });
});

describe("UTF-8 by hand", () => {
  it.each(["plain", "Café £1,234.56", "Emoji 😀 and 汉字", ""])(
    "round-trips %j, matching Node's encoder",
    (text) => {
      const bytes = utf8Encode(text);
      expect(Buffer.from(bytes).equals(Buffer.from(text, "utf8"))).toBe(true);
      expect(utf8Decode(bytes)).toBe(text);
    },
  );

  it("refuses bytes that are not UTF-8", () => {
    expect(() => utf8Decode(Uint8Array.from([0xc3]))).toThrow("Not UTF-8");
    expect(() => utf8Decode(Uint8Array.from([0xff]))).toThrow("Not UTF-8");
  });
});

describe("where the file goes", () => {
  it("under the app's cache directory (out of iOS and Android backups), with no name or id in it", () => {
    expect(cacheFileUri("file:///data/user/0/app.flump.mobile/cache/")).toBe(
      `file:///data/user/0/app.flump.mobile/cache/${CACHE_FOLDER}${CACHE_FILE}`,
    );
    expect(cacheFileUri("file:///var/Library/Caches")).toBe(
      `file:///var/Library/Caches/${CACHE_FOLDER}${CACHE_FILE}`,
    );
  });

  it("nowhere when the platform gives no cache directory", () => {
    expect(cacheFileUri(null)).toBeNull();
    expect(cacheFileUri("")).toBeNull();
  });
});

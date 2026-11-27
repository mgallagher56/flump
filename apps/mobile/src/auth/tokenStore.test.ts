import { randomUUID } from "node:crypto";
import {
  CACHE_OWNER_KEY,
  createTokenStore,
  REFRESH_TOKEN_KEY,
  type SecureStoreLike,
} from "./tokenStore";

const ACCESSIBLE = 7; // Stands in for expo-secure-store's WHEN_UNLOCKED_THIS_DEVICE_ONLY.
const token = () => `r_${randomUUID()}`;

function memoryStore() {
  const items = new Map<string, string>();
  const options: unknown[] = [];
  const store: SecureStoreLike = {
    getItemAsync: jest.fn(async (key, opts) => {
      options.push(opts);
      return items.get(key) ?? null;
    }),
    setItemAsync: jest.fn(async (key, value, opts) => {
      options.push(opts);
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key, opts) => {
      options.push(opts);
      items.delete(key);
    }),
  };
  return { store, items, options };
}

describe("the cache owner (E12 S7)", () => {
  it("is saved and read under its own key, and cleared with the token", async () => {
    const { store, items } = memoryStore();
    const tokens = createTokenStore(store, ACCESSIBLE);
    await tokens.save(token());
    await tokens.saveOwner?.("owner_hash");
    expect(items.get(CACHE_OWNER_KEY)).toBe("owner_hash");
    expect(await tokens.readOwner?.()).toBe("owner_hash");
    await tokens.clear();
    expect(items.size).toBe(0);
    expect(await tokens.readOwner?.()).toBeNull();
  });

  it("a save that fails removes the older owner, so it never names someone else", async () => {
    const { store, items } = memoryStore();
    const tokens = createTokenStore(store, ACCESSIBLE);
    await tokens.saveOwner?.("owner_old");
    (store.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error("busy"));
    await tokens.saveOwner?.("owner_new");
    expect(items.has(CACHE_OWNER_KEY)).toBe(false);
    expect(await tokens.readOwner?.()).toBeNull();
  });
});

describe("tokenStore", () => {
  it("saves, reads and deletes the refresh token under one key", async () => {
    const { store, items } = memoryStore();
    const tokens = createTokenStore(store, ACCESSIBLE);
    const value = token();
    await tokens.save(value);
    expect([...items.keys()]).toEqual([REFRESH_TOKEN_KEY]);
    expect(await tokens.read()).toBe(value);
    await tokens.clear();
    expect(items.size).toBe(0);
    expect(await tokens.read()).toBeNull();
  });

  it("uses 'when unlocked, this device only' on every call", async () => {
    const { store, options } = memoryStore();
    const tokens = createTokenStore(store, ACCESSIBLE);
    await tokens.save(token());
    await tokens.read();
    await tokens.saveOwner?.("owner_hash");
    await tokens.readOwner?.();
    await tokens.clear();
    // Save, read, the owner's save and read, then clear's two deletes (token and owner).
    expect(options).toHaveLength(6);
    for (const used of options) expect(used).toEqual({ keychainAccessible: ACCESSIBLE });
  });

  it("a read error is passed on and deletes nothing (a locked iPhone throws for a good token)", async () => {
    const { store } = memoryStore();
    store.getItemAsync = jest.fn(async () => {
      throw new Error("device locked");
    });
    await expect(createTokenStore(store, ACCESSIBLE).read()).rejects.toThrow("device locked");
    expect(store.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("an empty stored value counts as none", async () => {
    const { store, items } = memoryStore();
    items.set(REFRESH_TOKEN_KEY, "");
    expect(await createTokenStore(store, ACCESSIBLE).read()).toBeNull();
  });

  it("when the delete fails, clear overwrites the token with an empty value, which reads as none", async () => {
    const { store, items } = memoryStore();
    const tokens = createTokenStore(store, ACCESSIBLE);
    await tokens.save(token());
    store.deleteItemAsync = jest.fn(async () => {
      throw new Error("keystore busy");
    });
    await expect(tokens.clear()).resolves.toBe(true);
    expect(items.get(REFRESH_TOKEN_KEY)).toBe("");
    expect(await tokens.read()).toBeNull();
  });

  it("clear never throws, and reports false when nothing could be removed", async () => {
    const { store } = memoryStore();
    store.deleteItemAsync = jest.fn(async () => {
      throw new Error("keystore busy");
    });
    store.setItemAsync = jest.fn(async () => {
      throw new Error("keystore busy");
    });
    await expect(createTokenStore(store, ACCESSIBLE).clear()).resolves.toBe(false);
  });
});

/**
 * The real wiring behind the sealed cache (E12 S7), with expo-crypto and expo-file-system mocked:
 * which native calls are made, in which order, with which options. That the native AES itself
 * seals and opens correctly is checked on a device (the coordinator's emulator check); the cipher
 * behaviour in `cacheStore.test.ts` runs on a Node stand-in.
 */
const mockCalls: string[] = [];
const mockFiles = new Map<string, string>();

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///app/cache/",
  EncodingType: { UTF8: "utf8" },
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockCalls.push(`mkdir ${uri}`);
  }),
  writeAsStringAsync: jest.fn(async (uri: string, text: string) => {
    mockCalls.push(`write ${uri}`);
    mockFiles.set(uri, text);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const text = mockFiles.get(uri);
    if (text === undefined) throw new Error("missing");
    return text;
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    mockCalls.push(`delete ${uri}`);
    mockFiles.delete(uri);
  }),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    mockCalls.push(`move ${from} -> ${to}`);
    const text = mockFiles.get(from);
    if (text === undefined) throw new Error("missing");
    if (mockFiles.has(to)) throw new Error("exists");
    mockFiles.set(to, text);
    mockFiles.delete(from);
  }),
}));

const mockFromCombined = jest.fn((sealed: string, layout: unknown) => ({ sealed, layout }));
const mockEncrypt = jest.fn(async (plaintext: Uint8Array, _key: unknown, _opts: unknown) => ({
  combined: async () => `sealed:${Buffer.from(plaintext).toString("base64")}`,
}));
const mockDecrypt = jest.fn(async (data: { sealed: string }) =>
  Uint8Array.from(Buffer.from(data.sealed.replace("sealed:", ""), "base64")),
);
jest.mock("expo-crypto", () => ({
  AESKeySize: { AES256: 256 },
  AESEncryptionKey: {
    generate: jest.fn(async (size: number) => ({ encoded: async () => `key${size}` })),
    import: jest.fn(async (key: string) => ({ key })),
  },
  AESSealedData: { fromCombined: (s: string, l: unknown) => mockFromCombined(s, l) },
  aesEncryptAsync: (p: Uint8Array, k: unknown, o: unknown) => mockEncrypt(p, k, o),
  aesDecryptAsync: (d: { sealed: string }) => mockDecrypt(d),
}));

import type { SecureStoreLike } from "../auth/tokenStore";
import { OFFLINE_CACHE_KEY } from "../device/storageKeys";
import { CACHE_FILE, CACHE_FOLDER, createDeviceCacheStore, SEALED_LAYOUT } from "./deviceCache";

const URI = `file:///app/cache/${CACHE_FOLDER}${CACHE_FILE}`;
const TEMP = `${URI}.writing`;

function secure(): SecureStoreLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => void values.set(key, value),
    deleteItemAsync: async (key) => void values.delete(key),
  };
}

beforeEach(() => {
  mockCalls.length = 0;
  mockFiles.clear();
  jest.clearAllMocks();
});

describe("the device cache store", () => {
  it("writes to a temporary name, removes the old file, then moves the new one over it", async () => {
    const store = createDeviceCacheStore(secure(), 7);
    await store?.write("{}", "owner_a");
    expect(mockCalls).toEqual([
      `mkdir file:///app/cache/${CACHE_FOLDER}`,
      `write ${TEMP}`,
      `delete ${URI}`,
      `move ${TEMP} -> ${URI}`,
    ]);
    expect(mockFiles.has(TEMP)).toBe(false);
    expect(mockFiles.get(URI)).toMatch(/^sealed:/);
  });

  it("a second write replaces the first (iOS's move refuses an existing file)", async () => {
    const store = createDeviceCacheStore(secure(), 7);
    await store?.write('{"a":1}', "owner_a");
    await store?.write('{"a":2}', "owner_a");
    expect(await store?.read("owner_a")).toBe('{"a":2}');
  });

  it("a write cut short before the move leaves no file under the real name", async () => {
    const fs = jest.requireMock("expo-file-system/legacy");
    fs.moveAsync.mockRejectedValueOnce(new Error("killed"));
    const store = createDeviceCacheStore(secure(), 7);
    await expect(store?.write("{}", "owner_a")).rejects.toThrow("killed");
    expect(mockFiles.has(URI)).toBe(false);
    expect(await store?.read("owner_a")).toBeNull();
  });

  it("makes a 256-bit key, seals with the stated tag length and associated data, opens with the stated layout", async () => {
    const keys = secure();
    const store = createDeviceCacheStore(keys, 7);
    await store?.write("{}", "owner_a");
    expect(keys.values.get(OFFLINE_CACHE_KEY)).toBe("key256");
    const sealOptions = mockEncrypt.mock.calls[0]?.[2] as {
      tagLength: number;
      additionalData: Uint8Array;
      nonce?: unknown;
    };
    expect(sealOptions.tagLength).toBe(16);
    // No nonce passed: expo-crypto makes a fresh random one on every call.
    expect(sealOptions.nonce).toBeUndefined();
    expect(Buffer.from(sealOptions.additionalData).toString()).toBe(
      "Flump offline cache, format 2, owner_a",
    );
    expect(await store?.read("owner_a")).toBe("{}");
    expect(mockFromCombined).toHaveBeenCalledWith(expect.any(String), SEALED_LAYOUT);
    expect(SEALED_LAYOUT).toEqual({ ivLength: 12, tagLength: 16 });
  });

  it("wiping removes the temporary file too, and the key", async () => {
    const keys = secure();
    const store = createDeviceCacheStore(keys, 7);
    await store?.write("{}", "owner_a");
    mockFiles.set(TEMP, "left over");
    await store?.wipe();
    expect(mockFiles.size).toBe(0);
    expect(keys.values.has(OFFLINE_CACHE_KEY)).toBe(false);
  });
});

/**
 * Nothing of the offline cache survives a session's end (E12 S7): the real session controller, the
 * real offline cache and the real sealed store (with Node's AES-256-GCM standing in for
 * expo-crypto's), wired as `authDeps.ts` wires them, over an in-memory secure store and file. After
 * each way out, the sealed file and its key are gone, and a fresh read gives nothing.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type { QueryClient } from "@tanstack/react-query";
import { type CacheFile, createCacheStore, type SealingBox } from "../data/cacheStore";
import { testQueryClient } from "../data/fakeApi";
import { CACHED_READS, createOfflineCache } from "../data/offlineCache";
import type { TokenResult, WorkosClient } from "../data/workos";
import { OFFLINE_CACHE_KEY } from "../device/storageKeys";
import { household } from "../features/check-in/checkInTestData";
import { readQuery } from "./authorizeUrl";
import { type AccountCheck, createSession, type Session } from "./session";
import { createTokenStore, type SecureStoreLike } from "./tokenStore";

const box: SealingBox = {
  generateKey: async () => randomBytes(32).toString("base64"),
  async seal(key, plaintext, associated) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
    cipher.setAAD(associated);
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64");
  },
  async open(key, sealed, associated) {
    const all = Buffer.from(sealed, "base64");
    const d = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), all.subarray(0, 12));
    d.setAAD(associated);
    d.setAuthTag(all.subarray(all.length - 16));
    return new Uint8Array(Buffer.concat([d.update(all.subarray(12, all.length - 16)), d.final()]));
  },
};

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const tokensFor = (sub: string) => ({
  accessToken: `${b64({ alg: "none" })}.${b64({ sub, sid: `sid_${randomUUID()}` })}.x`,
  refreshToken: `r_${randomUUID()}`,
});

function device() {
  const secure = new Map<string, string>();
  const store: SecureStoreLike = {
    getItemAsync: async (key) => secure.get(key) ?? null,
    setItemAsync: async (key, value) => void secure.set(key, value),
    deleteItemAsync: async (key) => void secure.delete(key),
  };
  const disk: { text: string | null } = { text: null };
  const file: CacheFile = {
    read: async () => disk.text,
    write: async (text) => {
      disk.text = text;
    },
    remove: async () => {
      disk.text = null;
    },
  };
  const cacheStore = createCacheStore({ box, file, store, accessible: 7 });
  const cache = createOfflineCache({ store: cacheStore, now: () => Date.now() });
  return { secure, store, disk, cacheStore, cache };
}

const h = household();
const ANSWERS: Record<keyof typeof CACHED_READS, unknown> = {
  accounts: h.accounts.map(({ details: _details, ...account }) => account),
  accountDetails: h.details,
  userProfile: h.profile,
  checkIns: h.checkIns,
  budgetEntries: h.budgetEntries,
};

/** Every read answered as a live fetch, while the session saves, then the save settles. */
async function readEverything(queryClient: QueryClient) {
  for (const [name, read] of Object.entries(CACHED_READS)) {
    await queryClient.fetchQuery({
      queryKey: read.key,
      queryFn: async () => ANSWERS[name as keyof typeof CACHED_READS],
    });
  }
  await new Promise((resolve) => setImmediate(resolve));
}

function wired(
  over: { refresh?: () => Promise<TokenResult>; account?: () => Promise<AccountCheck> } = {},
) {
  const d = device();
  const tokens = createTokenStore(d.store, 7);
  const exchangeCode = jest.fn(
    async (): Promise<TokenResult> => ({ ok: true, tokens: tokensFor("user_a") }),
  );
  const refresh = jest.fn(
    over.refresh ?? (async (): Promise<TokenResult> => ({ ok: true, tokens: tokensFor("user_a") })),
  );
  const session: Session = createSession({
    config: {
      authBaseUrl: "https://auth.test.invalid",
      clientId: "client_TESTONLY",
      redirectUri: "flump://auth/callback",
    },
    crypto: {
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
      sha256: async (t) => new Uint8Array(createHash("sha256").update(t, "ascii").digest()),
    },
    workos: { exchangeCode, refresh } as unknown as WorkosClient,
    tokens,
    openBrowser: async (url) => {
      const q = readQuery(url.split("?")[1] ?? "");
      return { type: "success", url: `flump://auth/callback?code=c1&state=${q.state}` };
    },
    checkAccount: over.account ?? (async () => "ok"),
    endServerSession: async () => "ended",
    clearCache: () => d.cache.wipe(),
  });
  const queryClient = testQueryClient();
  const stop = d.cache.watch(queryClient, () => session.getState().status === "signedIn");
  return { ...d, session, queryClient, stop, exchangeCode, refresh };
}

/** Signed in, every read saved: the sealed file and its key are on the device. */
async function signedInWithCache(w: ReturnType<typeof wired>) {
  await w.session.restore();
  await w.session.signIn();
  expect(w.session.getState()).toEqual({ status: "signedIn" });
  await readEverything(w.queryClient);
  expect(w.disk.text).not.toBeNull();
  expect(w.secure.get(OFFLINE_CACHE_KEY)).toBeTruthy();
  expect(await w.cacheStore.read()).not.toBeNull();
}

async function expectNothingLeft(w: ReturnType<typeof wired>) {
  expect(w.disk.text).toBeNull();
  expect(w.secure.get(OFFLINE_CACHE_KEY) ?? "").toBe("");
  expect(await w.cacheStore.read()).toBeNull();
  expect(await w.cache.restore(testQueryClient())).toBeNull();
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the offline cache after a session ends", () => {
  it("sign-out leaves no file, no key and nothing readable", async () => {
    const w = wired();
    await signedInWithCache(w);
    await w.session.signOut();
    await expectNothingLeft(w);
    w.stop();
  });

  it("a rejected refresh (session ended) leaves nothing", async () => {
    const w = wired();
    await signedInWithCache(w);
    w.refresh.mockResolvedValueOnce({ ok: false, reason: "rejected" } as TokenResult);
    await w.session.refresh();
    expect(w.session.getState()).toEqual({ status: "sessionEnded" });
    await expectNothingLeft(w);
    w.stop();
  });

  it("an account deletion leaves nothing", async () => {
    const w = wired();
    await signedInWithCache(w);
    await w.session.accountDeleted();
    expect(w.session.getState()).toEqual({ status: "accountDeleted" });
    await expectNothingLeft(w);
    w.stop();
  });

  it("signing in again as someone else leaves nothing of the first person's figures", async () => {
    const w = wired();
    await signedInWithCache(w);
    w.exchangeCode.mockResolvedValueOnce({ ok: true, tokens: tokensFor("user_b") });
    expect(await w.session.reauthenticate()).toBe("differentAccount");
    await expectNothingLeft(w);
    w.stop();
  });

  it("a read answered after sign-out is never saved", async () => {
    const w = wired();
    await signedInWithCache(w);
    await w.session.signOut();
    // A fetch that was in flight answers now.
    await readEverything(w.queryClient);
    await expectNothingLeft(w);
    w.stop();
  });
});

describe("a cold start with no network", () => {
  it("keeps the saved figures and shows them, since the session is only offline", async () => {
    const w = wired();
    await signedInWithCache(w);
    w.stop();
    // The next launch: same device, a fresh session and query client, and no network.
    const secure = w.secure;
    const next = createSession({
      config: {
        authBaseUrl: "https://auth.test.invalid",
        clientId: "client_TESTONLY",
        redirectUri: "flump://auth/callback",
      },
      crypto: {
        randomBytes: (n) => new Uint8Array(randomBytes(n)),
        sha256: async () => new Uint8Array(32),
      },
      workos: {
        refresh: async () => ({ ok: false, reason: "unavailable" }) as TokenResult,
        exchangeCode: jest.fn(),
      } as unknown as WorkosClient,
      tokens: createTokenStore(w.store, 7),
      openBrowser: jest.fn(),
      checkAccount: jest.fn(),
      endServerSession: jest.fn(),
      clearCache: () => w.cache.wipe(),
    });
    await next.restore();
    expect(next.getState()).toEqual({ status: "restoredOffline" });
    expect(secure.get(OFFLINE_CACHE_KEY)).toBeTruthy();
    const offline = testQueryClient();
    const saved = await w.cache.restore(offline);
    expect(saved?.savedAt).toEqual(expect.any(Number));
    expect(offline.getQueryData(CACHED_READS.accounts.key)).toEqual(ANSWERS.accounts);
  });

  it("restored from a backup onto a new phone (no key, no refresh token): nothing shows, sign in", async () => {
    const w = wired();
    await signedInWithCache(w);
    w.stop();
    // A backup carries the file (were it ever backed up) but never the secure store.
    const copied = w.disk.text;
    const fresh = device();
    fresh.disk.text = copied;
    const session = createSession({
      config: {
        authBaseUrl: "https://auth.test.invalid",
        clientId: "client_TESTONLY",
        redirectUri: "flump://auth/callback",
      },
      crypto: {
        randomBytes: (n) => new Uint8Array(randomBytes(n)),
        sha256: async () => new Uint8Array(32),
      },
      workos: { refresh: jest.fn(), exchangeCode: jest.fn() } as unknown as WorkosClient,
      tokens: createTokenStore(fresh.store, 7),
      openBrowser: jest.fn(),
      checkAccount: jest.fn(),
      endServerSession: jest.fn(),
      clearCache: () => fresh.cache.wipe(),
    });
    await session.restore();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(fresh.disk.text).toBeNull();
    expect(await fresh.cache.restore(testQueryClient())).toBeNull();
  });
});

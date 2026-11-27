/**
 * Nothing of the offline cache survives a session's end (E12 S7): the real session controller, the
 * real offline cache and the real sealed store (with Node's AES-256-GCM standing in for
 * expo-crypto's), wired as `authDeps.ts` wires them, over an in-memory secure store and file. After
 * each way out, the sealed file and its key are gone, and a fresh read gives nothing.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { QueryClient } from "@tanstack/react-query";
import { type CacheFile, createCacheStore } from "../data/cacheStore";
import { testQueryClient } from "../data/fakeApi";
import { CACHED_READS, createOfflineCache } from "../data/offlineCache";
import type { TokenResult, WorkosClient } from "../data/workos";
import { OFFLINE_CACHE_KEY } from "../device/storageKeys";
import { household } from "../features/check-in/checkInTestData";
import { nodeAesBox } from "../testing/nodeAesBox";
import { readQuery } from "./authorizeUrl";
import { type AccountCheck, createSession, type Session } from "./session";
import { createTokenStore, type SecureStoreLike } from "./tokenStore";

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
  const cacheStore = createCacheStore({ box: nodeAesBox, file, store, accessible: 7 });
  let owner: () => Promise<string | null> = async () => null;
  const cache = createOfflineCache({
    store: cacheStore,
    now: () => Date.now(),
    owner: () => owner(),
  });
  return {
    secure,
    store,
    disk,
    cacheStore,
    cache,
    setOwner: (o: () => Promise<string | null>) => {
      owner = o;
    },
  };
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
  d.setOwner(() => session.cacheOwner());
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
  const owner = await w.session.cacheOwner();
  expect(owner).toMatch(/^[A-Za-z0-9_-]{43}$/);
  // Hashed: the raw sub is not in the secure store.
  expect([...w.secure.values()].join("|")).not.toContain("user_a");
  expect(await w.cacheStore.read(owner ?? "")).not.toBeNull();
}

async function expectNothingLeft(w: ReturnType<typeof wired>) {
  expect(w.disk.text).toBeNull();
  expect(w.secure.get(OFFLINE_CACHE_KEY) ?? "").toBe("");
  expect(await w.cacheStore.read((await w.session.cacheOwner()) ?? "any")).toBeNull();
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

describe("sealed for one person", () => {
  it("another person's file never opens, even with every wipe step failed and the key still there", async () => {
    const w = wired();
    await signedInWithCache(w);
    const file = w.disk.text;
    const key = w.secure.get(OFFLINE_CACHE_KEY);
    // Someone else signs in on this phone; then put the first person's file and key back, as if
    // every step of the wipe had failed.
    await w.session.signOut();
    w.exchangeCode.mockResolvedValueOnce({ ok: true, tokens: tokensFor("user_b") });
    await w.session.signIn();
    expect(w.session.getState()).toEqual({ status: "signedIn" });
    w.disk.text = file;
    if (key) w.secure.set(OFFLINE_CACHE_KEY, key);
    expect(await w.cacheStore.read((await w.session.cacheOwner()) ?? "")).toBeNull();
    w.stop();
  });

  it("with no owner recorded (an older install), nothing is read and the file goes", async () => {
    const w = wired();
    await signedInWithCache(w);
    w.setOwner(async () => null);
    expect(await w.cache.restore(testQueryClient())).toBeNull();
    expect(w.disk.text).toBeNull();
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
    w.setOwner(() => next.cacheOwner());
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
    fresh.setOwner(() => session.cacheOwner());
    await session.restore();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(fresh.disk.text).toBeNull();
    expect(await fresh.cache.restore(testQueryClient())).toBeNull();
  });
});

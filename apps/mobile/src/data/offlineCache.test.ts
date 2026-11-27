/**
 * Offline reading's cache logic (E12 S7): what is saved, when, and what comes back. The sealed file
 * is an in-memory stand-in here (`cacheStore.test.ts` tests the real one); the household's answers
 * are built by the check-in's test data, each parsed with its contract schema.
 */
import type { QueryClient } from "@tanstack/react-query";
import { household } from "../features/check-in/checkInTestData";
import type { CacheStore } from "./cacheStore";
import { testQueryClient } from "./fakeApi";
import { CACHE_FORMAT, CACHED_READS, createOfflineCache, MAX_AGE_MS } from "./offlineCache";
import { queryKeys } from "./queryKeys";

// 27 November 2026, 12:00 UTC.
const NOW = Date.UTC(2026, 10, 27, 12, 0, 0);
const HOUR = 3_600_000;

function memoryStore() {
  const state = { text: null as string | null, writes: 0, wipes: 0 };
  const store: CacheStore & typeof state = Object.assign(state, {
    read: jest.fn(async () => state.text),
    write: jest.fn(async (text: string) => {
      state.writes += 1;
      state.text = text;
    }),
    wipe: jest.fn(async () => {
      state.wipes += 1;
      state.text = null;
      return true;
    }),
  });
  return store;
}

const h = household();
const ANSWERS = {
  accounts: h.accounts.map(({ details: _details, ...account }) => account),
  accountDetails: h.details,
  userProfile: h.profile,
  checkIns: h.checkIns,
  budgetEntries: h.budgetEntries,
} as const;
type Name = keyof typeof ANSWERS;
const NAMES = Object.keys(ANSWERS) as Name[];

/** Each read answered as a live fetch does (not by hand), at the clock time given. */
async function fetchAll(queryClient: QueryClient, at: number, names: readonly Name[] = NAMES) {
  jest.setSystemTime(at);
  for (const name of names) {
    await queryClient.fetchQuery({
      queryKey: CACHED_READS[name].key,
      queryFn: async () => ANSWERS[name],
    });
  }
}

/** The file as `watch` would write it, built by hand for the restore tests. */
function envelope(reads: Partial<Record<Name, { savedAt: number; data: unknown }>>) {
  return JSON.stringify({ format: CACHE_FORMAT, reads });
}
const allSavedAt = (savedAt: number, data: Partial<Record<Name, unknown>> = {}) =>
  Object.fromEntries(NAMES.map((n) => [n, { savedAt, data: n in data ? data[n] : ANSWERS[n] }]));

/** Lets the save chain run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
  jest.setSystemTime(NOW);
});
afterEach(() => {
  jest.useRealTimers();
});

describe("saving", () => {
  it("saves every read after it succeeds, with the time Flump sent it", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => true);
    await fetchAll(queryClient, NOW - HOUR);
    await settle();
    stop();
    const saved = JSON.parse(store.text ?? "{}");
    expect(saved.format).toBe(CACHE_FORMAT);
    expect(Object.keys(saved.reads).sort()).toEqual([...NAMES].sort());
    expect(saved.reads.accounts.savedAt).toBe(NOW - HOUR);
    expect(saved.reads.accounts.data).toEqual(ANSWERS.accounts);
  });

  it("names each read by what it is, with no id, token or name of a person in the names", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => true);
    await fetchAll(queryClient, NOW);
    await settle();
    stop();
    const saved = JSON.parse(store.text ?? "{}");
    expect(Object.keys(saved)).toEqual(["format", "reads"]);
    expect(Object.keys(saved.reads).sort()).toEqual(
      ["accountDetails", "accounts", "budgetEntries", "checkIns", "userProfile"].sort(),
    );
  });

  it("saves nothing while the session may not (offline, signing out, signed out)", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => false);
    await fetchAll(queryClient, NOW);
    await settle();
    stop();
    expect(store.write).not.toHaveBeenCalled();
  });

  it("never saves a value set by hand (the restore itself), so its time cannot be refreshed", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => true);
    queryClient.setQueryData(queryKeys.accounts(), ANSWERS.accounts, { updatedAt: NOW - HOUR });
    await settle();
    stop();
    expect(store.write).not.toHaveBeenCalled();
  });

  it("ignores reads it does not cache", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => true);
    await queryClient.fetchQuery({ queryKey: ["flump", "other"], queryFn: async () => ({ a: 1 }) });
    await settle();
    stop();
    expect(store.write).not.toHaveBeenCalled();
  });

  it("a save planned before a wipe is dropped, never written after it", async () => {
    const store = memoryStore();
    let release: () => void = () => {};
    // The first write waits; while it does, the next successes plan another save.
    (store.write as jest.Mock).mockImplementationOnce(
      (text: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            store.text = text;
            resolve();
          };
        }),
    );
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const stop = cache.watch(queryClient, () => true);
    await fetchAll(queryClient, NOW);
    await cache.wipe();
    release();
    await settle();
    stop();
    // The write in flight landed before the wipe in the real store's queue (cacheStore.test.ts);
    // here what matters is that no save was planned and written after the wipe.
    expect(store.write).toHaveBeenCalledTimes(1);
  });

  it("stops saving once stopped", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    cache.watch(queryClient, () => true)();
    await fetchAll(queryClient, NOW);
    await settle();
    expect(store.write).not.toHaveBeenCalled();
  });
});

describe("restoring", () => {
  it("puts every read back with the time it was saved, and gives the oldest", async () => {
    const store = memoryStore();
    store.text = envelope({
      ...allSavedAt(NOW - 2 * HOUR),
      // The profile was read later than the rest.
      userProfile: { savedAt: NOW - HOUR, data: ANSWERS.userProfile },
    });
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    expect(await cache.restore(queryClient)).toEqual({ savedAt: NOW - 2 * HOUR });
    expect(queryClient.getQueryData(queryKeys.accounts())).toEqual(ANSWERS.accounts);
    expect(queryClient.getQueryState(queryKeys.accounts())?.dataUpdatedAt).toBe(NOW - 2 * HOUR);
    expect(queryClient.getQueryState(queryKeys.userProfile())?.dataUpdatedAt).toBe(NOW - HOUR);
  });

  it("round-trips what watch saved", async () => {
    const store = memoryStore();
    const cache = createOfflineCache({ store, now: () => NOW });
    const online = testQueryClient();
    const stop = cache.watch(online, () => true);
    await fetchAll(online, NOW - HOUR);
    await settle();
    stop();
    const offline = testQueryClient();
    expect(await cache.restore(offline)).toEqual({ savedAt: NOW - HOUR });
    for (const name of NAMES) {
      expect(offline.getQueryData(CACHED_READS[name].key)).toEqual(ANSWERS[name]);
    }
  });

  it("keeps a person with no profile yet (null) as null", async () => {
    const store = memoryStore();
    store.text = envelope(allSavedAt(NOW - HOUR, { userProfile: null }));
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    expect(await cache.restore(queryClient)).toEqual({ savedAt: NOW - HOUR });
    expect(queryClient.getQueryData(queryKeys.userProfile())).toBeNull();
  });

  it("is all or nothing: one read missing shows nothing, and the file goes", async () => {
    const store = memoryStore();
    const { budgetEntries: _missing, ...rest } = allSavedAt(NOW - HOUR);
    store.text = envelope(rest);
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    expect(await cache.restore(queryClient)).toBeNull();
    expect(queryClient.getQueryData(queryKeys.accounts())).toBeUndefined();
    expect(store.wipe).toHaveBeenCalledTimes(1);
  });

  it("shows figures saved exactly 7 days ago, but not a millisecond older", async () => {
    const atEdge = memoryStore();
    atEdge.text = envelope(allSavedAt(NOW - MAX_AGE_MS));
    expect(
      await createOfflineCache({ store: atEdge, now: () => NOW }).restore(testQueryClient()),
    ).toEqual({ savedAt: NOW - MAX_AGE_MS });

    const tooOld = memoryStore();
    tooOld.text = envelope(allSavedAt(NOW - MAX_AGE_MS - 1));
    expect(
      await createOfflineCache({ store: tooOld, now: () => NOW }).restore(testQueryClient()),
    ).toBeNull();
    expect(tooOld.wipe).toHaveBeenCalledTimes(1);
  });

  it("7 days is 604,800,000 ms", () => {
    // 7 days x 24 hours x 60 minutes x 60 seconds x 1000 ms.
    expect(MAX_AGE_MS).toBe(604_800_000);
  });

  it("does not believe a saved time more than 5 minutes ahead of the phone's clock", async () => {
    const near = memoryStore();
    near.text = envelope(allSavedAt(NOW + 5 * 60_000));
    expect(
      await createOfflineCache({ store: near, now: () => NOW }).restore(testQueryClient()),
    ).toEqual({ savedAt: NOW + 5 * 60_000 });
    const far = memoryStore();
    far.text = envelope(allSavedAt(NOW + 5 * 60_000 + 1));
    expect(
      await createOfflineCache({ store: far, now: () => NOW }).restore(testQueryClient()),
    ).toBeNull();
  });

  it("drops a file of another format, or one that is not JSON", async () => {
    for (const text of [
      JSON.stringify({ format: CACHE_FORMAT + 1, reads: allSavedAt(NOW) }),
      "not json",
      "null",
    ]) {
      const store = memoryStore();
      store.text = text;
      const queryClient = testQueryClient();
      expect(await createOfflineCache({ store, now: () => NOW }).restore(queryClient)).toBeNull();
      expect(store.wipe).toHaveBeenCalledTimes(1);
    }
  });

  it("reads an older app's cache through today's contract: unknown fields ignored", async () => {
    const store = memoryStore();
    const withExtra = ANSWERS.accounts.map((a) => ({ ...a, fieldFromLater: "kept out" }));
    store.text = envelope(allSavedAt(NOW - HOUR, { accounts: withExtra }));
    const queryClient = testQueryClient();
    expect(await createOfflineCache({ store, now: () => NOW }).restore(queryClient)).not.toBeNull();
    const [first] = queryClient.getQueryData<{ id: string; balance: number }[]>(
      queryKeys.accounts(),
    ) ?? [{ id: "", balance: Number.NaN }];
    expect(first?.id).toBe(ANSWERS.accounts[0]?.id);
    expect(first?.balance).toBe(ANSWERS.accounts[0]?.balance);
  });

  it("a cached shape that no longer parses is dropped, never shown (an account with no balance)", async () => {
    const store = memoryStore();
    const broken = ANSWERS.accounts.map(({ balance: _balance, ...rest }) => rest);
    store.text = envelope(allSavedAt(NOW - HOUR, { accounts: broken }));
    const queryClient = testQueryClient();
    expect(await createOfflineCache({ store, now: () => NOW }).restore(queryClient)).toBeNull();
    expect(queryClient.getQueryData(queryKeys.accounts())).toBeUndefined();
    expect(store.wipe).toHaveBeenCalledTimes(1);
  });

  it("never covers a fresher answer already in memory, and counts that answer's own time", async () => {
    const store = memoryStore();
    store.text = envelope(allSavedAt(NOW - 3 * HOUR));
    const queryClient = testQueryClient();
    const fresher = [...ANSWERS.accounts].reverse();
    queryClient.setQueryData(queryKeys.accounts(), fresher, { updatedAt: NOW - 2 * HOUR });
    expect(await createOfflineCache({ store, now: () => NOW }).restore(queryClient)).toEqual({
      savedAt: NOW - 3 * HOUR,
    });
    expect(queryClient.getQueryData(queryKeys.accounts())).toBe(fresher);
  });

  it("a session that left restoredOffline while the file was read gets nothing put back", async () => {
    const store = memoryStore();
    store.text = envelope(allSavedAt(NOW - HOUR));
    const queryClient = testQueryClient();
    let offline = true;
    let answer: (text: string | null) => void = () => {};
    (store.read as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve;
        }),
    );
    const restoring = createOfflineCache({ store, now: () => NOW }).restore(
      queryClient,
      () => offline,
    );
    // Sign out began (signingOut) and cleared the query cache; the wipe has not run yet.
    offline = false;
    answer(envelope(allSavedAt(NOW - HOUR)));
    expect(await restoring).toBeNull();
    expect(queryClient.getQueryData(queryKeys.accounts())).toBeUndefined();
  });

  it("with nothing saved, gives null and wipes nothing", async () => {
    const store = memoryStore();
    expect(
      await createOfflineCache({ store, now: () => NOW }).restore(testQueryClient()),
    ).toBeNull();
    expect(store.wipe).not.toHaveBeenCalled();
  });

  it("a wipe while reading wins: nothing is put back", async () => {
    const store = memoryStore();
    store.text = envelope(allSavedAt(NOW - HOUR));
    let answer: (text: string | null) => void = () => {};
    (store.read as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve;
        }),
    );
    const cache = createOfflineCache({ store, now: () => NOW });
    const queryClient = testQueryClient();
    const restoring = cache.restore(queryClient);
    await cache.wipe();
    answer(envelope(allSavedAt(NOW - HOUR)));
    expect(await restoring).toBeNull();
    expect(queryClient.getQueryData(queryKeys.accounts())).toBeUndefined();
  });
});

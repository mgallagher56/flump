/**
 * The session's part in offline reading (E12 S7): when the offline cache is forgotten, and the quiet
 * reconnect from `restoredOffline`. The cache itself is a counting stand-in here; the real one is in
 * `offlineCache.test.ts` and `offlineWipe.test.tsx`.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { TokenResult, WorkosClient } from "../data/workos";
import { readQuery } from "./authorizeUrl";
import { offlineAwareAccessToken } from "./offlineAccess";
import type { PkceCrypto } from "./pkce";
import { type AccountCheck, type BrowserResult, createSession, type SessionDeps } from "./session";
import { OWNER_UNAVAILABLE, type TokenStore } from "./tokenStore";

const config = {
  authBaseUrl: "https://auth.test.invalid",
  clientId: "client_TESTONLY",
  redirectUri: "flump://auth/callback",
};
const crypto: PkceCrypto = {
  randomBytes: (n) => new Uint8Array(randomBytes(n)),
  sha256: async (text) => new Uint8Array(createHash("sha256").update(text, "ascii").digest()),
};
const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
// Runtime-built test tokens naming a person (`sub`) and a session (`sid`).
const tokensFor = (sub: string) => ({
  accessToken: `${b64({ alg: "none" })}.${b64({ sub, sid: `sid_${randomUUID()}` })}.x`,
  refreshToken: `r_${randomUUID()}`,
});
const ok = (tokens: { accessToken: string; refreshToken: string }): TokenResult => ({
  ok: true,
  tokens,
});

function harness(stored: string | null = null) {
  let value = stored;
  const tokens: TokenStore = {
    read: jest.fn(async () => value),
    save: jest.fn(async (token: string) => {
      value = token;
    }),
    clear: jest.fn(async () => {
      value = null;
      return true;
    }),
  };
  const order: string[] = [];
  const clearCache = jest.fn(async () => {
    order.push("clearCache");
  });
  const wipeDevice = jest.fn(async () => {
    order.push("wipeDevice");
  });
  const refresh = jest.fn(async (): Promise<TokenResult> => ok(tokensFor("user_a")));
  const exchangeCode = jest.fn(async (): Promise<TokenResult> => ok(tokensFor("user_a")));
  const account = jest.fn(async (): Promise<AccountCheck> => "ok");
  const browser = jest.fn(async (url: string): Promise<BrowserResult> => {
    order.push("browser");
    const q = readQuery(url.split("?")[1] ?? "");
    return { type: "success", url: `flump://auth/callback?code=c1&state=${q.state}` };
  });
  const deps: SessionDeps = {
    config,
    crypto,
    workos: { refresh, exchangeCode } as unknown as WorkosClient,
    tokens,
    openBrowser: browser,
    checkAccount: account,
    endServerSession: jest.fn(async () => "ended" as const),
    wipeDevice,
    clearCache,
  };
  return { deps, tokens, order, clearCache, wipeDevice, refresh, exchangeCode, account, browser };
}

const UNREACHABLE: TokenResult = { ok: false, reason: "unavailable" } as TokenResult;
const REJECTED: TokenResult = { ok: false, reason: "rejected" } as TokenResult;

/** A launch with a stored token and no network: restoredOffline, nothing cleared. */
async function offlineSession(h: ReturnType<typeof harness>) {
  h.refresh.mockResolvedValueOnce(UNREACHABLE);
  const session = createSession(h.deps);
  await session.restore();
  expect(session.getState()).toEqual({ status: "restoredOffline" });
  return session;
}

describe("the offline cache is forgotten", () => {
  it("never on a launch with no network: the saved figures are what offline reading shows", async () => {
    const h = harness("r_stored");
    await offlineSession(h);
    expect(h.clearCache).not.toHaveBeenCalled();
    expect(h.tokens.clear).not.toHaveBeenCalled();
  });

  it("on a launch with no stored session (a restored backup, a wipe that failed before)", async () => {
    const h = harness(null);
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.clearCache).toHaveBeenCalledTimes(1);
  });

  it("on sign-out, after the tokens and before the signed-out screen, with no network needed", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    const seen: string[] = [];
    session.subscribe((s) => seen.push(s.status));
    h.clearCache.mockImplementation(async () => {
      expect(h.tokens.clear).toHaveBeenCalled();
      expect(session.getState().status).toBe("signingOut");
      h.order.push("clearCache");
    });
    await session.signOut();
    expect(h.clearCache).toHaveBeenCalledTimes(1);
    expect(seen.at(-1)).toBe("signedOut");
  });

  it("when a refresh is rejected (session ended), with the rest of the device", async () => {
    const h = harness("r_stored");
    h.refresh.mockResolvedValueOnce(REJECTED);
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "sessionEnded" });
    expect(h.order).toEqual(["clearCache", "wipeDevice"]);
  });

  it("when the account is deleted", async () => {
    const h = harness("r_stored");
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "signedIn" });
    h.clearCache.mockClear();
    await session.accountDeleted();
    expect(session.getState()).toEqual({ status: "accountDeleted" });
    expect(h.clearCache).toHaveBeenCalledTimes(1);
    expect(h.tokens.clear).toHaveBeenCalled();
  });

  it("before every new sign-in opens the browser, whoever signed in last", async () => {
    const h = harness(null);
    const session = createSession(h.deps);
    await session.restore();
    h.order.length = 0;
    await session.signIn();
    expect(h.order.slice(0, 2)).toEqual(["clearCache", "browser"]);
    expect(session.getState()).toEqual({ status: "signedIn" });
  });

  it("when signing in again brings back a different person; the current session stays", async () => {
    const h = harness("r_stored");
    h.refresh.mockResolvedValueOnce(ok(tokensFor("user_a")));
    const session = createSession(h.deps);
    await session.restore();
    h.clearCache.mockClear();
    h.exchangeCode.mockResolvedValueOnce(ok(tokensFor("user_b")));
    expect(await session.reauthenticate()).toBe("differentAccount");
    expect(h.clearCache).toHaveBeenCalledTimes(1);
    expect(session.getState()).toEqual({ status: "signedIn" });
  });

  it("not when signing in again brings back the same person", async () => {
    const h = harness("r_stored");
    h.refresh.mockResolvedValueOnce(ok(tokensFor("user_a")));
    const session = createSession(h.deps);
    await session.restore();
    h.clearCache.mockClear();
    h.exchangeCode.mockResolvedValueOnce(ok(tokensFor("user_a")));
    expect(await session.reauthenticate()).toBe("confirmed");
    expect(h.clearCache).not.toHaveBeenCalled();
  });

  it("a cache that cannot be forgotten never stops sign-out", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    h.clearCache.mockRejectedValueOnce(new Error("disk"));
    await session.signOut();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.wipeDevice).toHaveBeenCalled();
  });
});

describe("quiet reconnect from restoredOffline", () => {
  it("signs in again without a loading state once Flump answers", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    const seen: string[] = [];
    session.subscribe((s) => seen.push(s.status));
    await session.reconnect();
    expect(seen).toEqual(["signedIn"]);
    expect(session.getAccessToken()).not.toBeNull();
    expect(h.clearCache).not.toHaveBeenCalled();
  });

  it("stays offline, keeping the token and the cache, when Flump still cannot be reached", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    h.refresh.mockResolvedValueOnce(UNREACHABLE);
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(h.tokens.clear).not.toHaveBeenCalled();
    expect(h.clearCache).not.toHaveBeenCalled();
  });

  it("ends the session, as any refresh would, when the refresh token is rejected", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    h.refresh.mockResolvedValueOnce(REJECTED);
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "sessionEnded" });
    expect(h.clearCache).toHaveBeenCalledTimes(1);
  });

  it("calls made while one runs share it: one refresh, one account check", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    const before = h.refresh.mock.calls.length;
    await Promise.all([session.reconnect(), session.reconnect(), session.reconnect()]);
    expect(h.refresh.mock.calls.length - before).toBe(1);
    expect(h.account).toHaveBeenCalledTimes(1);
  });

  it("a refresh that worked but an account check that did not: no token is kept, so no read goes out", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    h.account.mockResolvedValueOnce("unavailable");
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(session.getAccessToken()).toBeNull();
    // The rotated refresh token was saved, so the next try refreshes with it and signs in.
    expect(h.tokens.clear).not.toHaveBeenCalled();
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "signedIn" });
  });

  it.each([
    ["not-invited", "notInvited"],
    ["terms-not-accepted", "termsRequired"],
    ["account-deleted", "deletionPending"],
  ] as const)(
    "an account check answering %s moves to %s and forgets the cache",
    async (answer, status) => {
      const h = harness("r_stored");
      const session = await offlineSession(h);
      h.account.mockResolvedValueOnce(answer);
      await session.reconnect();
      expect(session.getState()).toEqual({ status });
      expect(h.clearCache).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["not-invited", "notInvited"],
    ["terms-not-accepted", "termsRequired"],
    ["account-deleted", "deletionPending"],
  ] as const)("on launch, %s also forgets the cache", async (answer, status) => {
    const h = harness("r_stored");
    h.account.mockResolvedValueOnce(answer);
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status });
    expect(h.clearCache).toHaveBeenCalledTimes(1);
  });

  it("a read answering 410 mid-session (deletionPending) forgets the cache", async () => {
    const h = harness("r_stored");
    const session = createSession(h.deps);
    await session.restore();
    session.deletionPending();
    await new Promise((resolve) => setImmediate(resolve));
    expect(session.getState()).toEqual({ status: "deletionPending" });
    expect(h.clearCache).toHaveBeenCalledTimes(1);
  });

  it("does nothing outside restoredOffline", async () => {
    const h = harness("r_stored");
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "signedIn" });
    const refreshes = h.refresh.mock.calls.length;
    await session.reconnect();
    expect(h.refresh.mock.calls.length).toBe(refreshes);
    expect(h.account).toHaveBeenCalledTimes(1);
  });

  it("signed out while it runs: the late answer moves nothing", async () => {
    const h = harness("r_stored");
    const session = await offlineSession(h);
    let answer: (result: TokenResult) => void = () => {};
    h.refresh.mockImplementationOnce(
      () =>
        new Promise<TokenResult>((resolve) => {
          answer = resolve;
        }),
    );
    const running = session.reconnect();
    await session.signOut();
    answer(ok(tokensFor("user_a")));
    await running;
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(session.getAccessToken()).toBeNull();
  });
});

describe("the cache owner", () => {
  it("is saved as a SHA-256 of the sub (base64url), never the raw sub, when tokens are adopted", async () => {
    const h = harness("r_stored");
    const owners: string[] = [];
    h.tokens.saveOwner = jest.fn(async (owner: string) => {
      owners.push(owner);
    });
    h.tokens.readOwner = jest.fn(async () => owners.at(-1) ?? null);
    const session = createSession(h.deps);
    await session.restore();
    // SHA-256("user_a") in base64url, worked out with Node's own hash.
    const expected = createHash("sha256").update("user_a").digest("base64url");
    expect(owners).toEqual([expected]);
    expect(owners[0]).not.toContain("user_a");
    expect(await session.cacheOwner()).toBe(expected);
  });

  it("a token naming nobody saves an empty owner, which reads as none", async () => {
    const h = harness("r_stored");
    h.refresh.mockResolvedValueOnce(ok({ accessToken: "not-a-jwt", refreshToken: "r_odd" }));
    const owners: string[] = [];
    h.tokens.saveOwner = jest.fn(async (owner: string) => {
      owners.push(owner);
    });
    const session = createSession(h.deps);
    await session.restore();
    expect(owners).toEqual([""]);
  });

  it("a store that cannot be read says so (unavailable), which is not the same as no owner", async () => {
    const h = harness("r_stored");
    h.tokens.readOwner = jest.fn(async () => {
      throw new Error("locked");
    });
    expect(await createSession(h.deps).cacheOwner()).toBe(OWNER_UNAVAILABLE);
  });

  it("no owner stored reads as null", async () => {
    const h = harness("r_stored");
    h.tokens.readOwner = jest.fn(async () => null);
    expect(await createSession(h.deps).cacheOwner()).toBeNull();
  });
});

/** A launch that reached Flump: signed in, with an access token in memory. */
async function onlineSession(h: ReturnType<typeof harness>) {
  const session = createSession(h.deps);
  await session.restore();
  expect(session.getState()).toEqual({ status: "signedIn" });
  expect(session.getAccessToken()).not.toBeNull();
  return session;
}

describe("the connection drops while signed in (E12 S7 follow-up)", () => {
  it("moves to the same offline state a launch with no network gives", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    session.connectionLost();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(session.isRestoredOffline()).toBe(true);
  });

  it("drops the access token from memory, so every read waits for a reconnect", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    session.connectionLost();
    expect(session.getAccessToken()).toBeNull();
  });

  it("keeps the refresh token and the saved figures: the cache rules are unchanged", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    const saved = (h.tokens.save as jest.Mock).mock.calls.at(-1)?.[0];
    session.connectionLost();
    await Promise.resolve();
    expect(h.tokens.clear).not.toHaveBeenCalled();
    expect(h.clearCache).not.toHaveBeenCalled();
    expect(h.wipeDevice).not.toHaveBeenCalled();
    expect(await h.tokens.read()).toBe(saved);
  });

  it("comes back with one quiet reconnect once Flump answers", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    session.connectionLost();
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "signedIn" });
    expect(session.getAccessToken()).not.toBeNull();
  });

  it("stays offline, nothing cleared, when the reconnect cannot reach Flump", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    session.connectionLost();
    h.refresh.mockResolvedValueOnce(UNREACHABLE);
    await session.reconnect();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(h.tokens.clear).not.toHaveBeenCalled();
  });

  it("a refresh already in flight when the connection drops puts no access token back", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    let answer: (result: TokenResult) => void = () => {};
    h.refresh.mockImplementationOnce(
      () =>
        new Promise<TokenResult>((resolve) => {
          answer = resolve;
        }),
    );
    // A 401 while signed in starts a refresh; the drop comes before WorkOS answers.
    const refreshing = session.refresh();
    // The store is read first; wait until WorkOS has been asked.
    while (h.refresh.mock.calls.length < 2) await Promise.resolve();
    session.connectionLost();
    const fresh = tokensFor("user_a");
    answer(ok(fresh));
    expect(await refreshing).toBe("refreshed");
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(session.getAccessToken()).toBeNull();
    // The rotated refresh token is the one kept, for the reconnect.
    expect(await h.tokens.read()).toBe(fresh.refreshToken);
  });

  it("a reconnect that joins a refresh begun before the drop finishes and signs in again", async () => {
    const h = harness("r_stored");
    const session = await onlineSession(h);
    let answer: (result: TokenResult) => void = () => {};
    h.refresh.mockImplementationOnce(
      () =>
        new Promise<TokenResult>((resolve) => {
          answer = resolve;
        }),
    );
    void session.refresh();
    while (h.refresh.mock.calls.length < 2) await Promise.resolve();
    session.connectionLost();
    // The account check asks for a token as the real API client does: through the offline door.
    h.account.mockImplementation(async () => {
      await offlineAwareAccessToken(session)();
      return "ok";
    });
    const reconnecting = session.reconnect();
    answer(ok(tokensFor("user_a")));
    await reconnecting;
    expect(session.getState()).toEqual({ status: "signedIn" });
    expect(session.getAccessToken()).not.toBeNull();
  });

  it.each([
    [
      "signedOut",
      async (h: ReturnType<typeof harness>) => {
        const s = createSession(h.deps);
        await s.restore();
        return s;
      },
    ],
    ["restoredOffline", (h: ReturnType<typeof harness>) => offlineSession(h)],
  ])("changes nothing from %s", async (status, start) => {
    const h = harness(status === "signedOut" ? null : "r_stored");
    const session = await start(h);
    const before = session.getState();
    const listener = jest.fn();
    session.subscribe(listener);
    session.connectionLost();
    expect(session.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
});

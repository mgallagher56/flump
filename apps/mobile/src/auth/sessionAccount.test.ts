/**
 * The session's account-data paths (E12 S9, plan 9.10): the device wipe on sign-out, session end
 * and deletion, the deletion states, and re-authentication for a recent sign-in.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ServerSignOutResult } from "../data/serverSignOut";
import type { TokenResult, WorkosClient } from "../data/workos";
import { DEVICE_LOCK_KEY } from "../device/storageKeys";
import { readQuery } from "./authorizeUrl";
import { type AppLockPhase, createAppLock } from "./deviceLock";
import type { PkceCrypto } from "./pkce";
import {
  type AccountCheck,
  type BrowserResult,
  createSession,
  type Session,
  type SessionDeps,
} from "./session";
import type { TokenStore } from "./tokenStore";

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
// Runtime-built test tokens: an access token naming its person and session, and opaque refresh tokens.
let counter = 0;
const tokensFor = (sub: string, sid?: string) => {
  counter += 1;
  return {
    accessToken: `${b64({ alg: "none" })}.${b64({ sub, sid: sid ?? `session_${counter}` })}.x`,
    refreshToken: `r_${counter}_${randomUUID()}`,
  };
};
const ok = (tokens: { accessToken: string; refreshToken: string }): TokenResult => ({
  ok: true,
  tokens,
});

function memoryTokens() {
  let value: string | null = null;
  const log: string[] = [];
  const store: TokenStore & { peek(): string | null; log: string[] } = {
    read: jest.fn(async () => value),
    save: jest.fn(async (token: string) => {
      log.push(`save:${token}`);
      value = token;
    }),
    clear: jest.fn(async () => {
      log.push("clear");
      value = null;
      return true;
    }),
    peek: () => value,
    log,
  };
  return store;
}

const successBrowser = async (url: string): Promise<BrowserResult> => {
  const q = readQuery(url.split("?")[1] ?? "");
  return { type: "success", url: `flump://auth/callback?code=c${counter}&state=${q.state}` };
};

function harness(over: { account?: () => Promise<AccountCheck> } = {}) {
  const tokens = memoryTokens();
  const exchanges: TokenResult[] = [];
  const workos = {
    exchangeCode: jest.fn(async () => exchanges.shift() ?? ok(tokensFor("user_a"))),
    refresh: jest.fn(async () => ok(tokensFor("user_a"))),
  };
  const browser = jest.fn(successBrowser);
  const serverSignOut = jest.fn(async (_token: string): Promise<ServerSignOutResult> => "ended");
  const wipeDevice = jest.fn(async () => {});
  const account = jest.fn(over.account ?? (async (): Promise<AccountCheck> => "ok"));
  const deps: SessionDeps = {
    config,
    crypto,
    workos: workos as unknown as WorkosClient,
    tokens,
    openBrowser: browser,
    checkAccount: account,
    endServerSession: serverSignOut,
    wipeDevice,
  };
  return { deps, tokens, workos, browser, serverSignOut, wipeDevice, exchanges, account };
}

type H = ReturnType<typeof harness>;

/** Signed in as `user_a`, with the first exchange's tokens. */
async function signedIn(h: H, first = tokensFor("user_a")): Promise<Session> {
  h.exchanges.push(ok(first));
  const session = createSession(h.deps);
  await session.restore();
  await session.signIn();
  expect(session.getState()).toEqual({ status: "signedIn" });
  expect(session.getAccessToken()).toBe(first.accessToken);
  return session;
}

describe("the device wipe", () => {
  it("sign-out wipes the device (app lock flag, export files) after the tokens, with no network", async () => {
    const h = harness();
    const session = await signedIn(h);
    h.wipeDevice.mockImplementation(async () => {
      // By the time the rest of the device is wiped, the token is already gone.
      expect(h.tokens.peek()).toBeNull();
      expect(session.getAccessToken()).toBeNull();
    });
    await session.signOut();
    expect(h.wipeDevice).toHaveBeenCalledTimes(1);
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("a session ended by a rejected refresh wipes the device too", async () => {
    const h = harness();
    const session = await signedIn(h);
    h.workos.refresh.mockResolvedValueOnce({ ok: false, reason: "rejected" });
    expect(await session.refresh()).toBe("ended");
    expect(h.wipeDevice).toHaveBeenCalledTimes(1);
    expect(session.getState()).toEqual({ status: "sessionEnded" });
  });

  it("a failing wipe never stops sign-out", async () => {
    const h = harness();
    const session = await signedIn(h);
    h.wipeDevice.mockRejectedValueOnce(new Error("disk"));
    await session.signOut();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.serverSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("the shell never shows between a lock clear and the session's end", () => {
  /** A real app lock, on and locked, whose clear is the device wipe (as `authDeps.ts`). */
  async function lockedLock(h: H) {
    const values = new Map([[DEVICE_LOCK_KEY, "on"]]);
    const screenCapture = { prevent: jest.fn(async () => {}), allow: jest.fn(async () => {}) };
    const lock = createAppLock({
      auth: {
        getEnrolledLevelAsync: async () => 3,
        authenticateAsync: async () => ({ success: true }),
      },
      store: {
        getItemAsync: async (key) => values.get(key) ?? null,
        setItemAsync: async (key, value) => void values.set(key, value),
        deleteItemAsync: async (key) => void values.delete(key),
      },
      screenCapture,
      accessible: 0,
      now: () => 0,
      isExempt: () => false,
      prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
    });
    h.wipeDevice.mockImplementation(() => lock.clear());
    await lock.start();
    expect(lock.getPhase()).toBe("locked");
    return { lock, values, screenCapture };
  }

  it.each([
    [
      "a rejected refresh",
      "sessionEnded",
      async (h: H, session: Session) => {
        h.workos.refresh.mockResolvedValueOnce({ ok: false, reason: "rejected" });
        await session.refresh();
      },
    ],
    [
      "the account's deletion",
      "accountDeleted",
      (_h: H, session: Session) => session.accountDeleted(),
    ],
  ])(
    "%s while locked: the lock goes off only once the session has left signedIn",
    async (_name, end, run) => {
      const h = harness();
      const session = await signedIn(h);
      const { lock, values, screenCapture } = await lockedLock(h);
      // What the gate would mount at each lock change: the shell needs signedIn and the lock not hiding it.
      const seen: [AppLockPhase, string][] = [];
      lock.subscribe((phase) => seen.push([phase, session.getState().status]));
      await run(h, session);
      expect(seen).toEqual([["off", end]]);
      expect(session.getState()).toEqual({ status: end });
      // The wipe still happened, and capture is allowed again in the end.
      expect(values.has(DEVICE_LOCK_KEY)).toBe(false);
      expect(screenCapture.allow).toHaveBeenCalledTimes(1);
    },
  );
});

describe("account deletion", () => {
  it("deleted: clears the token, memory and device, never calls the server sign-out", async () => {
    const h = harness();
    const session = await signedIn(h);
    await session.accountDeleted();
    expect(session.getState()).toEqual({ status: "accountDeleted" });
    expect(h.tokens.peek()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
    expect(h.wipeDevice).toHaveBeenCalledTimes(1);
    // The login is gone: there is nothing on the server to sign out of.
    expect(h.serverSignOut).not.toHaveBeenCalled();
  });

  it("deleted from deletionPending also wipes, and acknowledging goes to the sign-in screen", async () => {
    const h = harness();
    const session = await signedIn(h);
    session.deletionPending();
    expect(session.getState()).toEqual({ status: "deletionPending" });
    await session.accountDeleted();
    expect(session.getState()).toEqual({ status: "accountDeleted" });
    session.acknowledgeDeletion();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("deleted is ignored where no one is signed in, and wipes nothing", async () => {
    const h = harness();
    const session = createSession(h.deps);
    await session.restore();
    await session.accountDeleted();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.wipeDevice).not.toHaveBeenCalled();
  });

  it("an erased account found by the account check on launch shows the last step, never Offline", async () => {
    const h = harness({ account: async () => "account-deleted" });
    h.tokens.save("r_kept");
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "deletionPending" });
    // Nothing is cleared: the login still exists, and repeating the delete needs the session.
    expect(h.tokens.peek()).not.toBeNull();
    expect(h.wipeDevice).not.toHaveBeenCalled();
  });

  it("sign-out from the last step clears everything as usual", async () => {
    const h = harness();
    const session = await signedIn(h);
    session.deletionPending();
    await session.signOut();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.tokens.peek()).toBeNull();
    expect(h.wipeDevice).toHaveBeenCalledTimes(1);
  });
});

describe("reauthenticate", () => {
  it("the same person: saves the new refresh token first, swaps the access token, revokes the old session", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    const again = tokensFor("user_a");
    h.exchanges.push(ok(again));
    h.serverSignOut.mockImplementation(async () => {
      // The old session is revoked only once the new tokens are in place.
      expect(h.tokens.peek()).toBe(again.refreshToken);
      expect(session.getAccessToken()).toBe(again.accessToken);
      return "ended";
    });

    expect(await session.reauthenticate()).toBe("confirmed");
    expect(h.tokens.log.at(-1)).toBe(`save:${again.refreshToken}`);
    expect(session.getAccessToken()).toBe(again.accessToken);
    expect(h.serverSignOut).toHaveBeenCalledTimes(1);
    expect(h.serverSignOut).toHaveBeenCalledWith(first.accessToken);
    // It never leaves the state it started in, and the browser asked again (max_age=0).
    expect(session.getState()).toEqual({ status: "signedIn" });
    const url = h.browser.mock.calls.at(-1)?.[0] ?? "";
    expect(readQuery(url.split("?")[1] ?? "").max_age).toBe("0");
  });

  it("a different account: drops the new tokens unsaved and keeps the current session", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    const other = tokensFor("user_b");
    h.exchanges.push(ok(other));
    const saves = (h.tokens.save as jest.Mock).mock.calls.length;

    expect(await session.reauthenticate()).toBe("differentAccount");
    expect((h.tokens.save as jest.Mock).mock.calls.length).toBe(saves);
    expect(h.tokens.peek()).toBe(first.refreshToken);
    expect(session.getAccessToken()).toBe(first.accessToken);
    expect(session.getState()).toEqual({ status: "signedIn" });
    // Only the other account's new session is ended, never the current one.
    expect(h.serverSignOut).toHaveBeenCalledTimes(1);
    expect(h.serverSignOut).toHaveBeenCalledWith(other.accessToken);
  });

  it("a cancelled browser changes nothing", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    h.browser.mockResolvedValueOnce({ type: "closed" });
    const exchanges = h.workos.exchangeCode.mock.calls.length;

    expect(await session.reauthenticate()).toBe("cancelled");
    expect(h.workos.exchangeCode.mock.calls.length).toBe(exchanges);
    expect(h.tokens.peek()).toBe(first.refreshToken);
    expect(session.getAccessToken()).toBe(first.accessToken);
    expect(h.serverSignOut).not.toHaveBeenCalled();
    expect(session.getState()).toEqual({ status: "signedIn" });
  });

  it("a refused or unreachable exchange changes nothing and says which", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    h.exchanges.push({ ok: false, reason: "unavailable" });
    expect(await session.reauthenticate()).toBe("unavailable");
    h.exchanges.push({ ok: false, reason: "rejected" });
    expect(await session.reauthenticate()).toBe("failed");
    expect(h.tokens.peek()).toBe(first.refreshToken);
    expect(session.getAccessToken()).toBe(first.accessToken);
  });

  it("a token with no readable person is treated as a different account", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    h.exchanges.push(ok({ accessToken: "not-a-jwt", refreshToken: "r_odd" }));
    expect(await session.reauthenticate()).toBe("differentAccount");
    expect(h.tokens.peek()).toBe(first.refreshToken);
  });

  it.each([
    ["notInvited", async (): Promise<AccountCheck> => "not-invited"],
    ["termsRequired", async (): Promise<AccountCheck> => "terms-not-accepted"],
    ["deletionPending", async (): Promise<AccountCheck> => "account-deleted"],
  ] as const)("is allowed from %s and stays there", async (status, account) => {
    const h = harness({ account });
    const session = createSession(h.deps);
    await session.restore();
    await session.signIn();
    expect(session.getState()).toEqual({ status });
    h.exchanges.push(ok(tokensFor("user_a")));
    expect(await session.reauthenticate()).toBe("confirmed");
    expect(session.getState()).toEqual({ status });
  });

  it("is refused while signed out or offline, and opens no browser", async () => {
    const h = harness();
    const session = createSession(h.deps);
    await session.restore();
    expect(await session.reauthenticate()).toBe("failed");
    expect(h.browser).not.toHaveBeenCalled();
  });

  it("a sign-out while the browser is open drops the new tokens", async () => {
    const h = harness();
    const session = await signedIn(h);
    let close: (r: BrowserResult) => void = () => {};
    h.browser.mockImplementationOnce(
      (url: string) =>
        new Promise<BrowserResult>((resolve) => {
          close = resolve;
          void url;
        }),
    );
    const pending = session.reauthenticate();
    await session.signOut();
    const url = h.browser.mock.calls.at(-1)?.[0] ?? "";
    const q = readQuery(url.split("?")[1] ?? "");
    h.exchanges.push(ok(tokensFor("user_a")));
    close({ type: "success", url: `flump://auth/callback?code=late&state=${q.state}` });
    expect(await pending).toBe("failed");
    expect(h.tokens.peek()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
  });

  it("the same session id (WorkOS reusing it through the Custom Tab) is never revoked", async () => {
    const h = harness();
    const first = tokensFor("user_a", "session_shared");
    const session = await signedIn(h, first);
    const again = tokensFor("user_a", "session_shared");
    h.exchanges.push(ok(again));

    expect(await session.reauthenticate()).toBe("confirmed");
    expect(session.getAccessToken()).toBe(again.accessToken);
    expect(h.tokens.peek()).toBe(again.refreshToken);
    expect(h.serverSignOut).not.toHaveBeenCalled();
  });

  it("an old token with no readable session id is not revoked, since it may be the new one", async () => {
    const h = harness();
    const first = {
      accessToken: `${b64({ alg: "none" })}.${b64({ sub: "user_a" })}.x`,
      refreshToken: `r_nosid_${randomUUID()}`,
    };
    const session = await signedIn(h, first);
    h.exchanges.push(ok(tokensFor("user_a")));

    expect(await session.reauthenticate()).toBe("confirmed");
    expect(h.serverSignOut).not.toHaveBeenCalled();
  });

  it("a refresh that starts while the new tokens are being adopted joins them, never saving the old session's token over them", async () => {
    const h = harness();
    const first = tokensFor("user_a");
    const session = await signedIn(h, first);
    const again = tokensFor("user_a");
    h.exchanges.push(ok(again));
    const refreshes = h.workos.refresh.mock.calls.length;
    const read = h.tokens.read as jest.Mock;
    const realRead = read.getMockImplementation() as () => Promise<string | null>;
    let joined: Promise<string> | null = null;
    // The re-authentication's read of the old refresh token: an API call answers 401 just then.
    read.mockImplementationOnce(async () => {
      joined = session.refresh();
      return realRead();
    });

    expect(await session.reauthenticate()).toBe("confirmed");
    expect(await joined).toBe("refreshed");
    expect(h.workos.refresh.mock.calls.length).toBe(refreshes);
    expect(h.tokens.peek()).toBe(again.refreshToken);
    expect(session.getAccessToken()).toBe(again.accessToken);
  });
});

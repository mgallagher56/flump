import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { TokenResult, WorkosClient } from "../data/workos";
import { readQuery } from "./authorizeUrl";
import type { PkceCrypto } from "./pkce";
import { type AccountCheck, type BrowserResult, createSession, type SessionDeps } from "./session";
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
// Runtime-built test tokens: an access token with a session id, and opaque refresh tokens.
const accessFor = (sid: string) => `${b64({ alg: "none" })}.${b64({ sid })}.x`;
let counter = 0;
const newTokens = () => {
  counter += 1;
  return {
    accessToken: accessFor(`session_${counter}`),
    refreshToken: `r_${counter}_${randomUUID()}`,
  };
};

function memoryTokens(initial: string | null = null) {
  let value = initial;
  const log: string[] = [];
  const store: TokenStore & { peek(): string | null; log: string[] } = {
    read: jest.fn(async () => value),
    save: jest.fn(async (token: string) => {
      log.push("save");
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

interface Harness {
  deps: SessionDeps;
  tokens: ReturnType<typeof memoryTokens>;
  workos: { exchangeCode: jest.Mock; refresh: jest.Mock };
  browser: jest.Mock;
  account: jest.Mock;
}

function harness(
  over: {
    stored?: string | null;
    refresh?: () => Promise<TokenResult>;
    exchange?: (code: string, verifier: string) => Promise<TokenResult>;
    browser?: (url: string) => Promise<BrowserResult>;
    account?: () => Promise<AccountCheck>;
  } = {},
): Harness {
  const tokens = memoryTokens(over.stored ?? null);
  const workos = {
    exchangeCode: jest.fn(
      over.exchange ?? (async () => ({ ok: true, tokens: newTokens() }) as TokenResult),
    ),
    refresh: jest.fn(
      over.refresh ?? (async () => ({ ok: true, tokens: newTokens() }) as TokenResult),
    ),
  };
  // By default the sheet comes back with a code and the state it was given.
  const browser = jest.fn(
    over.browser ??
      (async (url: string): Promise<BrowserResult> => {
        const q = readQuery(url.split("?")[1] ?? "");
        return { type: "success", url: `flump://auth/callback?code=c1&state=${q.state}` };
      }),
  );
  const account = jest.fn(over.account ?? (async (): Promise<AccountCheck> => "ok"));
  const deps: SessionDeps = {
    config,
    crypto,
    workos: workos as unknown as WorkosClient,
    tokens,
    openBrowser: browser,
    checkAccount: account,
    endBrowserSessionOnSignOut: true,
  };
  return { deps, tokens, workos, browser, account };
}

async function signedOutSession(h: Harness) {
  const session = createSession(h.deps);
  await session.restore();
  expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  return session;
}

describe("restore on launch", () => {
  it("with nothing stored, shows the sign-in screen and calls nobody", async () => {
    const h = harness();
    await signedOutSession(h);
    expect(h.workos.refresh).not.toHaveBeenCalled();
    expect(h.account).not.toHaveBeenCalled();
  });

  it("refreshes, saves the new refresh token before using the new access token, and signs in", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    const seenAtSave: (string | null)[] = [];
    (h.tokens.save as jest.Mock).mockImplementation(async () => {
      seenAtSave.push(session.getAccessToken());
    });
    await session.restore();
    expect(h.workos.refresh).toHaveBeenCalledWith("r_old");
    expect(seenAtSave).toEqual([null]);
    expect(session.getAccessToken()).not.toBeNull();
    expect(session.getState()).toEqual({ status: "signedIn" });
  });

  it("a rejected refresh clears the device once and ends the session", async () => {
    const h = harness({
      stored: "r_old",
      refresh: async () => ({ ok: false, reason: "rejected" }),
    });
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "sessionEnded" });
    expect(h.tokens.peek()).toBeNull();
    expect(h.tokens.log).toEqual(["clear"]);
    expect(session.getAccessToken()).toBeNull();
  });

  it("no network keeps the refresh token and never ends the session", async () => {
    const h = harness({
      stored: "r_old",
      refresh: async () => ({ ok: false, reason: "unavailable" }),
    });
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(h.tokens.peek()).toBe("r_old");
    expect(h.tokens.clear).not.toHaveBeenCalled();
  });

  it.each<[AccountCheck, string]>([
    ["not-invited", "notInvited"],
    ["unavailable", "restoredOffline"],
  ])("an account check of %s goes to %s and keeps the token", async (check, status) => {
    const h = harness({ stored: "r_old", account: async () => check });
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status });
    expect(h.tokens.peek()).not.toBeNull();
  });

  it("a fresh token the API refuses ends the session and clears the device", async () => {
    const h = harness({ stored: "r_old", account: async () => "unauthorised" });
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "sessionEnded" });
    expect(h.tokens.peek()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
  });

  it("a store that cannot be read yet (a locked iPhone) keeps the session and calls nobody", async () => {
    const h = harness({ stored: "r_old" });
    (h.tokens.read as jest.Mock).mockRejectedValueOnce(new Error("locked"));
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(h.tokens.clear).not.toHaveBeenCalled();
    expect(h.workos.refresh).not.toHaveBeenCalled();
  });

  it("a token the store can never read: offline, kept, and Sign out from there clears it", async () => {
    const h = harness({ stored: "r_unreadable" });
    (h.tokens.read as jest.Mock).mockRejectedValue(new Error("cannot decrypt"));
    const session = createSession(h.deps);
    await session.restore();
    expect(session.getState()).toEqual({ status: "restoredOffline" });
    expect(h.tokens.peek()).toBe("r_unreadable");
    await session.signOut();
    expect(h.tokens.clear).toHaveBeenCalledTimes(1);
    expect(h.tokens.peek()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("retry from offline tries again and signs in", async () => {
    let online = false;
    const h = harness({
      stored: "r_old",
      refresh: async () =>
        online ? { ok: true, tokens: newTokens() } : { ok: false, reason: "unavailable" },
    });
    const session = createSession(h.deps);
    await session.restore();
    const seen: string[] = [];
    session.subscribe((s) => seen.push(s.status));
    online = true;
    await session.retry();
    expect(seen).toEqual(["loading", "signedIn"]);
  });
});

describe("sign-in", () => {
  it("sends an S256 challenge and the state, and exchanges with the matching verifier", async () => {
    const h = harness();
    const session = await signedOutSession(h);
    await session.signIn();
    const url = h.browser.mock.calls[0]?.[0] as string;
    const q = readQuery(url.split("?")[1] ?? "");
    expect(h.browser.mock.calls[0]?.[1]).toBe("flump://auth/callback");
    expect(q.code_challenge_method).toBe("S256");
    const [code, verifier] = h.workos.exchangeCode.mock.calls[0] as [string, string];
    expect(code).toBe("c1");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(q.code_challenge);
    expect(session.getState()).toEqual({ status: "signedIn" });
    expect(h.tokens.peek()).toMatch(/^r_/);
  });

  it("each sign-in uses a new verifier and state", async () => {
    const h = harness({ browser: async () => ({ type: "closed" }) });
    const session = await signedOutSession(h);
    await session.signIn();
    await session.signIn();
    const [first, second] = h.browser.mock.calls.map(([url]) =>
      readQuery(String(url).split("?")[1] ?? ""),
    );
    expect(first?.state).not.toBe(second?.state);
    expect(first?.code_challenge).not.toBe(second?.code_challenge);
  });

  it("Create account opens the sign-up page", async () => {
    const h = harness();
    const session = await signedOutSession(h);
    await session.signIn("sign-up");
    expect(readQuery(String(h.browser.mock.calls[0]?.[0]).split("?")[1] ?? "").screen_hint).toBe(
      "sign-up",
    );
  });

  it("closing the sheet returns to the screen with no message and no exchange", async () => {
    const h = harness({ browser: async () => ({ type: "closed" }) });
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(h.workos.exchangeCode).not.toHaveBeenCalled();
  });

  it("refuses a state mismatch before any exchange", async () => {
    const h = harness({
      browser: async () => ({ type: "success", url: "flump://auth/callback?code=c1&state=forged" }),
    });
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "signedOut", notice: "failed" });
    expect(h.workos.exchangeCode).not.toHaveBeenCalled();
    expect(h.tokens.save).not.toHaveBeenCalled();
  });

  it("access denied shows the denied message", async () => {
    const h = harness({
      browser: async (url) => {
        const q = readQuery(url.split("?")[1] ?? "");
        return {
          type: "success",
          url: `flump://auth/callback?error=access_denied&state=${q.state}`,
        };
      },
    });
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "signedOut", notice: "denied" });
  });

  it.each([
    ["rejected", "failed"],
    ["unavailable", "unavailable"],
  ] as const)("a %s exchange shows %s and stores nothing", async (reason, notice) => {
    const h = harness({ exchange: async () => ({ ok: false, reason }) });
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "signedOut", notice });
    expect(h.tokens.save).not.toHaveBeenCalled();
  });

  it("a person not on the beta lands on Not invited", async () => {
    const h = harness({ account: async () => "not-invited" });
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "notInvited" });
  });

  it("a second press while signing in opens nothing more", async () => {
    let finish: (r: BrowserResult) => void = () => {};
    const h = harness({ browser: () => new Promise((resolve) => (finish = resolve)) });
    const session = await signedOutSession(h);
    const first = session.signIn();
    await session.signIn();
    while (h.browser.mock.calls.length === 0) await new Promise((r) => setImmediate(r));
    finish({ type: "closed" });
    await first;
    expect(h.browser).toHaveBeenCalledTimes(1);
  });

  it("a store that refuses the token leaves nothing half signed in", async () => {
    const h = harness();
    (h.tokens.save as jest.Mock).mockRejectedValue(new Error("keystore"));
    const session = await signedOutSession(h);
    await session.signIn();
    expect(session.getState()).toEqual({ status: "signedOut", notice: "failed" });
    expect(session.getAccessToken()).toBeNull();
    expect(h.tokens.clear).toHaveBeenCalled();
  });
});

describe("refresh", () => {
  it("ten callers at once cause one refresh", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    h.workos.refresh.mockClear();
    const outcomes = await Promise.all(Array.from({ length: 10 }, () => session.refresh()));
    expect(outcomes).toEqual(Array(10).fill("refreshed"));
    expect(h.workos.refresh).toHaveBeenCalledTimes(1);
  });

  it("uses each refresh token once: the second refresh sends the replacement", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    const replaced = h.tokens.peek();
    await session.refresh();
    expect(h.workos.refresh.mock.calls.map(([t]) => t)).toEqual(["r_old", replaced]);
  });

  it("a rejected refresh while signed in ends the session; no network does not", async () => {
    let reason: "rejected" | "unavailable" = "unavailable";
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    h.workos.refresh.mockImplementation(async () => ({ ok: false, reason }));
    expect(await session.refresh()).toBe("retryable");
    expect(session.getState()).toEqual({ status: "signedIn" });
    reason = "rejected";
    expect(await session.refresh()).toBe("ended");
    expect(session.getState()).toEqual({ status: "sessionEnded" });
    expect(h.tokens.peek()).toBeNull();
  });

  it("a store that refuses the new refresh token reports retryable, not refreshed", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    const before = session.getAccessToken();
    (h.tokens.save as jest.Mock).mockRejectedValue(new Error("keystore"));
    expect(await session.refresh()).toBe("retryable");
    expect(session.getAccessToken()).toBe(before);
  });
});

describe("sign-out", () => {
  it("a refresh still in flight when the person signs out saves nothing afterwards", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    let answer: (r: TokenResult) => void = () => {};
    h.workos.refresh.mockImplementation(
      () => new Promise<TokenResult>((resolve) => (answer = resolve)),
    );
    const pending = session.refresh();
    while (h.workos.refresh.mock.calls.length < 2) await new Promise((r) => setImmediate(r));
    await session.signOut();
    answer({ ok: true, tokens: newTokens() });
    expect(await pending).toBe("ended");
    expect(h.tokens.peek()).toBeNull();
    expect(session.getAccessToken()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("a rejected refresh that lands after sign-out does not show Session ended", async () => {
    const h = harness({ stored: "r_old" });
    const session = createSession(h.deps);
    await session.restore();
    let answer: (r: TokenResult) => void = () => {};
    h.workos.refresh.mockImplementation(
      () => new Promise<TokenResult>((resolve) => (answer = resolve)),
    );
    const pending = session.refresh();
    while (h.workos.refresh.mock.calls.length < 2) await new Promise((r) => setImmediate(r));
    await session.signOut();
    answer({ ok: false, reason: "rejected" });
    await pending;
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("clears the device before any network, then ends the WorkOS session", async () => {
    const h = harness();
    const session = await signedOutSession(h);
    await session.signIn();
    const sid = JSON.parse(
      Buffer.from(String(session.getAccessToken()).split(".")[1] ?? "", "base64url").toString(),
    ).sid;
    const atLogout: { stored: string | null; access: string | null }[] = [];
    h.browser.mockImplementation(async () => {
      atLogout.push({ stored: h.tokens.peek(), access: session.getAccessToken() });
      return { type: "success", url: "flump://auth/callback" };
    });
    await session.signOut();
    expect(atLogout).toEqual([{ stored: null, access: null }]);
    const logoutUrl = String(h.browser.mock.calls.at(-1)?.[0]);
    expect(logoutUrl.split("?")[0]).toBe(
      "https://auth.test.invalid/user_management/sessions/logout",
    );
    expect(readQuery(logoutUrl.split("?")[1] ?? "").session_id).toBe(sid);
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("works with no network: a failing browser still leaves the device clear and signed out", async () => {
    const h = harness();
    const session = await signedOutSession(h);
    await session.signIn();
    h.browser.mockRejectedValue(new Error("offline"));
    await session.signOut();
    expect(h.tokens.peek()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("from Not invited signs out the same way", async () => {
    const h = harness({ account: async () => "not-invited" });
    const session = await signedOutSession(h);
    await session.signIn();
    await session.signOut();
    expect(h.tokens.peek()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("opens no logout page where the sign-in sheet keeps no cookies (iOS)", async () => {
    const h = harness();
    h.deps.endBrowserSessionOnSignOut = false;
    const session = await signedOutSession(h);
    await session.signIn();
    h.browser.mockClear();
    await session.signOut();
    expect(h.browser).not.toHaveBeenCalled();
    expect(h.tokens.peek()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });

  it("offline, with no access token, clears the device and opens no browser", async () => {
    const h = harness({
      stored: "r_old",
      refresh: async () => ({ ok: false, reason: "unavailable" }),
    });
    const session = createSession(h.deps);
    await session.restore();
    await session.signOut();
    expect(h.browser).not.toHaveBeenCalled();
    expect(h.tokens.peek()).toBeNull();
    expect(session.getState()).toEqual({ status: "signedOut", notice: null });
  });
});

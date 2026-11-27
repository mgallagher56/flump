/**
 * @jest-environment node
 */
/**
 * The app's real sign-in code (src/auth, src/data) against the fixture server's WorkOS stand-in and
 * canned /v1 (E12 S2a). Only the browser sheet and the secure store are stand-ins: the sheet follows
 * the authorize redirect with fetch, and the store is a memory map. PKCE, the exchange, the refresh,
 * the account check and the server sign-out are the code the phone runs.
 */
import { createHash, randomBytes } from "node:crypto";
import { type BrowserResult, createSession, type Session } from "../../src/auth/session";
import { runSignInCheck } from "../../src/auth/signInCheck";
import { createTokenStore, type SecureStoreLike } from "../../src/auth/tokenStore";
import { checkAccountWithToken, createAccountCheck } from "../../src/data/account";
import { createAppApiClient } from "../../src/data/apiClient";
import { createServerSignOut } from "../../src/data/serverSignOut";
import { createWorkosClient } from "../../src/data/workos";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

/** One key for the file: a fresh RSA key per test cost seconds of CI time. */
const signingKey = newSigningKey();

const CLIENT_ID = ["client", "e2e", randomBytes(4).toString("hex")].join("_");
const REDIRECT = "flump://auth/callback";

let server: FixtureServer;

beforeEach(async () => {
  server = await startFixtureServer({ port: 0, clientId: CLIENT_ID, signingKey });
});

afterEach(async () => {
  await server.close();
});

function memorySecureStore() {
  const items = new Map<string, string>();
  const store: SecureStoreLike = {
    getItemAsync: async (key) => items.get(key) ?? null,
    setItemAsync: async (key, value) => void items.set(key, value),
    deleteItemAsync: async (key) => void items.delete(key),
  };
  return { store, items };
}

/** The browser sheet: follows one redirect and stops at the app's address, as the real sheet does. */
const visited: string[] = [];
async function browser(url: string, redirectUri: string): Promise<BrowserResult> {
  visited.push(url.split("?")[0] ?? "");
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  return location.startsWith(redirectUri) ? { type: "success", url: location } : { type: "closed" };
}

function app(items?: ReturnType<typeof memorySecureStore>) {
  const secure = items ?? memorySecureStore();
  const config = { authBaseUrl: server.origin, clientId: CLIENT_ID, redirectUri: REDIRECT };
  const tokens = createTokenStore(secure.store, 1);
  let session: Session | undefined;
  const api = createAppApiClient({
    apiBaseUrl: server.origin,
    session: {
      getAccessToken: () => session?.getAccessToken() ?? null,
      refresh: () => session?.refresh() ?? Promise.resolve("ended"),
    },
    client: { version: "0.0.0", platform: "android" },
  });
  session = createSession({
    config,
    crypto: {
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
      sha256: async (text) => new Uint8Array(createHash("sha256").update(text, "ascii").digest()),
    },
    workos: createWorkosClient(config),
    tokens,
    openBrowser: browser,
    checkAccount: createAccountCheck(api),
    endServerSession: createServerSignOut(server.origin),
  });
  return { session, secure, api };
}

async function signedIn() {
  const phone = app();
  await phone.session.restore();
  await phone.session.signIn();
  expect(phone.session.getState()).toEqual({ status: "signedIn" });
  return phone;
}

describe("sign-in against the WorkOS stand-in", () => {
  it("signs in, stores only a refresh token and its hashed owner, and reads the profile", async () => {
    const { secure, session } = await signedIn();
    // The owner (E12 S7) is a SHA-256 of the sub in base64url, never the token or the raw sub.
    expect([...secure.items.keys()]).toEqual([
      "flump.auth.refresh-token",
      "flump.auth.cache-owner",
    ]);
    const owner = secure.items.get("flump.auth.cache-owner") ?? "";
    expect(owner).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const sub = JSON.parse(
      Buffer.from((session.getAccessToken() ?? "").split(".")[1] ?? "", "base64url").toString(),
    ).sub;
    expect(owner).not.toContain(sub);
    expect(session.getAccessToken()).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(server.stats()).toMatchObject({ exchanges: 1, apiRequests: 1 });
  });

  it("a later launch restores the session from the stored refresh token", async () => {
    const first = await signedIn();
    const relaunch = app(first.secure);
    await relaunch.session.restore();
    expect(relaunch.session.getState()).toEqual({ status: "signedIn" });
    expect(server.stats().refreshes).toBe(1);
  });

  it("access denied returns to sign-in with the denied message", async () => {
    server.setScenario({ signIn: "denied" });
    const phone = app();
    await phone.session.restore();
    await phone.session.signIn();
    expect(phone.session.getState()).toEqual({ status: "signedOut", notice: "denied" });
    expect(phone.secure.items.size).toBe(0);
  });

  it.each(["older", "newer"] as const)(
    "a %s backend's profile still signs in (version skew, PR #951)",
    async (backend) => {
      server.setScenario({ backend });
      const phone = app();
      await phone.session.restore();
      await phone.session.signIn();
      expect(phone.session.getState()).toEqual({ status: "signedIn" });
    },
  );

  it("a person not on the beta lands on Not invited", async () => {
    server.setScenario({ account: "not-invited" });
    const phone = app();
    await phone.session.restore();
    await phone.session.signIn();
    expect(phone.session.getState()).toEqual({ status: "notInvited" });
  });

  it("an expired access token is refreshed once and the request retried", async () => {
    server.setScenario({ accessTokenSeconds: 0 });
    const phone = app();
    await phone.session.restore();
    await phone.session.signIn();
    // The first token was already expired: one 401, one refresh, then a fresh-but-also-expired
    // token gets a second 401, which ends the session.
    expect(phone.session.getState()).toEqual({ status: "sessionEnded" });
    expect(server.stats().refreshes).toBe(1);
    expect(phone.secure.items.size).toBe(0);
  });

  it("a rejected refresh on launch ends the session and clears the device", async () => {
    const first = await signedIn();
    server.setScenario({ refresh: "rejected" });
    const relaunch = app(first.secure);
    await relaunch.session.restore();
    expect(relaunch.session.getState()).toEqual({ status: "sessionEnded" });
    expect(first.secure.items.size).toBe(0);
  });

  it("WorkOS unavailable on launch keeps the refresh token", async () => {
    const first = await signedIn();
    server.setScenario({ refresh: "unavailable" });
    const relaunch = app(first.secure);
    await relaunch.session.restore();
    expect(relaunch.session.getState()).toEqual({ status: "restoredOffline" });
    expect([...first.secure.items.keys()]).toEqual([
      "flump.auth.refresh-token",
      "flump.auth.cache-owner",
    ]);
  });

  it("sign-out clears the device, opens no browser and revokes the session on the server", async () => {
    const phone = await signedIn();
    const stored = [...phone.secure.items.values()][0] ?? "";
    visited.length = 0;
    await phone.session.signOut();
    expect(phone.session.getState()).toEqual({ status: "signedOut", notice: null });
    expect(phone.secure.items.size).toBe(0);
    expect(visited).toEqual([]);
    expect(server.stats().signOuts).toBe(1);
    // The refresh token taken off the phone no longer works anywhere.
    const workos = createWorkosClient({ authBaseUrl: server.origin, clientId: CLIENT_ID });
    expect(await workos.refresh(stored)).toEqual({ ok: false, reason: "rejected" });
  });

  it("sign-out with an expired access token refreshes in memory once and still revokes", async () => {
    const phone = await signedIn();
    server.setScenario({ accessTokenSeconds: 0 });
    // A refresh now issues an already expired access token, so the server call answers 401 first.
    await phone.session.refresh();
    const refreshesBefore = server.stats().refreshes;
    server.setScenario({ accessTokenSeconds: 300 });
    await phone.session.signOut();
    expect(server.stats().refreshes).toBe(refreshesBefore + 1);
    expect(server.stats().signOuts).toBe(1);
    expect(phone.secure.items.size).toBe(0);
  });

  it("every sign-in asks WorkOS for a fresh login (max_age=0), sign-in after sign-out included", async () => {
    const phone = await signedIn();
    expect(server.stats().lastAuthorizeMaxAge).toBe("0");
    await phone.session.signOut();
    await phone.session.signIn();
    expect(phone.session.getState()).toEqual({ status: "signedIn" });
    expect(server.stats().lastAuthorizeMaxAge).toBe("0");
  });
});

describe("the dev sign-in check against the WorkOS stand-in", () => {
  it("reports the stand-in's rotation, its issuer and lifetime, and the backend's answer", async () => {
    const phone = await signedIn();
    const config = { authBaseUrl: server.origin, clientId: CLIENT_ID };
    const report = await runSignInCheck({
      tokens: createTokenStore(phone.secure.store, 1),
      workos: createWorkosClient(config),
      checkAccountWith: (token) => checkAccountWithToken(server.origin, token),
      wait: async () => {},
      endServerSession: createServerSignOut(server.origin),
    });
    expect(report).toEqual({
      issuer: `${server.origin}/user_management/${CLIENT_ID}`,
      // `auth_time` since S9, as real WorkOS tokens carry it (the backend's recent sign-in check).
      claimNames: ["auth_time", "client_id", "exp", "iat", "iss", "sid", "sub"],
      // The stand-in's default lifetime: 300 seconds.
      accessLifetimeSeconds: 300,
      refreshWithoutSecret: "accepted",
      refreshTokenReplaced: true,
      // Inside the stand-in's 30 second grace period (its clock does not move here).
      oldRefreshTokenReused: "accepted",
      reuseGaveSameTokens: true,
      oldRefreshTokenAfterWait: "accepted",
      replacementAfterReuse: "accepted",
      lateReuseGaveSameTokens: true,
      serverSignOut: "ended",
      oldRefreshTokenAfterSignOut: "rejected",
      newestRefreshTokenAfterSignOut: "rejected",
      backend: "ok",
    });
    // The check ends with a server sign-out and an empty store.
    expect(phone.secure.items.size).toBe(0);
  });
});

describe("no token value leaks (storage design condition)", () => {
  it("across sign-in, refresh, a rejected refresh and sign-out, no token reaches the console, a thrown message or the state", async () => {
    const seen = new Set<string>();
    const output: string[] = [];
    const methods = ["log", "info", "warn", "error", "debug"] as const;
    const spies = methods.map((m) =>
      jest.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        output.push(
          args.map((a) => (a instanceof Error ? `${a.message} ${a.stack}` : String(a))).join(" "),
        );
      }),
    );
    const errors: string[] = [];
    try {
      const phone = app();
      const note = () => {
        for (const v of phone.secure.items.values()) if (v) seen.add(v);
        const access = phone.session.getAccessToken();
        if (access) seen.add(access);
        output.push(JSON.stringify(phone.session.getState()));
      };
      await phone.session.restore();
      await phone.session.signIn();
      note();
      await phone.session.refresh();
      note();
      server.setScenario({ refresh: "unavailable" });
      await phone.session.refresh();
      note();
      server.setScenario({ refresh: "rejected" });
      await phone.session.refresh();
      note();
      await phone.session.signIn();
      note();
      await phone.session.signOut();
      note();
      // A failing API call: its error message must not carry the bearer token.
      server.setScenario({ refresh: "ok", accessTokenSeconds: 0 });
      const again = app();
      await again.session.restore();
      await again.session.signIn();
      try {
        await again.api.request("/user-profile", { schema: null, allowEmpty: true });
      } catch (error) {
        errors.push(
          error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : String(error),
        );
      }
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
    const everything = [...output, ...errors].join("\n");
    for (const token of seen) expect(everything).not.toContain(token);
  });
});

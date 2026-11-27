/**
 * After an account deletion nothing readable remains on the device (E12 S9, plan 9.10 acceptance
 * 10): the real session controller, app lock, housekeeping, export sweep and query cache wired
 * together as `authDeps.ts` and `app/_layout.tsx` wire them, over in-memory stores. The theme is
 * the one thing kept, as at sign-out.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react-native";
import { useSyncExternalStore } from "react";
import { ApiProvider } from "../data/ApiProvider";
import { type ExportFiles, sweepExports } from "../data/exportData";
import { testQueryClient } from "../data/fakeApi";
import type { TokenResult, WorkosClient } from "../data/workos";
import { DEVICE_LOCK_KEY, THEME_KEY } from "../device/storageKeys";
import { readQuery } from "./authorizeUrl";
import { createDeviceHousekeeping } from "./deviceHousekeeping";
import { createAppLock } from "./deviceLock";
import { createSession, type Session } from "./session";
import { sessionHoldsData } from "./sessionMachine";
import { createTokenStore, REFRESH_TOKEN_KEY, type SecureStoreLike } from "./tokenStore";

const CACHE = "file:///cache/";

function memorySecureStore(): SecureStoreLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => void values.set(key, value),
    deleteItemAsync: async (key) => void values.delete(key),
  };
}

function memoryFiles(): ExportFiles & { files: Set<string> } {
  const files = new Set<string>();
  return {
    files,
    cacheDirectory: CACHE,
    makeDirectory: async () => {},
    download: async () => ({ status: 200, headers: {} }),
    readText: async () => "",
    move: async () => {},
    remove: async (uri) => {
      for (const file of [...files]) if (file.startsWith(uri)) files.delete(file);
    },
  };
}

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** The query cache, dropped whenever the session no longer holds data (as `app/_layout.tsx`). */
function DataLayer({ session, queryClient }: { session: Session; queryClient: QueryClient }) {
  const state = useSyncExternalStore(session.subscribe, session.getState);
  return (
    <ApiProvider client={null} queryClient={queryClient} signedIn={sessionHoldsData(state.status)}>
      {null}
    </ApiProvider>
  );
}

it("a deletion leaves no token, cached answer, lock flag or export file; the theme stays", async () => {
  const secure = memorySecureStore();
  const files = memoryFiles();
  const screenCapture = { prevent: jest.fn(async () => {}), allow: jest.fn(async () => {}) };
  const lock = createAppLock({
    screenCapture,
    auth: {
      getEnrolledLevelAsync: async () => 3,
      authenticateAsync: async () => ({ success: true }),
    },
    store: secure,
    accessible: 0,
    now: () => 0,
    isExempt: () => false,
    prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
  });
  const housekeeping = createDeviceHousekeeping({
    sweepExports: () => sweepExports(files),
    clearLock: () => lock.clear(),
  });
  const tokens = {
    accessToken: `${b64({ alg: "none" })}.${b64({ sub: "user_a", sid: "s1" })}.x`,
    refreshToken: `r_${randomUUID()}`,
  };
  const serverSignOut = jest.fn(async () => "ended" as const);
  const session = createSession({
    config: {
      authBaseUrl: "https://auth.test.invalid",
      clientId: "client_TESTONLY",
      redirectUri: "flump://auth/callback",
    },
    crypto: {
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
      sha256: async (text) => new Uint8Array(createHash("sha256").update(text, "ascii").digest()),
    },
    workos: {
      exchangeCode: async (): Promise<TokenResult> => ({ ok: true, tokens }),
      refresh: async (): Promise<TokenResult> => ({ ok: true, tokens }),
    } as WorkosClient,
    tokens: createTokenStore(secure, 0),
    openBrowser: async (url) => ({
      type: "success",
      url: `flump://auth/callback?code=c1&state=${readQuery(url.split("?")[1] ?? "").state}`,
    }),
    checkAccount: async () => "ok",
    endServerSession: serverSignOut,
    wipeDevice: housekeeping.wipe,
  });

  // Signed in, with the lock on, a theme chosen, figures cached and an export file left behind.
  await session.restore();
  await session.signIn();
  await lock.start();
  expect(await lock.turnOn()).toBe("on");
  secure.values.set(THEME_KEY, "dark");
  files.files.add(`${CACHE}exports/flump-export-2026-11-27.json`);
  const queryClient = testQueryClient();
  queryClient.setQueryData(["accounts"], [{ balance: 52100 }]);
  await render(<DataLayer session={session} queryClient={queryClient} />);
  expect(secure.values.get(REFRESH_TOKEN_KEY)).toBe(tokens.refreshToken);
  expect(queryClient.getQueryData(["accounts"])).toBeDefined();

  await act(async () => {
    await session.accountDeleted();
  });

  expect(session.getState()).toEqual({ status: "accountDeleted" });
  expect(session.getAccessToken()).toBeNull();
  expect(secure.values.has(REFRESH_TOKEN_KEY)).toBe(false);
  expect(secure.values.has(DEVICE_LOCK_KEY)).toBe(false);
  expect(lock.getPhase()).toBe("off");
  // Screenshots and the recents card, blocked while the lock was on, are allowed again.
  expect(screenCapture.prevent).toHaveBeenCalledTimes(1);
  expect(screenCapture.allow).toHaveBeenCalledTimes(1);
  expect([...files.files]).toEqual([]);
  expect(queryClient.getQueryCache().getAll()).toEqual([]);
  // The one thing kept, as at sign-out.
  expect([...secure.values.keys()]).toEqual([THEME_KEY]);
  // The login is gone, so no server sign-out is sent.
  expect(serverSignOut).not.toHaveBeenCalled();
});

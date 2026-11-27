/**
 * The real devices behind the session (plan section 5.2): expo-crypto for PKCE, expo-secure-store
 * for the refresh token, the system browser sheet from expo-web-browser, and the app's API client.
 * Everything else in `src/auth` is plain code tested on Node.
 */
import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import type * as LocalAuthentication from "expo-local-authentication";
import type * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform, Settings } from "react-native";
import type { AuthConfig, MobileConfig } from "../config";
import { APP_LOCK } from "../copy/accountData";
import { createAccountCheck } from "../data/account";
import { type ApiClient, createAppApiClient } from "../data/apiClient";
import { createUpdateCheck, type UpdateCheck } from "../data/clientPolicy";
import { createDeleteAccount, DELETE_TIMEOUT_MS } from "../data/deleteAccount";
import { createDeviceCacheStore } from "../data/deviceCache";
import { createDeviceFiles, createShareSheet, createSweepFiles } from "../data/deviceFiles";
import { createExportData, sweepExports } from "../data/exportData";
import { sweepHttpCache } from "../data/httpCacheSweep";
import { createOfflineCache, type OfflineCache } from "../data/offlineCache";
import { createServerSignOut } from "../data/serverSignOut";
import { createWorkosClient } from "../data/workos";
import type { AccountDataActions } from "../features/account-data/useAccountData";
import { createBrowserActivity, createDeviceHousekeeping } from "./deviceHousekeeping";
import { deviceKeys } from "./deviceKeys";
import { type AppLock, createAppLock, type ScreenCaptureGuard } from "./deviceLock";
import { offlineAwareAccessToken } from "./offlineAccess";
import { wipeAfterReinstall } from "./reinstall";
import { type BrowserResult, createSession, type Session } from "./session";
import { createTokenStore } from "./tokenStore";

const pkceCrypto = {
  randomBytes: (count: number) => Crypto.getRandomBytes(count),
  async sha256(text: string) {
    // The verifier is base64url, so ASCII: one byte per character.
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0));
    return new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
  },
};

/** Whether the sign-in browser is open: the app lock does not count that time as time away. */
const browserActivity = createBrowserActivity();

async function openSystemBrowser(url: string, redirectUri: string): Promise<BrowserResult> {
  // iOS: a private session, so no WorkOS cookie is kept. Android: a Custom Tab, which shares
  // Chrome's cookies; `max_age=0` in the address makes WorkOS ask again all the same.
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri, {
    preferEphemeralSession: true,
  });
  return result.type === "success" ? { type: "success", url: result.url } : { type: "closed" };
}

const openBrowser = (url: string, redirectUri: string) =>
  browserActivity.track(() => openSystemBrowser(url, redirectUri));

/**
 * Android only: FLAG_SECURE on the app's window while app lock is on, so the recents card is blank
 * and screenshots are refused. Not on iOS, where the same call also blocks screen recording and
 * the gate's cover handles the app switcher. Absent from a build without the module.
 */
function createScreenCaptureGuard(): ScreenCaptureGuard | undefined {
  if (Platform.OS !== "android" || !requireOptionalNativeModule("ExpoScreenCapture")) {
    return undefined;
  }
  const capture: typeof ScreenCapture = require("expo-screen-capture");
  return {
    prevent: () => capture.preventScreenCaptureAsync(),
    allow: () => capture.allowScreenCaptureAsync(),
  };
}

/**
 * The app lock, when this app binary carries expo-local-authentication (a development build from
 * before S9 does not): the module is required only once it is known to be there.
 */
function createDeviceAppLock(): AppLock | undefined {
  if (!requireOptionalNativeModule("ExpoLocalAuthentication")) return undefined;
  const auth: typeof LocalAuthentication = require("expo-local-authentication");
  return createAppLock({
    auth,
    store: SecureStore,
    screenCapture: createScreenCaptureGuard(),
    accessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    now: () => Date.now(),
    isExempt: browserActivity.isOpen,
    prompts: {
      unlock: APP_LOCK.promptUnlock,
      turnOn: APP_LOCK.promptTurnOn,
      turnOff: APP_LOCK.promptTurnOff,
    },
  });
}

export function createAppSession(config: { api: MobileConfig; auth: AuthConfig }): {
  session: Session;
  api: ApiClient;
  checkForUpdate: UpdateCheck;
  accountData: AccountDataActions;
  appLock: AppLock | undefined;
  offlineCache: OfflineCache | undefined;
} {
  const version = Constants.expoConfig?.version ?? "0.0.0";
  let session: Session | undefined;
  const platform = Platform.OS === "ios" ? "ios" : "android";
  // The clients are built before the session they ask; their calls happen only after sign-in starts.
  // Restored offline, a read first tries one quiet reconnect (E12 S7): pull to refresh, a screen
  // opening or the app coming back to the front then brings fresh figures once Flump answers.
  const sessionForApi = {
    getAccessToken: () => (session ? offlineAwareAccessToken(session)() : null),
    refresh: () => session?.refresh() ?? Promise.resolve("ended" as const),
  };
  const api = createAppApiClient({
    apiBaseUrl: config.api.apiBaseUrl,
    session: sessionForApi,
    client: { version, platform },
  });
  // Deleting every row can take longer than an ordinary write (web's DELETE_TIMEOUT_MS).
  const deletionApi = createAppApiClient({
    apiBaseUrl: config.api.apiBaseUrl,
    session: sessionForApi,
    client: { version, platform },
    timeoutMs: DELETE_TIMEOUT_MS,
  });
  const accessible = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  const tokens = createTokenStore(SecureStore, accessible);
  const files = createDeviceFiles();
  const appLock = createDeviceAppLock();
  // The offline cache (E12 S7): sealed with AES-256-GCM, its key beside the refresh token.
  const cacheStore = createDeviceCacheStore(SecureStore, accessible);
  const offlineCache = cacheStore
    ? createOfflineCache({
        store: cacheStore,
        now: () => Date.now(),
        // Sealed for the person whose session is stored; the session exists before any read.
        owner: () => session?.cacheOwner() ?? Promise.resolve(null),
      })
    : undefined;
  const housekeeping = createDeviceHousekeeping({
    sweepExports: () => sweepExports(files),
    sweepHttpCache: () => sweepHttpCache(createSweepFiles()),
    clearLock: async () => {
      await appLock?.clear();
    },
    // iOS keeps Keychain items after an uninstall; Android removes the app's storage with it.
    reinstallWipe:
      Platform.OS === "ios"
        ? () => wipeAfterReinstall(Settings, tokens, deviceKeys(SecureStore, accessible))
        : undefined,
  });
  session = createSession({
    config: config.auth,
    crypto: pkceCrypto,
    workos: createWorkosClient(config.auth),
    tokens,
    openBrowser,
    checkAccount: createAccountCheck(api),
    endServerSession: createServerSignOut(config.api.apiBaseUrl),
    beforeFirstRestore: housekeeping.onLaunch,
    wipeDevice: housekeeping.wipe,
    clearCache: async () => {
      await offlineCache?.wipe();
    },
  });
  const accountData: AccountDataActions = {
    exportData: createExportData({
      apiBaseUrl: config.api.apiBaseUrl,
      session,
      files,
      share: createShareSheet(),
      clientHeader: `mobile/${version} (${platform})`,
    }),
    deleteAccount: createDeleteAccount(deletionApi),
  };
  return {
    session,
    api,
    checkForUpdate: createUpdateCheck(api, version),
    accountData,
    appLock,
    offlineCache,
  };
}

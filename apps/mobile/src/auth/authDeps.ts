/**
 * The real devices behind the session (plan section 5.2): expo-crypto for PKCE, expo-secure-store
 * for the refresh token, the system browser sheet from expo-web-browser, and the app's API client.
 * Everything else in `src/auth` is plain code tested on Node.
 */
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform, Settings } from "react-native";
import type { AuthConfig, MobileConfig } from "../config";
import { createAccountCheck } from "../data/account";
import { type ApiClient, createAppApiClient } from "../data/apiClient";
import { createUpdateCheck, type UpdateCheck } from "../data/clientPolicy";
import { createServerSignOut } from "../data/serverSignOut";
import { createWorkosClient } from "../data/workos";
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

async function openBrowser(url: string, redirectUri: string): Promise<BrowserResult> {
  // iOS: a private session, so no WorkOS cookie is kept. Android: a Custom Tab, which shares
  // Chrome's cookies; `max_age=0` in the address makes WorkOS ask again all the same.
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri, {
    preferEphemeralSession: true,
  });
  return result.type === "success" ? { type: "success", url: result.url } : { type: "closed" };
}

export function createAppSession(config: { api: MobileConfig; auth: AuthConfig }): {
  session: Session;
  api: ApiClient;
  checkForUpdate: UpdateCheck;
} {
  const version = Constants.expoConfig?.version ?? "0.0.0";
  let session: Session | undefined;
  const api = createAppApiClient({
    apiBaseUrl: config.api.apiBaseUrl,
    // The client is built before the session it asks; both calls happen only after sign-in starts.
    session: {
      getAccessToken: () => session?.getAccessToken() ?? null,
      refresh: () => session?.refresh() ?? Promise.resolve("ended"),
    },
    client: {
      version,
      platform: Platform.OS === "ios" ? "ios" : "android",
    },
  });
  const tokens = createTokenStore(SecureStore, SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
  session = createSession({
    config: config.auth,
    crypto: pkceCrypto,
    workos: createWorkosClient(config.auth),
    tokens,
    openBrowser,
    checkAccount: createAccountCheck(api),
    endServerSession: createServerSignOut(config.api.apiBaseUrl),
    // iOS keeps Keychain items after an uninstall; Android removes the app's storage with it.
    beforeFirstRestore:
      Platform.OS === "ios" ? () => wipeAfterReinstall(Settings, tokens) : undefined,
  });
  return { session, api, checkForUpdate: createUpdateCheck(api, version) };
}

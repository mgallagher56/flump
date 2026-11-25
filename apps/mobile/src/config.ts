/**
 * Checked public config for the app (E12 S1a). Nothing secret lives here: Expo inlines every
 * `EXPO_PUBLIC_*` value into the bundle. S1a makes no network call; the API address is only parsed
 * and shown on the dev engine check screen, so a bad value is caught before any slice uses it.
 */

/** Hosts where plain HTTP is allowed in a development build. 10.0.2.2 is the Android emulator's name for the computer it runs on. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "10.0.2.2"]);

/** A computer on the same network, by its Bonjour name (for example `my-mac.local`). */
const isLocalNetworkName = (host: string) => /^[a-z0-9-]+\.local$/i.test(host);

export type MobileConfigErrorCode =
  | "missing-api-url"
  | "invalid-api-url"
  | "insecure-api-url"
  | "http-not-local"
  | "missing-client-id"
  | "invalid-client-id"
  | "workos-override-in-release";

export class MobileConfigError extends Error {
  override readonly name = "MobileConfigError";
  constructor(
    readonly code: MobileConfigErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface MobileConfig {
  /** The `/v1` API origin, without a trailing slash. */
  readonly apiBaseUrl: string;
}

export interface ConfigSource {
  readonly EXPO_PUBLIC_API_URL?: string;
}

/**
 * Read and check the config. A release build accepts HTTPS only. A development build also accepts
 * plain HTTP to a local host, so the app can reach a backend running on the developer's computer.
 */
export function readConfig(source: ConfigSource, options: { releaseBuild: boolean }): MobileConfig {
  return { apiBaseUrl: checkedOrigin("EXPO_PUBLIC_API_URL", source.EXPO_PUBLIC_API_URL, options) };
}

/** The sign-in redirect registered with WorkOS (owner step OS1). The app's `scheme` is `flump`. */
export const AUTH_REDIRECT_URI = "flump://auth/callback";

const WORKOS_API_URL = "https://api.workos.com";

/**
 * A WorkOS client id: public, never a secret (an API key starts `sk_` and must never be in the app).
 * Real ids are `client_` and upper-case letters and digits; the e2e stand-in uses lower case.
 */
const CLIENT_ID = /^client_[A-Za-z0-9_]+$/;

export interface AuthConfig {
  readonly clientId: string;
  /** The WorkOS API origin: api.workos.com, or the fixture server in an e2e build. */
  readonly authBaseUrl: string;
  readonly redirectUri: string;
}

export interface AuthConfigSource {
  readonly EXPO_PUBLIC_WORKOS_CLIENT_ID?: string;
  readonly EXPO_PUBLIC_WORKOS_API_URL?: string;
}

/** Read and check the sign-in config, under the same address rules as the API. */
export function readAuthConfig(
  source: AuthConfigSource,
  options: { releaseBuild: boolean },
): AuthConfig {
  const clientId = source.EXPO_PUBLIC_WORKOS_CLIENT_ID?.trim();
  if (!clientId) {
    throw new MobileConfigError("missing-client-id", "EXPO_PUBLIC_WORKOS_CLIENT_ID is not set.");
  }
  if (!CLIENT_ID.test(clientId)) {
    throw new MobileConfigError(
      "invalid-client-id",
      "EXPO_PUBLIC_WORKOS_CLIENT_ID is not a WorkOS client id.",
    );
  }
  const override = source.EXPO_PUBLIC_WORKOS_API_URL?.trim();
  // The override exists for the e2e fixture server only. A release build always talks to WorkOS,
  // so a stray build variable can never send sign-in codes or refresh tokens anywhere else.
  if (override && options.releaseBuild) {
    throw new MobileConfigError(
      "workos-override-in-release",
      "EXPO_PUBLIC_WORKOS_API_URL must not be set in a release build.",
    );
  }
  const authBaseUrl = override
    ? checkedOrigin("EXPO_PUBLIC_WORKOS_API_URL", override, options)
    : WORKOS_API_URL;
  return { clientId, authBaseUrl, redirectUri: AUTH_REDIRECT_URI };
}

/**
 * An address's origin. A release build accepts HTTPS only. A development build also accepts plain
 * HTTP to a local host, so the app can reach a server running on the developer's computer.
 */
function checkedOrigin(
  name: string,
  value: string | undefined,
  options: { releaseBuild: boolean },
): string {
  const raw = value?.trim();
  if (!raw) {
    throw new MobileConfigError("missing-api-url", `${name} is not set.`);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MobileConfigError("invalid-api-url", `${name} is not a valid address.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new MobileConfigError(
      "invalid-api-url",
      `${name} must be an HTTPS address (or HTTP to a local host in a development build).`,
    );
  }
  if (url.protocol === "http:") {
    if (options.releaseBuild) {
      throw new MobileConfigError(
        "insecure-api-url",
        `A release build must use an HTTPS address for ${name}.`,
      );
    }
    if (!LOCAL_HOSTS.has(url.hostname) && !isLocalNetworkName(url.hostname)) {
      throw new MobileConfigError(
        "http-not-local",
        "Plain HTTP is allowed only for a local host in a development build.",
      );
    }
  }

  return url.origin;
}

/** The config for this build, from the values Expo inlined at bundle time. */
export function loadConfig(): MobileConfig {
  return readConfig(
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
    { releaseBuild: !__DEV__ },
  );
}

/** The sign-in config for this build, from the values Expo inlined at bundle time. */
export function loadAuthConfig(): AuthConfig {
  return readAuthConfig(
    {
      EXPO_PUBLIC_WORKOS_CLIENT_ID: process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID,
      EXPO_PUBLIC_WORKOS_API_URL: process.env.EXPO_PUBLIC_WORKOS_API_URL,
    },
    { releaseBuild: !__DEV__ },
  );
}

export interface SiteConfig {
  /** The marketing site, home of the legal pages the sign-in screen links to. */
  readonly marketingOrigin: string;
}

export interface SiteConfigSource {
  readonly EXPO_PUBLIC_MARKETING_URL?: string;
}

export function readSiteConfig(
  source: SiteConfigSource,
  options: { releaseBuild: boolean },
): SiteConfig {
  return {
    marketingOrigin: checkedOrigin(
      "EXPO_PUBLIC_MARKETING_URL",
      source.EXPO_PUBLIC_MARKETING_URL,
      options,
    ),
  };
}

/** Everything sign-in needs, read once. Throws `MobileConfigError` on any bad value. */
export function loadSignInConfig(): { api: MobileConfig; auth: AuthConfig; site: SiteConfig } {
  const options = { releaseBuild: !__DEV__ };
  return {
    api: loadConfig(),
    auth: loadAuthConfig(),
    site: readSiteConfig(
      { EXPO_PUBLIC_MARKETING_URL: process.env.EXPO_PUBLIC_MARKETING_URL },
      options,
    ),
  };
}

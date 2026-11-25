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
  | "http-not-local";

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
  const raw = source.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new MobileConfigError("missing-api-url", "EXPO_PUBLIC_API_URL is not set.");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MobileConfigError("invalid-api-url", "EXPO_PUBLIC_API_URL is not a valid address.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new MobileConfigError("invalid-api-url", "EXPO_PUBLIC_API_URL must use HTTPS.");
  }
  if (url.protocol === "http:") {
    if (options.releaseBuild) {
      throw new MobileConfigError(
        "insecure-api-url",
        "A release build must use an HTTPS address for EXPO_PUBLIC_API_URL.",
      );
    }
    if (!LOCAL_HOSTS.has(url.hostname) && !isLocalNetworkName(url.hostname)) {
      throw new MobileConfigError(
        "http-not-local",
        "Plain HTTP is allowed only for a local host in a development build.",
      );
    }
  }

  return { apiBaseUrl: url.origin };
}

/** The config for this build, from the values Expo inlined at bundle time. */
export function loadConfig(): MobileConfig {
  return readConfig(
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
    { releaseBuild: !__DEV__ },
  );
}

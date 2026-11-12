import { decodeSeedPayload, encodeSeedPayload, type ProfilePersistenceAdapter } from "./profile.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

export { InMemoryProfileAdapter, type ProfilePersistenceAdapter } from "./profile.js";

export const ONBOARDING_SEED_STORAGE_KEY = "flump_onboarding_seed";
export const SESSION_PRESENCE_COOKIE = "flump_has_session";
/**
 * The seed carries salary, debts and savings, and the cookie is readable by script and sent with
 * every request to the host, so it lives for one hour (long enough to finish sign-up).
 */
export const ONBOARDING_SEED_MAX_AGE_SECONDS = 3600;

/** Cookies are Secure on https pages, so the seed never travels over plain http. */
function secureAttr(): string {
  try {
    return typeof window !== "undefined" && window.location?.protocol === "https:"
      ? "; Secure"
      : "";
  } catch {
    return "";
  }
}

/**
 * Storage driver interface decoupling persistence mechanics from browser globals.
 */
export interface SeedStorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  getCookie(name: string): string | null;
  setCookie(name: string, value: string, maxAgeSeconds: number, domain?: string): void;
  removeCookie(name: string, domain?: string): void;
}

/**
 * In-memory storage driver for pure calculation tests and server-side execution.
 */
export class InMemoryStorageDriver implements SeedStorageDriver {
  private items = new Map<string, string>();
  private cookies = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  getCookie(name: string): string | null {
    return this.cookies.get(name) ?? null;
  }
  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }
  removeCookie(name: string): void {
    this.cookies.delete(name);
  }
  clear(): void {
    this.items.clear();
    this.cookies.clear();
  }
}

/**
 * Browser storage driver accessing localStorage and document.cookie safely.
 */
export class BrowserStorageDriver implements SeedStorageDriver {
  getItem(key: string): string | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage write quota or security errors
    }
  }

  removeItem(key: string): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    return parseCookieValue(document.cookie, name);
  }

  setCookie(name: string, value: string, maxAgeSeconds: number, domain?: string): void {
    if (typeof document === "undefined") return;
    try {
      const domainAttr = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${domainAttr}${secureAttr()}`;
    } catch {
      // Ignore
    }
  }

  removeCookie(name: string, domain?: string): void {
    if (typeof document === "undefined") return;
    try {
      const domainAttr = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${domainAttr}${secureAttr()}`;
    } catch {
      // Ignore
    }
  }
}

const defaultBrowserDriver = new BrowserStorageDriver();
const defaultMemoryDriver = new InMemoryStorageDriver();
let customStorageDriver: SeedStorageDriver | null = null;

/**
 * Sets the active storage driver (pass null or undefined to reset to automatic environment detection).
 */
export function setStorageDriver(driver: SeedStorageDriver | null = null): void {
  customStorageDriver = driver;
}

/**
 * Gets the current storage driver, automatically selecting BrowserStorageDriver when browser globals exist.
 */
export function getStorageDriver(): SeedStorageDriver {
  if (customStorageDriver) return customStorageDriver;
  if (typeof window !== "undefined" || typeof document !== "undefined") {
    return defaultBrowserDriver;
  }
  return defaultMemoryDriver;
}

/**
 * Extracts a cookie value by name from a raw cookie string (e.g. document.cookie or Request header).
 */
export function parseCookieValue(
  rawCookie: string | null | undefined,
  name: string,
): string | null {
  if (!rawCookie) return null;
  const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  const val = match?.[1];
  return val ? decodeURIComponent(val) : null;
}

/**
 * Safely persists onboarding seed state across both localStorage and root cookies (host-only).
 */
export function persistOnboardingSeed(payload: any): void {
  const driver = getStorageDriver();
  const encoded = encodeSeedPayload(payload);
  driver.setItem(ONBOARDING_SEED_STORAGE_KEY, encoded);
  driver.setCookie(ONBOARDING_SEED_STORAGE_KEY, encoded, ONBOARDING_SEED_MAX_AGE_SECONDS);
}

/**
 * Safely reads the onboarding seed state from cookies or localStorage.
 */
export function readOnboardingSeed(): any | null {
  const driver = getStorageDriver();

  // 1. Try reading from cookie
  const cookieVal = driver.getCookie(ONBOARDING_SEED_STORAGE_KEY);
  if (cookieVal) {
    const decoded = decodeSeedPayload(cookieVal);
    if (decoded) return decoded;
  }

  // 2. Fall back to localStorage
  const raw = driver.getItem(ONBOARDING_SEED_STORAGE_KEY);
  if (raw) {
    const decoded = decodeSeedPayload(raw);
    if (decoded) return decoded;
  }

  return null;
}

/**
 * Reads onboarding seed payload from a server-side request Cookie header.
 */
export function readOnboardingSeedFromHeader(cookieHeader: string | null | undefined): any | null {
  if (!cookieHeader) return null;
  try {
    const raw = parseCookieValue(cookieHeader, ONBOARDING_SEED_STORAGE_KEY);
    if (!raw) return null;
    return decodeSeedPayload(raw);
  } catch {
    return null;
  }
}

/**
 * Safely clears the onboarding seed state from both localStorage and cookies.
 */
export function clearOnboardingSeed(): void {
  const driver = getStorageDriver();
  driver.removeItem(ONBOARDING_SEED_STORAGE_KEY);
  driver.removeCookie(ONBOARDING_SEED_STORAGE_KEY);
}

/**
 * Safely reads and clears the onboarding seed state.
 */
export function readAndClearOnboardingSeed(): any | null {
  const result = readOnboardingSeed();
  clearOnboardingSeed();
  return result;
}

/**
 * Checks whether an active user session exists based on the cross-domain presence cookie.
 */
export function hasSessionPresenceCookie(rawCookie?: string): boolean {
  if (rawCookie !== undefined) {
    return parseCookieValue(rawCookie, SESSION_PRESENCE_COOKIE) === "1";
  }
  return getStorageDriver().getCookie(SESSION_PRESENCE_COOKIE) === "1";
}

/**
 * Sets or clears the presence cookie (flump_has_session=1), host-only unless a domain is passed.
 */
export function setSessionPresenceCookie(active: boolean): void {
  const driver = getStorageDriver();
  if (active) {
    driver.setCookie(SESSION_PRESENCE_COOKIE, "1", 2592000);
  } else {
    driver.removeCookie(SESSION_PRESENCE_COOKIE);
  }
}

/**
 * Browser cookie adapter implementing ProfilePersistenceAdapter.
 */
export class BrowserCookieSeedAdapter implements ProfilePersistenceAdapter {
  private fallbackBaseline: FinancialBaseline | null = null;

  getBaseline(): FinancialBaseline | null {
    return this.fallbackBaseline;
  }

  saveBaseline(baseline: FinancialBaseline): void {
    this.fallbackBaseline = { ...baseline };
  }

  getSeed(): OnboardingSeedPayload | null {
    return readOnboardingSeed();
  }

  saveSeed(seed: OnboardingSeedPayload): void {
    persistOnboardingSeed(seed);
  }

  clearSeed(): void {
    clearOnboardingSeed();
  }
}

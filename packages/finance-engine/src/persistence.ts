import { decodeSeedPayload, encodeSeedPayload, type ProfilePersistenceAdapter } from "./profile.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

export { InMemoryProfileAdapter, type ProfilePersistenceAdapter } from "./profile.js";

export const ONBOARDING_SEED_STORAGE_KEY = "flump_onboarding_seed";
export const SESSION_PRESENCE_COOKIE = "flump_has_session";

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

function getCookieDomainAttr(): string {
  if (typeof window === "undefined" || !window.location) return "";
  const host = window.location.hostname;
  if (host === "flump.co.uk" || host.endsWith(".flump.co.uk")) {
    return "; domain=.flump.co.uk";
  }
  return "";
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
      const domainAttr = domain ? `; domain=${domain}` : getCookieDomainAttr();
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${domainAttr}`;
    } catch {
      // Ignore
    }
  }

  removeCookie(name: string, domain?: string): void {
    if (typeof document === "undefined") return;
    try {
      const domainAttr = domain ? `; domain=${domain}` : getCookieDomainAttr();
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
    } catch {
      // Ignore
    }
  }
}

let activeStorageDriver: SeedStorageDriver =
  typeof window !== "undefined" ? new BrowserStorageDriver() : new InMemoryStorageDriver();

/**
 * Sets the active storage driver (e.g. for testing in-memory without browser globals).
 */
export function setStorageDriver(driver: SeedStorageDriver): void {
  activeStorageDriver = driver;
}

/**
 * Gets the current storage driver.
 */
export function getStorageDriver(): SeedStorageDriver {
  return activeStorageDriver;
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
 * Safely persists onboarding seed state across both localStorage and root cookies (.flump.co.uk).
 */
export function persistOnboardingSeed(payload: any): void {
  const encoded = encodeSeedPayload(payload);
  activeStorageDriver.setItem(ONBOARDING_SEED_STORAGE_KEY, encoded);
  activeStorageDriver.setCookie(ONBOARDING_SEED_STORAGE_KEY, encoded, 86400);
}

/**
 * Safely reads the onboarding seed state from cookies or localStorage.
 */
export function readOnboardingSeed(): any | null {
  // 1. Try reading from cookie
  const cookieVal = activeStorageDriver.getCookie(ONBOARDING_SEED_STORAGE_KEY);
  if (cookieVal) {
    const decoded = decodeSeedPayload(cookieVal);
    if (decoded) return decoded;
  }

  // 2. Fall back to localStorage
  const raw = activeStorageDriver.getItem(ONBOARDING_SEED_STORAGE_KEY);
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
  activeStorageDriver.removeItem(ONBOARDING_SEED_STORAGE_KEY);
  activeStorageDriver.removeCookie(ONBOARDING_SEED_STORAGE_KEY);
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
  return activeStorageDriver.getCookie(SESSION_PRESENCE_COOKIE) === "1";
}

/**
 * Sets or clears the cross-domain presence cookie (flump_has_session=1) on .flump.co.uk.
 */
export function setSessionPresenceCookie(active: boolean): void {
  if (active) {
    activeStorageDriver.setCookie(SESSION_PRESENCE_COOKIE, "1", 2592000);
  } else {
    activeStorageDriver.removeCookie(SESSION_PRESENCE_COOKIE);
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

import { decodeSeedPayload, encodeSeedPayload } from "@flump/finance-engine";
import { calculateUKEWNITakeHome, getCurrentUKTaxYear } from "./taxRules.js";

export type { OnboardingSeedPayload } from "@flump/finance-engine";
export {
  DEFAULT_FINANCIAL_BASELINE,
  decodeSeedPayload,
  encodeSeedPayload,
  financialBaselineToUserProfileUpdate,
  hydrateBaselineFromSeed,
  InMemoryProfileAdapter,
  userProfileToFinancialBaseline,
} from "@flump/finance-engine";

export const ONBOARDING_SEED_STORAGE_KEY = "flump_onboarding_seed";
export const SESSION_PRESENCE_COOKIE = "flump_has_session";

function getCookieDomainAttr(): string {
  if (typeof window === "undefined" || !window.location) return "";
  const host = window.location.hostname;
  if (host === "flump.co.uk" || host.endsWith(".flump.co.uk")) {
    return "; domain=.flump.co.uk";
  }
  return "";
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
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Safely persists onboarding seed state across both localStorage and root cookies (.flump.co.uk).
 */
export function persistOnboardingSeed(payload: any): void {
  const encoded = encodeSeedPayload(payload);

  if (typeof window !== "undefined") {
    if (window.localStorage) {
      try {
        window.localStorage.setItem(ONBOARDING_SEED_STORAGE_KEY, encoded);
      } catch (err) {
        console.error("Failed to persist onboarding seed to localStorage:", err);
      }
    }

    if (typeof document !== "undefined") {
      try {
        const domainAttr = getCookieDomainAttr();
        document.cookie = `${ONBOARDING_SEED_STORAGE_KEY}=${encodeURIComponent(encoded)}; path=/; max-age=86400; SameSite=Lax${domainAttr}`;
      } catch (err) {
        console.error("Failed to persist onboarding seed cookie:", err);
      }
    }
  }
}

/**
 * Safely reads the onboarding seed state from cookies or localStorage.
 */
export function readOnboardingSeed(): any | null {
  if (typeof window === "undefined") return null;

  // 1. Try reading from cookie
  if (typeof document !== "undefined") {
    try {
      const cookieVal = parseCookieValue(document.cookie, ONBOARDING_SEED_STORAGE_KEY);
      if (cookieVal) {
        const decoded = decodeSeedPayload(cookieVal);
        if (decoded) return decoded;
      }
    } catch {
      // Continue to localStorage fallback
    }
  }

  // 2. Fall back to localStorage
  if (window.localStorage) {
    try {
      const raw = window.localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY);
      if (!raw) return null;
      return decodeSeedPayload(raw);
    } catch {
      return null;
    }
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
  if (typeof window === "undefined") return;

  if (window.localStorage) {
    try {
      window.localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  if (typeof document !== "undefined") {
    try {
      const domainAttr = getCookieDomainAttr();
      document.cookie = `${ONBOARDING_SEED_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
    } catch {
      // Ignore
    }
  }
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
  const cookieSource = rawCookie ?? (typeof document !== "undefined" ? document.cookie : "");
  return parseCookieValue(cookieSource, SESSION_PRESENCE_COOKIE) === "1";
}

/**
 * Sets or clears the cross-domain presence cookie (flump_has_session=1) on .flump.co.uk.
 */
export function setSessionPresenceCookie(active: boolean): void {
  if (typeof document === "undefined") return;
  const domainAttr = getCookieDomainAttr();
  if (active) {
    document.cookie = `${SESSION_PRESENCE_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax${domainAttr}`;
  } else {
    document.cookie = `${SESSION_PRESENCE_COOKIE}=; path=/; max-age=0; SameSite=Lax${domainAttr}`;
  }
}

import {
  type CompoundTrajectoryPoint,
  type CompoundTrajectoryResult,
  calculateCompoundTrajectory,
  calculateMortgageVsIsa,
  calculateSection24LandlordTax,
  calculateTaxTrapRelief,
  type MortgageVsIsaResult,
  type Section24Result,
  type TaxTrapAnalysis,
} from "@flump/finance-engine";

export {
  type CompoundTrajectoryPoint,
  type CompoundTrajectoryResult,
  calculateCompoundTrajectory,
  calculateMortgageVsIsa,
  calculateSection24LandlordTax,
  calculateTaxTrapRelief,
  type MortgageVsIsaResult,
  type Section24Result,
  type TaxTrapAnalysis,
};

export function calculateUKTakeHome(
  grossSalary: number,
  pensionContributionPct = 5,
  salarySacrifice = true,
  taxYear = getCurrentUKTaxYear(),
) {
  const result = calculateUKEWNITakeHome(
    grossSalary,
    "employed",
    pensionContributionPct,
    salarySacrifice,
    taxYear,
  );

  const trapAnalysis = calculateTaxTrapRelief(grossSalary, taxYear as any);

  return {
    ...result,
    trapAnalysis,
  };
}

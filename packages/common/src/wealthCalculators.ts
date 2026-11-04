import { calculateUKEWNITakeHome, getCurrentUKTaxYear } from "./taxRules.js";

export interface OnboardingSeedPayload {
  annualIncome?: number;
  grossSalary?: number;
  pensionContributionPct?: number;
  salarySacrifice?: boolean;
  initialCashSavings?: number;
  initialInvestments?: number;
  monthlyContribution?: number;
  mortgageBalance?: number;
  isSelfEmployed?: boolean;
  inferredModules: Array<
    "accounts" | "budget" | "savings" | "pension" | "mortgage" | "tax" | "forecast" | "debt"
  >;
  timestamp: number;
}

export const ONBOARDING_SEED_STORAGE_KEY = "flump_onboarding_seed";

function scramble(str: string): string {
  if (typeof btoa !== "function") return str;
  try {
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= 0x5f;
    }
    return btoa(String.fromCharCode(...bytes));
  } catch {
    return btoa(encodeURIComponent(str));
  }
}

function unscramble(b64: string): string {
  if (typeof atob !== "function") return b64;
  try {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i) ^ 0x5f;
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(atob(b64));
    } catch {
      return b64;
    }
  }
}

/**
 * Safely persists onboarding seed state without exposing clear-text sensitive fields.
 */
export function persistOnboardingSeed(payload: OnboardingSeedPayload): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const normalized: OnboardingSeedPayload = {
      ...payload,
      annualIncome: payload.annualIncome ?? payload.grossSalary,
    };
    delete normalized.grossSalary;
    const serialized = JSON.stringify(normalized);
    window.localStorage.setItem(ONBOARDING_SEED_STORAGE_KEY, scramble(serialized));
  } catch (err) {
    console.error("Failed to persist onboarding seed:", err);
  }
}

/**
 * Safely reads the onboarding seed state without clearing it.
 */
export function readOnboardingSeed(): OnboardingSeedPayload | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY);
    if (!raw) return null;
    const jsonStr = unscramble(raw);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Safely clears the onboarding seed state.
 */
export function clearOnboardingSeed(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Safely reads and clears the onboarding seed state.
 */
export function readAndClearOnboardingSeed(): OnboardingSeedPayload | null {
  const result = readOnboardingSeed();
  clearOnboardingSeed();
  return result;
}

export interface CompoundTrajectoryPoint {
  year: number;
  contributions: number;
  interest: number;
  total: number;
}

export interface CompoundTrajectoryResult {
  endBalance: number;
  totalContributions: number;
  totalInterest: number;
  points: CompoundTrajectoryPoint[];
}

/**
 * Calculates compound growth over a given number of years.
 * Default 5% real growth rate. Compounded monthly.
 */
export function calculateCompoundTrajectory(
  initialPrincipal: number,
  monthlyContribution: number,
  annualReturnRatePct = 5,
  years = 10,
): CompoundTrajectoryResult {
  const principal = Math.max(0, initialPrincipal || 0);
  const monthly = Math.max(0, monthlyContribution || 0);
  const rate = Math.max(0, annualReturnRatePct || 0) / 100;
  const monthlyRate = rate / 12;

  let balance = principal;
  let totalContributed = principal;
  const points: CompoundTrajectoryPoint[] = [
    { year: 0, contributions: principal, interest: 0, total: principal },
  ];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      totalContributed += monthly;
    }
    const totalInterest = Math.max(0, balance - totalContributed);
    points.push({
      year: y,
      contributions: Math.round(totalContributed),
      interest: Math.round(totalInterest),
      total: Math.round(balance),
    });
  }

  const finalInterest = Math.max(0, balance - totalContributed);

  return {
    endBalance: Math.round(balance),
    totalContributions: Math.round(totalContributed),
    totalInterest: Math.round(finalInterest),
    points,
  };
}

export interface TaxTrapAnalysis {
  grossIncome: number;
  isInTaxTrap: boolean;
  isNearTaxTrap: boolean;
  marginalRatePct: number;
  excessAbove100k: number;
  recommendedSacrifice: number;
  estimatedTaxSaved: number;
  lostPersonalAllowance: number;
}

/**
 * Analyzes UK £100k - £125k tax trap where personal allowance tapers by £1 for every £2 of income above £100,000,
 * causing an effective 60% income tax rate (+2% Class 1 NI = 62% marginal tax trap).
 */
export function calculateTaxTrapRelief(
  grossIncome: number,
  _taxYear = getCurrentUKTaxYear(),
): TaxTrapAnalysis {
  const income = Math.max(0, grossIncome || 0);
  const isInTaxTrap = income >= 100000 && income <= 125140;
  const isNearTaxTrap = income >= 95000 && income < 100000;

  let marginalRatePct = 20;
  if (income <= 12570) {
    marginalRatePct = 0;
  } else if (income <= 50270) {
    marginalRatePct = 28; // 20% IT + 8% NI
  } else if (income <= 100000) {
    marginalRatePct = 42; // 40% IT + 2% NI
  } else if (income <= 125140) {
    marginalRatePct = 62; // 40% IT + 20% tapered PA + 2% NI
  } else {
    marginalRatePct = 47; // 45% IT + 2% NI
  }

  const excessAbove100k = Math.max(0, Math.min(income - 100000, 25140));
  const lostPersonalAllowance = Math.round(excessAbove100k / 2);
  const recommendedSacrifice = excessAbove100k;

  // With full salary sacrifice of excess:
  // Income tax saved: 40% on excess + 40% on restored allowance = 60% of excess
  // Class 1 NI saved: 2% on excess
  // Total saving is 62% of the sacrificed amount
  const estimatedTaxSaved = Math.round(recommendedSacrifice * 0.62);

  return {
    grossIncome: income,
    isInTaxTrap,
    isNearTaxTrap,
    marginalRatePct,
    excessAbove100k: Math.round(excessAbove100k),
    recommendedSacrifice: Math.round(recommendedSacrifice),
    estimatedTaxSaved,
    lostPersonalAllowance,
  };
}

/**
 * Simple calculation helper for UK take-home pay, pension, NI and tax.
 */
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

  const trapAnalysis = calculateTaxTrapRelief(grossSalary, taxYear);

  return {
    ...result,
    trapAnalysis,
  };
}

import { calculateUKEWNITakeHome, getCurrentUKTaxYear } from "./taxRules.js";

export interface OnboardingSeedPayload {
  mode?: "DEBT" | "WEALTH";
  age?: number;
  annualIncome?: number;
  annualGrossSalary?: number;
  monthlyTakeHomeOverride?: number;
  pensionContributionPct?: number;
  salarySacrifice?: boolean;
  isSalarySacrifice?: boolean;
  housingStatus?: "RENTING" | "MORTGAGE" | "OWN_OUTRIGHT";
  monthlyHousingCost?: number;
  propertyValue?: number;
  mortgageBalance?: number;
  monthlyOtherOutgoings?: number;
  totalCashSavings?: number;
  totalPensionPot?: number;
  totalUnsecuredDebt?: number;
  initialCashSavings?: number;
  initialInvestments?: number;
  monthlyContribution?: number;
  studentLoanPlan?: string;
  isSelfEmployed?: boolean;
  inferredModules: Array<
    "accounts" | "budget" | "savings" | "pension" | "mortgage" | "tax" | "forecast" | "debt"
  >;
  timestamp: number;
}

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
export function persistOnboardingSeed(payload: OnboardingSeedPayload): void {
  const serialized = JSON.stringify(payload);
  const scrambled = scramble(serialized);

  if (typeof window !== "undefined") {
    if (window.localStorage) {
      try {
        window.localStorage.setItem(ONBOARDING_SEED_STORAGE_KEY, scrambled);
      } catch (err) {
        console.error("Failed to persist onboarding seed to localStorage:", err);
      }
    }

    if (typeof document !== "undefined") {
      try {
        const domainAttr = getCookieDomainAttr();
        document.cookie = `${ONBOARDING_SEED_STORAGE_KEY}=${encodeURIComponent(scrambled)}; path=/; max-age=86400; SameSite=Lax${domainAttr}`;
      } catch (err) {
        console.error("Failed to persist onboarding seed cookie:", err);
      }
    }
  }
}

/**
 * Safely reads the onboarding seed state from cookies or localStorage.
 */
export function readOnboardingSeed(): OnboardingSeedPayload | null {
  if (typeof window === "undefined") return null;

  // 1. Try reading from cookie
  if (typeof document !== "undefined") {
    try {
      const cookieVal = parseCookieValue(document.cookie, ONBOARDING_SEED_STORAGE_KEY);
      if (cookieVal) {
        const jsonStr = unscramble(cookieVal);
        return JSON.parse(jsonStr);
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
      const jsonStr = unscramble(raw);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Reads onboarding seed payload from a server-side request Cookie header.
 */
export function readOnboardingSeedFromHeader(
  cookieHeader: string | null | undefined,
): OnboardingSeedPayload | null {
  if (!cookieHeader) return null;
  try {
    const raw = parseCookieValue(cookieHeader, ONBOARDING_SEED_STORAGE_KEY);
    if (!raw) return null;
    const jsonStr = unscramble(raw);
    return JSON.parse(jsonStr);
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
export function readAndClearOnboardingSeed(): OnboardingSeedPayload | null {
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

export interface Section24Result {
  actualCashProfit: number;
  section24TaxableProfit: number;
  grossTaxOnProperty: number;
  financeCredit: number;
  finalTaxDue: number;
  oldRulesTax: number;
  section24Penalty: number;
  effectiveTaxRate: number;
  netRentalIncomeAfterTax: number;
  isHigherRate: boolean;
}

export function calculateSection24LandlordTax(
  employmentIncome: number,
  rentalIncome: number,
  mortgageInterest: number,
  allowableExpenses: number,
): Section24Result {
  const actualCashProfit = Math.max(0, rentalIncome - mortgageInterest - allowableExpenses);
  const section24TaxableProfit = Math.max(0, rentalIncome - allowableExpenses);
  const isHigherRate = employmentIncome >= 50270;
  const taxRate = isHigherRate ? 0.4 : 0.2;
  const grossTaxOnProperty = section24TaxableProfit * taxRate;
  const financeCredit = Math.max(0, mortgageInterest * 0.2);
  const finalTaxDue = Math.max(0, grossTaxOnProperty - financeCredit);
  const oldRulesTax = actualCashProfit * taxRate;
  const section24Penalty = Math.max(0, finalTaxDue - oldRulesTax);
  const effectiveTaxRate =
    actualCashProfit > 0 ? Math.min(100, Math.round((finalTaxDue / actualCashProfit) * 100)) : 100;
  const netRentalIncomeAfterTax = Math.max(0, actualCashProfit - finalTaxDue);

  return {
    actualCashProfit,
    section24TaxableProfit,
    grossTaxOnProperty,
    financeCredit,
    finalTaxDue,
    oldRulesTax,
    section24Penalty,
    effectiveTaxRate,
    netRentalIncomeAfterTax,
    isHigherRate,
  };
}

export interface MortgageVsIsaResult {
  standardPayment: number;
  interestSaved: number;
  monthsShaved: number;
  yearsShaved: string;
  totalStandardInterest: number;
  totalInterestOverpay: number;
  isaAccumulatedValue: number;
  totalIsaContributed: number;
  isaGrowth: number;
  netWealthDelta: number;
}

export function calculateMortgageVsIsa(
  mortgageBalance: number,
  interestRate: number,
  remainingYears: number,
  monthlyOverpay: number,
  expectedIsaReturn: number,
): MortgageVsIsaResult {
  const months = remainingYears * 12;
  const monthlyRate = interestRate / 100 / 12;
  const monthlyIsaRate = expectedIsaReturn / 100 / 12;

  const standardPayment =
    monthlyRate > 0
      ? (mortgageBalance * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1)
      : mortgageBalance / months;

  let bal = mortgageBalance;
  let totalInterestOverpay = 0;
  let monthsToZero = 0;
  for (let m = 1; m <= months; m++) {
    if (bal <= 0) break;
    const interest = bal * monthlyRate;
    totalInterestOverpay += interest;
    const principal = Math.min(bal, standardPayment + monthlyOverpay - interest);
    bal -= principal;
    monthsToZero = m;
  }

  let standardBal = mortgageBalance;
  let totalStandardInterest = 0;
  for (let m = 1; m <= months; m++) {
    if (standardBal <= 0) break;
    const interest = standardBal * monthlyRate;
    totalStandardInterest += interest;
    const principal = Math.min(standardBal, standardPayment - interest);
    standardBal -= principal;
  }

  const interestSaved = Math.max(0, totalStandardInterest - totalInterestOverpay);
  const monthsShaved = Math.max(0, months - monthsToZero);
  const yearsShaved = (monthsShaved / 12).toFixed(1);

  let isaPot = 0;
  for (let m = 1; m <= months; m++) {
    isaPot = (isaPot + monthlyOverpay) * (1 + monthlyIsaRate);
  }
  const totalIsaContributed = monthlyOverpay * months;
  const isaGrowth = Math.max(0, isaPot - totalIsaContributed);
  const netWealthDelta = isaPot - (totalIsaContributed + interestSaved);

  return {
    standardPayment,
    interestSaved,
    monthsShaved,
    yearsShaved,
    totalStandardInterest,
    totalInterestOverpay,
    isaAccumulatedValue: isaPot,
    totalIsaContributed,
    isaGrowth,
    netWealthDelta,
  };
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

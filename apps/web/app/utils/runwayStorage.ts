import { PortfolioSnapshot } from "@flump/finance-engine";
import { toMonthly } from "~/types/budget";

/** The one saved runway preference: which accounts count towards the pool. */
export interface RunwaySavedSettings {
  includedAccounts: Record<string, boolean>;
}

/**
 * Session-only scenario inputs. They live in component or container memory, are never written to
 * storage and never feed a headline figure (scenario-zone spec).
 */
export interface RunwayScenario {
  keptIncome: Record<string, boolean>;
  keptExpenses: Record<string, boolean>;
  severanceLump: number;
  extraMonthlyCut: number;
}

export const RUNWAY_STORAGE_KEY = "flump_runway_calculator_settings";

export function loadRunwaySettings(): RunwaySavedSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RUNWAY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Older versions also stored scenario inputs here. They are ignored: only the account
    // preference is a saved fact.
    return { includedAccounts: parsed.includedAccounts || {} };
  } catch {
    return null;
  }
}

export function saveRunwaySettings(settings: RunwaySavedSettings): void {
  if (typeof window === "undefined") return;
  try {
    const saved: RunwaySavedSettings = { includedAccounts: settings.includedAccounts };
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function clearRunwaySettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RUNWAY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function isLiquidAccountType(type?: string): boolean {
  if (!type) return false;
  const t = type.toLowerCase().trim();
  return (
    t === "current" ||
    t === "saving" ||
    t === "savings" ||
    t === "investment" ||
    t === "investments"
  );
}

export interface CalculateRunwayParams {
  entries: any[];
  accounts: any[];
  accountDetails?: any[];
  savedSettings?: RunwaySavedSettings | null;
}

export interface RunwayCalculationResult {
  pool: number;
  monthlyBurn: number;
  runwayMonths: number | null;
  runwayLabel: string;
  shortLabel: string;
}

/** Baseline runway: saved account preference only, never scenario inputs. */
export function calculateRunwayStats({
  entries,
  accounts,
  accountDetails = [],
  savedSettings,
}: CalculateRunwayParams): RunwayCalculationResult {
  const liquidAccounts = (accounts || []).filter((a) => isLiquidAccountType(a.type));
  const snapshot = new PortfolioSnapshot(accounts, accountDetails);

  let pool = 0;
  if (savedSettings?.includedAccounts) {
    pool = liquidAccounts
      .filter((a) => savedSettings.includedAccounts[a.id] !== false)
      .reduce((sum, a) => sum + snapshot.getLatestBalance(a.id), 0);
  } else {
    pool = liquidAccounts.reduce((sum, a) => sum + snapshot.getLatestBalance(a.id), 0);
  }

  // An overdrawn account must never produce a negative runway.
  pool = Math.max(0, pool);

  const incomeEntries = (entries || []).filter((e) => e.isIncome);
  const hasExplicitPrimary = incomeEntries.some((e) => e.isPrimaryIncome);
  const primaryId = hasExplicitPrimary
    ? incomeEntries.find((e) => e.isPrimaryIncome)?.id
    : incomeEntries.slice().sort((a, b) => toMonthly(b) - toMonthly(a))[0]?.id;

  const nonPrimaryIncome = (entries || [])
    .filter((e) => {
      if (!e.isIncome) return false;
      if (hasExplicitPrimary ? e.isPrimaryIncome : e.id === primaryId) return false;
      return true;
    })
    .reduce((s, e) => s + toMonthly(e), 0);

  const expenses = (entries || [])
    .filter((e) => {
      if (e.isIncome) return false;
      // By default: ONLY essential expenses, and EXCLUDE savings transfers
      return e.isEssential && e.category !== "savings";
    })
    .reduce((s, e) => s + toMonthly(e), 0);

  const monthlyBurn = Math.max(0, expenses - nonPrimaryIncome);
  const runwayMonths = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;

  const years = Math.floor(runwayMonths / 12);
  const months = Math.floor(runwayMonths % 12);
  const runwayLabel =
    monthlyBurn === 0
      ? "Infinite (No burn)"
      : runwayMonths > 120
        ? `${Math.floor(runwayMonths / 12)}+ years`
        : years > 0
          ? months > 0
            ? `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`
            : `${years} year${years !== 1 ? "s" : ""}`
          : `${Math.floor(runwayMonths)} months`;

  const shortLabel =
    monthlyBurn === 0
      ? "No burn"
      : runwayMonths > 120
        ? `${Math.floor(runwayMonths / 12)}+ yrs`
        : years > 0
          ? months > 0
            ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
            : `${years} yr${years !== 1 ? "s" : ""}`
          : `${Math.round(runwayMonths * 10) / 10} mos`;

  return {
    pool,
    monthlyBurn,
    runwayMonths: Number.isFinite(runwayMonths) ? Math.round(runwayMonths * 10) / 10 : null,
    runwayLabel,
    shortLabel,
  };
}

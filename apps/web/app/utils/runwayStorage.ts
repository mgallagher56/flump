import { toMonthly } from "~/types/budget";

export interface RunwaySavedSettings {
  includedAccounts: Record<string, boolean>;
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
    return {
      includedAccounts: parsed.includedAccounts || {},
      keptIncome: parsed.keptIncome || {},
      keptExpenses: parsed.keptExpenses || {},
      severanceLump: Number(parsed.severanceLump) || 0,
      extraMonthlyCut: Number(parsed.extraMonthlyCut) || 0,
    };
  } catch {
    return null;
  }
}

export function saveRunwaySettings(settings: RunwaySavedSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RUNWAY_STORAGE_KEY, JSON.stringify(settings));
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

export function calculateRunwayStats({
  entries,
  accounts,
  accountDetails = [],
  savedSettings,
}: CalculateRunwayParams): RunwayCalculationResult {
  const liquidAccounts = (accounts || []).filter((a) => isLiquidAccountType(a.type));

  let pool = 0;
  if (savedSettings?.includedAccounts) {
    pool =
      liquidAccounts
        .filter((a) => savedSettings.includedAccounts[a.id] !== false)
        .reduce((sum, a) => {
          const details = (accountDetails || [])
            .filter((d: any) => (d.account_id || d.accountId) === a.id)
            .sort((x: any, y: any) =>
              Number(x.year) !== Number(y.year)
                ? Number(y.year) - Number(x.year)
                : Number(y.month) - Number(x.month),
            );
          const latestVal = details.length > 0 ? Number(details[0].value) : 0;
          const bal =
            Number.isFinite(latestVal) && latestVal > 0 ? latestVal : Number(a.balance) || 0;
          return sum + Math.max(bal, 0);
        }, 0) + (savedSettings.severanceLump || 0);
  } else {
    pool = liquidAccounts.reduce((sum, a) => {
      const details = (accountDetails || [])
        .filter((d: any) => (d.account_id || d.accountId) === a.id)
        .sort((x: any, y: any) =>
          Number(x.year) !== Number(y.year)
            ? Number(y.year) - Number(x.year)
            : Number(y.month) - Number(x.month),
        );
      const latestVal = details.length > 0 ? Number(details[0].value) : 0;
      const bal = Number.isFinite(latestVal) && latestVal > 0 ? latestVal : Number(a.balance) || 0;
      return sum + Math.max(bal, 0);
    }, 0);
  }

  const nonPrimaryIncome = (entries || [])
    .filter((e) => {
      if (!e.isIncome || e.isPrimaryIncome) return false;
      if (savedSettings?.keptIncome) {
        return savedSettings.keptIncome[e.id] !== false;
      }
      return true;
    })
    .reduce((s, e) => s + toMonthly(e), 0);

  const expenses = (entries || [])
    .filter((e) => {
      if (e.isIncome) return false;
      if (savedSettings?.keptExpenses) {
        return !!savedSettings.keptExpenses[e.id];
      }
      // By default: ONLY essential expenses, and EXCLUDE savings transfers
      return e.isEssential && e.category !== "savings";
    })
    .reduce((s, e) => s + toMonthly(e), 0);

  const extraCut = savedSettings?.extraMonthlyCut || 0;
  const monthlyBurn = Math.max(0, expenses - nonPrimaryIncome - extraCut);
  const runwayMonths = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;

  const years = Math.floor(runwayMonths / 12);
  const months = Math.floor(runwayMonths % 12);
  const runwayLabel =
    monthlyBurn === 0
      ? "Infinite (No burn)"
      : runwayMonths > 120
        ? `${Math.floor(runwayMonths / 12)}+ years`
        : years > 0
          ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
          : `${Math.floor(runwayMonths)} months`;

  const shortLabel =
    monthlyBurn === 0
      ? "No burn"
      : runwayMonths > 120
        ? `${Math.floor(runwayMonths / 12)}+ yrs`
        : years > 0
          ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
          : `${Math.round(runwayMonths * 10) / 10} mos`;

  return {
    pool,
    monthlyBurn,
    runwayMonths: Number.isFinite(runwayMonths) ? Math.round(runwayMonths * 10) / 10 : null,
    runwayLabel,
    shortLabel,
  };
}

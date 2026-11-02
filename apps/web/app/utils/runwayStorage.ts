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

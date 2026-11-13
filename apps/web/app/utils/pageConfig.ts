export type AppPageKey =
  | "accounts"
  | "budget"
  | "debt"
  | "savings"
  | "pension"
  | "mortgage"
  | "tax";

export type DashboardWidgetKey = AppPageKey;

export interface AppPageConfig {
  key: AppPageKey;
  label: string;
  route: string;
  description: string;
  category: "core" | "wealth" | "planning";
  badgeColor: string;
}

export interface DashboardWidgetMeta {
  key: DashboardWidgetKey;
  label: string;
  route: string;
  description: string;
  badgeColor: string;
}

export const ALL_PAGE_KEYS: AppPageKey[] = [
  "accounts",
  "budget",
  "debt",
  "savings",
  "pension",
  "mortgage",
  "tax",
];

export const APP_PAGES: Record<AppPageKey, AppPageConfig> = {
  accounts: {
    key: "accounts",
    label: "Accounts",
    route: "/app/accounts",
    description: "Multi-account tracking, bank sync, and historical balance logs",
    category: "core",
    badgeColor: "var(--colors-primary)",
  },
  budget: {
    key: "budget",
    label: "Budget",
    route: "/app/budget",
    description: "Income and expense categorisation, cash flow surplus, and runway calculator",
    category: "core",
    badgeColor: "var(--colors-chart-warning)",
  },
  debt: {
    key: "debt",
    label: "Debt",
    route: "/app/debt",
    description:
      "Avalanche and snowball payoff engine, 0% promotional expiry tracker, and wealth bridge",
    category: "core",
    badgeColor: "var(--colors-status-danger-text)",
  },
  savings: {
    key: "savings",
    label: "Savings",
    route: "/app/savings",
    description: "High-yield accounts, interest rate (AER) tracking, and compound growth",
    category: "wealth",
    badgeColor: "var(--colors-chart-wealth)",
  },
  pension: {
    key: "pension",
    label: "Pension",
    route: "/app/pension",
    description: "Workplace pots, employee and employer contributions, and salary sacrifice",
    category: "wealth",
    badgeColor: "var(--colors-chart-accent-purple)",
  },
  mortgage: {
    key: "mortgage",
    label: "Mortgage",
    route: "/app/mortgage",
    description: "Loan amortisation, overpayment simulator, and savings comparison",
    category: "wealth",
    badgeColor: "var(--colors-chart-warning)",
  },
  tax: {
    key: "tax",
    label: "Self Assessment",
    route: "/app/self-assessment",
    description: "Self-employed and rental property P&L logs with UK tax liability estimates",
    category: "planning",
    badgeColor: "var(--colors-chart-series2)",
  },
};

export const DASHBOARD_WIDGET_METAS: Record<DashboardWidgetKey, DashboardWidgetMeta> = {
  accounts: APP_PAGES.accounts,
  budget: APP_PAGES.budget,
  debt: APP_PAGES.debt,
  savings: APP_PAGES.savings,
  pension: APP_PAGES.pension,
  mortgage: APP_PAGES.mortgage,
  tax: APP_PAGES.tax,
};

export const ALL_DASHBOARD_WIDGET_KEYS: DashboardWidgetKey[] = [...ALL_PAGE_KEYS];

/**
 * Opt-in modules are off by default and switched on in Profile (or by onboarding when the user is
 * self-employed). Self Assessment is the only one today (E16 D3-B).
 */
export const OPT_IN_PAGE_KEYS: AppPageKey[] = ["tax"];
export const DEFAULT_ENABLED_PAGES: AppPageKey[] = ALL_PAGE_KEYS.filter(
  (k) => !OPT_IN_PAGE_KEYS.includes(k),
);
export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetKey[] = [...DEFAULT_ENABLED_PAGES];
export const DEFAULT_WIDGET_SIZES: Record<string, "normal" | "wide"> = {
  accounts: "normal",
  budget: "normal",
  debt: "normal",
  savings: "normal",
  pension: "normal",
  mortgage: "normal",
  tax: "normal",
};

export function isPageEnabled(enabledPages: string[] | null | undefined, key: AppPageKey): boolean {
  if (!enabledPages || !Array.isArray(enabledPages) || enabledPages.length === 0) {
    return DEFAULT_ENABLED_PAGES.includes(key); // Nothing stored: the default set, without opt-in modules
  }
  return enabledPages.includes(key);
}

/**
 * Module keys that no longer exist. `forecast` was a dashboard module until the growth forecaster
 * became a tab inside Savings (E16 D5-B); stored profiles may still carry it.
 */
export const RETIRED_PAGE_KEYS: readonly string[] = ["forecast"];

/** Drops retired module keys from a stored key list. */
export function stripRetiredKeys<T extends string>(keys: readonly T[]): T[] {
  return keys.filter((k) => !RETIRED_PAGE_KEYS.includes(k));
}

/** Drops retired keys from a keyed record such as widget sizes or widget config. */
export function stripRetiredRecordKeys<V>(
  record: Record<string, V> | null | undefined,
): Record<string, V> | undefined {
  if (!record || typeof record !== "object") return undefined;
  return Object.fromEntries(Object.entries(record).filter(([k]) => !RETIRED_PAGE_KEYS.includes(k)));
}

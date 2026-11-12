export type AppPageKey =
  | "accounts"
  | "budget"
  | "debt"
  | "savings"
  | "pension"
  | "mortgage"
  | "forecast"
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
  "forecast",
  "tax",
];

export const APP_PAGES: Record<AppPageKey, AppPageConfig> = {
  accounts: {
    key: "accounts",
    label: "Accounts and net worth",
    route: "/app/accounts",
    description: "Multi-account tracking, bank sync, and historical balance logs",
    category: "core",
    badgeColor: "#6363f1",
  },
  budget: {
    key: "budget",
    label: "Budget planner",
    route: "/app/budget",
    description: "Income and expense categorisation, cash flow surplus, and runway calculator",
    category: "core",
    badgeColor: "#f59e0b",
  },
  debt: {
    key: "debt",
    label: "Debt payoff",
    route: "/app/debt",
    description:
      "Avalanche and snowball payoff engine, 0% promotional expiry tracker, and wealth bridge",
    category: "core",
    badgeColor: "#ef4444",
  },
  savings: {
    key: "savings",
    label: "Savings and investments",
    route: "/app/savings",
    description: "High-yield accounts, interest rate (AER) tracking, and compound growth",
    category: "wealth",
    badgeColor: "#10b981",
  },
  pension: {
    key: "pension",
    label: "Pension and retirement",
    route: "/app/pension",
    description: "Workplace pots, employee and employer contributions, and salary sacrifice",
    category: "wealth",
    badgeColor: "#8b5cf6",
  },
  mortgage: {
    key: "mortgage",
    label: "Mortgage tools",
    route: "/app/mortgage",
    description: "Loan amortisation, overpayment simulator, and savings comparison",
    category: "wealth",
    badgeColor: "#f59e0b",
  },
  forecast: {
    key: "forecast",
    label: "Wealth forecaster",
    route: "/app/forecast",
    description: "Multi-year wealth projection and PAYE take-home estimation",
    category: "planning",
    badgeColor: "#6363f1",
  },
  tax: {
    key: "tax",
    label: "Tax and Self Assessment",
    route: "/app/tax",
    description: "Self-employed and rental property P&L logs with UK tax liability estimates",
    category: "planning",
    badgeColor: "#3b82f6",
  },
};

export const DASHBOARD_WIDGET_METAS: Record<DashboardWidgetKey, DashboardWidgetMeta> = {
  accounts: APP_PAGES.accounts,
  budget: APP_PAGES.budget,
  debt: APP_PAGES.debt,
  savings: APP_PAGES.savings,
  pension: APP_PAGES.pension,
  mortgage: APP_PAGES.mortgage,
  forecast: APP_PAGES.forecast,
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
  forecast: "normal",
  tax: "normal",
};

export function isPageEnabled(enabledPages: string[] | null | undefined, key: AppPageKey): boolean {
  if (!enabledPages || !Array.isArray(enabledPages) || enabledPages.length === 0) {
    return DEFAULT_ENABLED_PAGES.includes(key); // Nothing stored: the default set, without opt-in modules
  }
  return enabledPages.includes(key);
}

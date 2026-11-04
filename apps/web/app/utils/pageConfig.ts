export type AppPageKey =
  | "accounts"
  | "budget"
  | "debt"
  | "savings"
  | "pension"
  | "mortgage"
  | "forecast"
  | "tax";

export type DashboardWidgetKey = AppPageKey | "financialHealth";

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
    label: "Accounts & Net Worth",
    route: "/app/accounts",
    description: "Multi-account tracking, bank sync, and historical balance logs",
    category: "core",
    badgeColor: "#6363f1",
  },
  budget: {
    key: "budget",
    label: "Budget Planner",
    route: "/app/budget",
    description: "Income & expense categorisation, cash flow surplus, and runway calculator",
    category: "core",
    badgeColor: "#f59e0b",
  },
  debt: {
    key: "debt",
    label: "Debt Crusher",
    route: "/app/debt",
    description: "Avalanche & Snowball payoff engine, 0% cliff tracker, and wealth bridge",
    category: "core",
    badgeColor: "#ef4444",
  },
  savings: {
    key: "savings",
    label: "Savings & Investments",
    route: "/app/savings",
    description: "High-yield accounts, interest rate tracking, and compound growth",
    category: "wealth",
    badgeColor: "#10b981",
  },
  pension: {
    key: "pension",
    label: "Pension & Retirement",
    route: "/app/pension",
    description: "Workplace pots, employee & employer contributions, and salary sacrifice",
    category: "wealth",
    badgeColor: "#8b5cf6",
  },
  mortgage: {
    key: "mortgage",
    label: "Mortgage Tools",
    route: "/app/mortgage",
    description: "Loan amortization, overpayment simulator, and savings comparison",
    category: "wealth",
    badgeColor: "#f59e0b",
  },
  forecast: {
    key: "forecast",
    label: "Wealth Forecaster",
    route: "/app/forecast",
    description: "Multi-year wealth projection and PAYE take-home estimation",
    category: "planning",
    badgeColor: "#6363f1",
  },
  tax: {
    key: "tax",
    label: "Tax & Self-Assessment",
    route: "/app/tax",
    description: "Self-employed & rental property P&L logs with UK tax liability estimates",
    category: "planning",
    badgeColor: "#3b82f6",
  },
};

export const DASHBOARD_WIDGET_METAS: Record<DashboardWidgetKey, DashboardWidgetMeta> = {
  financialHealth: {
    key: "financialHealth",
    label: "Financial Health Summary",
    route: "/app",
    description: "Holistic score, current strengths, and areas to improve across your finances",
    badgeColor: "#10b981",
  },
  accounts: APP_PAGES.accounts,
  budget: APP_PAGES.budget,
  debt: APP_PAGES.debt,
  savings: APP_PAGES.savings,
  pension: APP_PAGES.pension,
  mortgage: APP_PAGES.mortgage,
  forecast: APP_PAGES.forecast,
  tax: APP_PAGES.tax,
};

export const ALL_DASHBOARD_WIDGET_KEYS: DashboardWidgetKey[] = [
  "financialHealth",
  ...ALL_PAGE_KEYS,
];

export const DEFAULT_ENABLED_PAGES: AppPageKey[] = [...ALL_PAGE_KEYS];
export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetKey[] = [
  "financialHealth",
  ...ALL_PAGE_KEYS,
];
export const DEFAULT_WIDGET_SIZES: Record<string, "normal" | "wide"> = {
  financialHealth: "wide",
  accounts: "wide",
  budget: "normal",
  debt: "wide",
  savings: "normal",
  pension: "normal",
  mortgage: "normal",
  forecast: "normal",
  tax: "normal",
};

export function isPageEnabled(enabledPages: string[] | null | undefined, key: AppPageKey): boolean {
  if (!enabledPages || !Array.isArray(enabledPages) || enabledPages.length === 0) {
    return true; // Default to enabled
  }
  return enabledPages.includes(key);
}

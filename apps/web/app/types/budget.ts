export type BudgetCategory = "housing" | "bills" | "expenses" | "savings" | "income" | string;

export interface BudgetEntry {
  id: string;
  userId: string;
  category: BudgetCategory;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly";
  isIncome: boolean;
  isPrimaryIncome: boolean;
  isEssential: boolean;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Normalise any entry to a monthly amount */
export function toMonthly(entry: BudgetEntry): number {
  const amount = Number(entry.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  switch (entry.frequency) {
    case "annual":
      return safeAmount / 12;
    case "weekly":
      return safeAmount * (52 / 12);
    default:
      return safeAmount;
  }
}

export const BASE_CATEGORY_LABELS: Record<string, string> = {
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  income: "Income",
};

export const BASE_CATEGORY_COLOURS: Record<string, string> = {
  housing: "#6363f1",
  bills: "#f59e0b",
  expenses: "#ec4899",
  savings: "#10b981",
  income: "#3b82f6",
};

export const BASE_CATEGORY_ICONS: Record<string, string> = {
  housing: "🏠",
  bills: "⚡",
  expenses: "💳",
  savings: "🐷",
  income: "💼",
};

const CUSTOM_PALETTE = [
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#a855f7",
  "#0ea5e9",
];

export function getCategoryLabel(category: string): string {
  if (BASE_CATEGORY_LABELS[category]) return BASE_CATEGORY_LABELS[category];
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryColour(category: string): string {
  if (BASE_CATEGORY_COLOURS[category]) return BASE_CATEGORY_COLOURS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CUSTOM_PALETTE[Math.abs(hash) % CUSTOM_PALETTE.length];
}

export function getCategoryIcon(category: string): string {
  if (BASE_CATEGORY_ICONS[category]) return BASE_CATEGORY_ICONS[category];
  return "📁";
}

export const CATEGORY_LABELS: Record<string, string> = new Proxy(BASE_CATEGORY_LABELS, {
  get: (target, prop: string) =>
    target[prop] || (typeof prop === "string" ? getCategoryLabel(prop) : undefined),
});

export const CATEGORY_COLOURS: Record<string, string> = new Proxy(BASE_CATEGORY_COLOURS, {
  get: (target, prop: string) =>
    target[prop] || (typeof prop === "string" ? getCategoryColour(prop) : undefined),
});

export const CATEGORY_ICONS: Record<string, string> = new Proxy(BASE_CATEGORY_ICONS, {
  get: (target, prop: string) =>
    target[prop] || (typeof prop === "string" ? getCategoryIcon(prop) : undefined),
});

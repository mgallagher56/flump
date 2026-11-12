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
  contractEndDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_KEYWORDS = [
  "rent",
  "mortgage",
  "council tax",
  "gas",
  "electric",
  "energy",
  "water",
  "rates",
  "child maintenance",
  "tv licence",
  "court",
];

export function isPriorityBill(entry: BudgetEntry): boolean {
  if (entry.isIncome) return false;
  if (entry.category === "housing") return true;
  const lowerName = entry.name.toLowerCase();
  return PRIORITY_KEYWORDS.some((kw) => lowerName.includes(kw));
}

export function getDaysUntilContractEnd(contractEndDate?: string | null): number | null {
  if (!contractEndDate) return null;
  const target = new Date(contractEndDate).getTime();
  if (Number.isNaN(target)) return null;
  const now = new Date().getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
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
  housing: "var(--colors-primary)",
  bills: "var(--colors-chart-warning)",
  expenses: "var(--colors-chart-series5)",
  savings: "var(--colors-chart-wealth)",
  income: "var(--colors-chart-series2)",
};

export const BASE_CATEGORY_ICONS: Record<string, string> = {
  housing: "🏠",
  bills: "⚡",
  expenses: "💳",
  savings: "🐷",
  income: "💼",
};

const CUSTOM_PALETTE = [
  "var(--colors-chart-accent-purple)",
  "var(--colors-chart-accent-cyan)",
  "var(--colors-chart-series1)",
  "var(--colors-chart-series3)",
  "var(--colors-chart-series4)",
  "var(--colors-chart-series6)",
  "var(--colors-chart-series7)",
  "var(--colors-chart-series8)",
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

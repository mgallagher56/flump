import { seriesColor } from "@repo/ui";

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
  notes?: string | null;
  isDefault: boolean;
  /** E34 C1: "joint" counts the entry at `sharePercent` (50 when unset); absent means sole. */
  ownership?: "sole" | "joint";
  sharePercent?: number | null;
  contractEndDate?: string | null;
  /**
   * Set only on a line the engine makes from a saved fact, never stored (owner items 7 and 33b,
   * audit slice 5): "take_home" reads the profile's salary, "housing" the housing details,
   * "savings" and "debt" one account's monthly saving or payment.
   */
  linked?: "take_home" | "housing" | "savings" | "debt";
  /**
   * Stored on a row the person linked to a saved fact ("Use your take-home pay", "Link to Car
   * loan"). Its stored amount is never read: the engine reads the saved figure in its place.
   */
  linkKind?: "take_home" | "housing" | "savings" | "debt" | null;
  /**
   * The account a "savings" or "debt" line reads. Null once that account is deleted: the line
   * then shows "Not set".
   */
  linkAccountId?: string | null;
  /** On an engine line standing in for a row the person linked: that row's stored id. */
  linkedRowId?: string;
  /** True on a linked line whose saved fact is not set: it shows "Not set", never £0. */
  notSet?: true;
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

const BASE_CATEGORY_LABELS: Record<string, string> = {
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  income: "Income",
};

export const BASE_CATEGORY_COLOURS: Record<string, string> = {
  housing: seriesColor(0),
  bills: seriesColor(2),
  expenses: seriesColor(4),
  savings: seriesColor(1),
  income: seriesColor(3),
};

const BASE_CATEGORY_ICONS: Record<string, string> = {
  housing: "🏠",
  bills: "⚡",
  expenses: "💳",
  savings: "🐷",
  income: "💼",
};

// Only eight chart series are distinguishable; base categories take series1-5 and custom categories
// share series6-8 (hash-picked), so labels must always accompany the colour.
export const CUSTOM_PALETTE = [seriesColor(5), seriesColor(6), seriesColor(7)];

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

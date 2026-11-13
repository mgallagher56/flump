import type { LucideIcon } from "lucide-react";
import { Briefcase, CreditCard, Folder, Home, PiggyBank, Zap } from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  housing: Home,
  bills: Zap,
  expenses: CreditCard,
  savings: PiggyBank,
  income: Briefcase,
};

/** Line icon for a budget category. Custom categories share the folder icon. */
export const categoryIcon = (category: string): LucideIcon => CATEGORY_ICON_MAP[category] ?? Folder;

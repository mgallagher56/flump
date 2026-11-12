import {
  Briefcase,
  CreditCard,
  Home,
  Landmark,
  type LucideIcon,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { DashboardWidgetKey } from "~/utils/pageConfig";

/** One Lucide glyph per dashboard widget. */
export const WIDGET_ICONS: Record<DashboardWidgetKey, LucideIcon> = {
  accounts: Landmark,
  budget: Wallet,
  debt: CreditCard,
  savings: PiggyBank,
  pension: Briefcase,
  mortgage: Home,
  forecast: TrendingUp,
  tax: Receipt,
};

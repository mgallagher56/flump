import {
  Building2,
  Calculator,
  Coins,
  FileText,
  House,
  type LucideIcon,
  PiggyBank,
  Scale,
  TrendingDown,
  Wallet,
} from "lucide-react";
import type { AppPageKey } from "~/utils/pageConfig";

export interface NavRouteItem {
  key: string;
  route?: string;
  icon?: LucideIcon;
  description?: string;
  /** Not a switchable module: always shown (e.g. Take-home pay). */
  alwaysOn?: boolean;
  children?: NavRouteItem[];
}

export const HOME_NAV_ROUTE: NavRouteItem = { key: "home", route: "/", icon: House };

/**
 * Signed-in navigation: the single source for the desktop header and the mobile drawer.
 * Forecast is not listed (it redirects to Savings) and Tax is an opt-in module, so it only
 * appears when enabled (see `filterNavRoutes`).
 */
export const AUTH_NAV_ROUTES: NavRouteItem[] = [
  { key: "debt", route: "/app/debt", icon: TrendingDown },
  { key: "budget", route: "/app/budget", icon: Wallet },
  { key: "accounts", route: "/app/accounts", icon: Scale },
  {
    key: "wealth",
    children: [
      {
        key: "savings",
        route: "/app/savings",
        description: "navSavingsDesc",
        icon: PiggyBank,
      },
      {
        key: "pension",
        route: "/app/pension",
        description: "navPensionDesc",
        icon: Coins,
      },
      {
        key: "mortgage",
        route: "/app/mortgage",
        description: "navMortgageDesc",
        icon: Building2,
      },
    ],
  },
  {
    key: "planning",
    children: [
      {
        key: "takeHome",
        route: "/app/take-home",
        description: "navTakeHomeDesc",
        icon: Calculator,
        alwaysOn: true,
      },
      {
        key: "tax",
        route: "/app/tax",
        description: "navTaxDesc",
        icon: FileText,
      },
    ],
  },
];

/** Drops pages the person has switched off, and groups left with no pages. */
export function filterNavRoutes(
  routes: NavRouteItem[],
  enabled: string[],
  isEnabled: (enabled: string[], key: AppPageKey) => boolean,
): NavRouteItem[] {
  return routes
    .map((item) =>
      item.children
        ? {
            ...item,
            children: item.children.filter(
              (c) => c.alwaysOn || isEnabled(enabled, c.key as AppPageKey),
            ),
          }
        : item,
    )
    .filter((item) =>
      item.children ? item.children.length > 0 : isEnabled(enabled, item.key as AppPageKey),
    );
}

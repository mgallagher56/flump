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
  /** Translation key for the visible label when it differs from `key` (which stays the module key). */
  label?: string;
  /** When a group collapses to one link: keep the group's label ("group") or the page's ("child"). */
  collapseTo?: "group" | "child";
  children?: NavRouteItem[];
}

/** The signed-out demo. It has no sub-pages, so every other destination is "Sign up to open". */
export const SANDBOX_ROUTE = "/sandbox";

export const isSandboxPath = (pathname: string): boolean =>
  pathname === SANDBOX_ROUTE || pathname === `${SANDBOX_ROUTE}/`;

/** Home as shown in the signed-out sandbox: the sandbox itself. */
export const SANDBOX_HOME_NAV_ROUTE: NavRouteItem = {
  key: "home",
  route: SANDBOX_ROUTE,
  icon: House,
};

export const HOME_NAV_ROUTE: NavRouteItem = { key: "home", route: "/", icon: House };

/**
 * Signed-in navigation: the single source for the desktop header and the mobile drawer (IA review
 * T-IA-5). Order: Accounts, Budget, Tax and pay, Savings and pension, Borrowing. Forecast is not
 * listed (it redirects to Savings) and Self Assessment is opt-in, so it only appears when enabled.
 * A group left with one visible page collapses to a direct link (see `filterNavRoutes`).
 */
export const AUTH_NAV_ROUTES: NavRouteItem[] = [
  { key: "accounts", route: "/app/accounts", icon: Scale },
  { key: "budget", route: "/app/budget", icon: Wallet },
  {
    key: "taxAndPay",
    icon: Calculator,
    collapseTo: "group",
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
        label: "selfAssessment",
        route: "/app/tax",
        description: "navTaxDesc",
        icon: FileText,
      },
    ],
  },
  {
    key: "savingsAndPension",
    icon: PiggyBank,
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
    ],
  },
  {
    key: "borrowing",
    icon: TrendingDown,
    children: [
      {
        key: "debt",
        route: "/app/debt",
        description: "navDebtDesc",
        icon: TrendingDown,
      },
      {
        key: "mortgage",
        route: "/app/mortgage",
        description: "navMortgageDesc",
        icon: Building2,
      },
    ],
  },
];

/**
 * Drops pages the person has switched off and groups left with no pages. A group with exactly one
 * visible page becomes a direct link to it (labelled by the group when `collapseTo` is "group").
 */
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
    )
    .map((item) => {
      if (!item.children || item.children.length !== 1) return item;
      const [only] = item.children;
      return item.collapseTo === "group"
        ? { ...only, key: item.key, icon: item.icon ?? only.icon }
        : { ...only, icon: only.icon ?? item.icon };
    });
}

export interface BottomBarTab {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
}

/**
 * Bottom bar tabs (IA review T-IA-4): Home, Accounts, Budget, Tax and pay, then a More button.
 * All four are always-on pages. The signed-in bar and the signed-out sandbox bar share this list.
 */
export const BOTTOM_BAR_TABS: BottomBarTab[] = [
  { key: "home", label: "Home", to: "/", icon: House },
  { key: "accounts", label: "Accounts", to: "/app/accounts", icon: Scale },
  { key: "budget", label: "Budget", to: "/app/budget", icon: Wallet },
  { key: "taxAndPay", label: "Tax and pay", to: "/app/take-home", icon: Calculator },
];

import { type AppNavChild, type AppNavItem, Icon } from "@repo/ui";
import type { TFunction } from "i18next";
import { Ellipsis } from "lucide-react";
import enCommon from "../../../public/locales/en/common.json";
import {
  AUTH_NAV_ROUTES,
  BOTTOM_BAR_TABS,
  filterNavRoutes,
  HOME_NAV_ROUTE,
  isSandboxPath,
  type NavRouteItem,
  SANDBOX_HOME_NAV_ROUTE,
  SANDBOX_ROUTE,
} from "./navConfig";

export { isSandboxPath };

export const MORE_NAV_KEY = "more";

type Translate = TFunction | ((key: string, fallback?: string) => string);

/**
 * English labels from the same locale file the app loads, so every surface that draws the nav
 * (header, drawer, bottom bar, and the header on error and 404 pages) shows the same words even
 * when the translations have not loaded, never a raw key such as "borrowing".
 */
const EN_LABELS: Readonly<Record<string, string>> = enCommon;

const label = (t: Translate, key: string, fallback?: string): string =>
  (t as (k: string, f?: string) => string)(key, fallback ?? EN_LABELS[key] ?? key);

/** A nav label or description key, translated, with the English locale string as the fallback. */
export const navLabel = (t: Translate, key: string): string => label(t, key);

const toIcon = (route: NavRouteItem) =>
  route.icon ? <Icon icon={route.icon} size="sm" /> : undefined;

const toChild = (t: Translate, route: NavRouteItem): AppNavChild => ({
  key: route.key,
  label: label(t, route.label ?? route.key),
  href: route.route ?? "/",
  description: route.description ? label(t, route.description) : undefined,
  icon: toIcon(route),
});

const toItem = (t: Translate, route: NavRouteItem): AppNavItem => {
  const children = (route.children ?? []).filter((c) => c.route);
  return {
    key: route.key,
    label: label(t, route.label ?? route.key),
    href: route.route ?? children[0]?.route ?? "/",
    icon: toIcon(route),
    children: children.length > 0 ? children.map((c) => toChild(t, c)) : undefined,
  };
};

export interface NavManifestOptions {
  /** Signed in. Signed-out visitors only get Home. */
  signedIn: boolean;
  /** Signed-out demo: Home points at the sandbox. */
  sandbox?: boolean;
  enabledPages: string[];
  isPageEnabled: (enabled: string[], key: never) => boolean;
  t: Translate;
}

/** Builds the @repo/ui `AppNavItem[]` manifest from `navConfig` (one source for every nav surface). */
export function buildNavManifest({
  signedIn,
  sandbox = false,
  enabledPages,
  isPageEnabled,
  t,
}: NavManifestOptions): AppNavItem[] {
  const home = toItem(t, sandbox ? SANDBOX_HOME_NAV_ROUTE : HOME_NAV_ROUTE);
  if (!signedIn) return [home];
  const routes = filterNavRoutes(
    AUTH_NAV_ROUTES,
    enabledPages,
    isPageEnabled as Parameters<typeof filterNavRoutes>[2],
  );
  return [home, ...routes.map((route) => toItem(t, route))];
}

const matches = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Key of the manifest entry (child first, then top level) that owns `pathname`. */
export function findActiveNavKey(items: AppNavItem[], pathname: string): string | undefined {
  for (const item of items) {
    const child = item.children?.find((c) => matches(pathname, c.href));
    if (child) return child.key;
  }
  return items.find((item) => !item.children && matches(pathname, item.href))?.key;
}

/** Bottom bar tabs (Home, Accounts, Budget, Pay) plus the More button that opens the drawer. */
export function buildBottomBarItems(t: Translate, sandbox = false): AppNavItem[] {
  const tabs = BOTTOM_BAR_TABS.map<AppNavItem>((tab) => ({
    key: tab.key,
    label: label(t, tab.key, tab.label),
    href: sandbox ? SANDBOX_ROUTE : tab.to,
    icon: <Icon icon={tab.icon} />,
  }));
  return [
    ...tabs,
    {
      key: MORE_NAV_KEY,
      label: label(t, "more", "More"),
      href: "#",
      icon: <Icon icon={Ellipsis} />,
    },
  ];
}

/** Active bottom bar tab. Pay also owns Self Assessment. */
export function findActiveBottomBarKey(pathname: string): string | undefined {
  if (pathname === SANDBOX_ROUTE || pathname === `${SANDBOX_ROUTE}/`) return "home";
  if (pathname === "/") return "home";
  if (matches(pathname, "/app/self-assessment")) return "taxAndPay";
  return BOTTOM_BAR_TABS.find((tab) => tab.to !== "/" && matches(pathname, tab.to))?.key;
}

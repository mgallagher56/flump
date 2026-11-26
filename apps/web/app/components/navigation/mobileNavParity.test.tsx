// @vitest-environment node

import { fileURLToPath } from "node:url";
import * as lucide from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { withoutBarPages } from "~/components/structure/header/MobileNavDrawer/MobileNavDrawer";
import enCommon from "../../../public/locales/en/common.json";
import {
  AUTH_NAV_ROUTES,
  BOTTOM_BAR_TABS,
  DRAWER_FOOTER_ROUTES,
  type NavRouteItem,
} from "./navConfig";

/**
 * The mobile app's tab bar and More list mirror web's navigation (E12 S4, plan 9.7). The app keeps
 * plain data (`apps/mobile/src/navigation`), because this file's sources import lucide-react and
 * web-only types; this test, run by web's suite so a web-only change fails at once, pins the copy.
 * The mobile files sit outside this project, so they are loaded by path rather than imported.
 */
const MOBILE_NAV = new URL("../../../../mobile/src/navigation/", import.meta.url);

type IconShape = readonly [string, Readonly<Record<string, string>>];
interface MobileTab {
  key: string;
  label: string;
  icon: string;
  webRoute?: string;
}
interface MobilePage {
  key: string;
  label: string;
  icon: string;
  webRoute: string;
}
interface MobileNav {
  TABS: readonly MobileTab[];
  MORE_GROUPS: readonly { key: string; label: string; pages: readonly MobilePage[] }[];
  MORE_FOOTER: readonly MobilePage[];
}

const loadMobile = async () => {
  const nav = (await import(
    /* @vite-ignore */ fileURLToPath(new URL("navItems.ts", MOBILE_NAV))
  )) as MobileNav;
  const icons = (await import(
    /* @vite-ignore */ fileURLToPath(new URL("iconShapes.ts", MOBILE_NAV))
  )) as {
    ICON_SHAPES: Record<string, readonly IconShape[]>;
  };
  return { ...nav, ICON_SHAPES: icons.ICON_SHAPES };
};

const EN: Record<string, string> = enCommon;

/**
 * Drawer rows the app leaves out on purpose. Each one depends on a per-person switch that the app
 * does not read until S9 brings the shared filter, and a row leading to a page someone has not
 * switched on is worse than no row (coordinator, 26 November 2026). Self Assessment is opt-in and
 * its page shows "switched off" until turned on. The other switchable pages (Savings, Pension,
 * Retirement, Cards and loans, Mortgage) are on by default and still open on web when switched off, so
 * they stay. A new conditional row must be added here, or to the app, on purpose.
 */
const LEFT_OUT_UNTIL_S9: ReadonlySet<string> = new Set(["tax"]);

/** "piggy-bank" -> lucide's PiggyBank component. */
const lucideIcon = (name: string) => {
  const pascal = name.replace(/(^|-)(\w)/g, (_m, _dash, c: string) => c.toUpperCase());
  return (lucide as unknown as Record<string, unknown>)[pascal];
};

describe("the mobile tab bar mirrors BOTTOM_BAR_TABS plus More", () => {
  it("has web's tabs in order, with the same key, label, route and icon, then More", async () => {
    const { TABS } = await loadMobile();
    expect(TABS.map((t) => t.key)).toEqual([...BOTTOM_BAR_TABS.map((t) => t.key), "more"]);
    BOTTOM_BAR_TABS.forEach((tab, i) => {
      const mobile = TABS[i] as MobileTab;
      // The bar shows the locale string for the key (buildBottomBarItems), not the fallback label.
      expect(mobile.label).toBe(EN[tab.key]);
      expect(mobile.webRoute).toBe(tab.to);
      expect(lucideIcon(mobile.icon)).toBe(tab.icon);
    });
    const more = TABS[TABS.length - 1] as MobileTab;
    // buildBottomBarItems: label "more" (no locale entry, so its fallback), the Ellipsis icon.
    expect([more.label, lucideIcon(more.icon)]).toEqual(["More", lucide.Ellipsis]);
  });
});

describe("the mobile More list mirrors the phone drawer", () => {
  const pageOf = (route: NavRouteItem) => ({
    key: route.key,
    label: EN[route.label ?? route.key],
    webRoute: route.route,
    icon: route.icon,
  });

  it("leaves out only the named exceptions, each of which is a real drawer row", async () => {
    const { MORE_GROUPS } = await loadMobile();
    const drawerKeys = withoutBarPages(AUTH_NAV_ROUTES).flatMap((g) =>
      (g.children ?? []).map((p) => p.key),
    );
    const mobileKeys = MORE_GROUPS.flatMap((g) => g.pages.map((p) => p.key));
    expect(drawerKeys.filter((key) => !mobileKeys.includes(key))).toEqual([...LEFT_OUT_UNTIL_S9]);
  });

  it("has the drawer's groups and pages, without the tab bar's, in order", async () => {
    const { MORE_GROUPS } = await loadMobile();
    const drawer = withoutBarPages(AUTH_NAV_ROUTES)
      .map((group) => ({
        ...group,
        children: group.children?.filter((page) => !LEFT_OUT_UNTIL_S9.has(page.key)),
      }))
      .filter((group) => (group.children ?? []).length > 0);
    // Every drawer entry left once the bar's pages go is a group (Accounts and Budget are tabs).
    expect(drawer.every((route) => route.children)).toBe(true);
    expect(
      MORE_GROUPS.map((g) => ({
        key: g.key,
        label: g.label,
        pages: g.pages.map((p) => ({ ...p, icon: lucideIcon(p.icon) })),
      })),
    ).toEqual(
      drawer.map((group) => ({
        key: group.key,
        label: EN[group.key],
        pages: (group.children ?? []).map(pageOf),
      })),
    );
  });

  it("ends with the drawer's footer rows: Settings, Connect AI and Calculators", async () => {
    const { MORE_FOOTER } = await loadMobile();
    expect(MORE_FOOTER.map((p) => ({ ...p, icon: lucideIcon(p.icon) }))).toEqual(
      DRAWER_FOOTER_ROUTES.map(pageOf),
    );
  });
});

describe("the mobile icon shapes are lucide's", () => {
  it.each([
    "house",
    "scale",
    "wallet",
    "calculator",
    "ellipsis",
    "piggy-bank",
    "coins",
    "briefcase",
    "trending-down",
    "building-2",
    "settings",
    "bot",
    "log-out",
    "menu",
    "chevron-right",
  ])("%s draws the same shapes", async (name) => {
    const { ICON_SHAPES } = await loadMobile();
    const component = lucideIcon(name) as Parameters<typeof createElement>[0];
    const markup = renderToStaticMarkup(createElement(component));
    const inner = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    const mobile = (ICON_SHAPES[name] ?? [])
      .map(([tag, attrs]) => {
        const list = Object.entries(attrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(" ");
        return `<${tag} ${list}></${tag}>`;
      })
      .join("");
    expect(mobile).toBe(inner);
  });
});

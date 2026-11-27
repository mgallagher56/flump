// @vitest-environment node

import { fileURLToPath } from "node:url";
import * as lucide from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { withoutBarPages } from "~/components/structure/header/MobileNavDrawer/MobileNavDrawer";
import { ALL_PAGE_KEYS, FOLLOWING_PAGE_KEYS, isPageEnabled } from "~/utils/pageConfig";
import enCommon from "../../../public/locales/en/common.json";
import {
  AUTH_NAV_ROUTES,
  BOTTOM_BAR_TABS,
  DRAWER_FOOTER_ROUTES,
  filterNavRoutes,
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
  MORE_FOOTER: readonly MobilePage[];
}
type MobileEntry =
  | { kind: "group"; key: string; label: string; pages: readonly MobilePage[] }
  | { kind: "row"; key: string; label: string; icon: string; webRoute: string; pageKey: string };
interface MobileSwitches {
  moreEntries(enabledPages: readonly string[] | null | undefined): MobileEntry[];
  isPageEnabled(enabledPages: readonly string[] | null | undefined, key: string): boolean;
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
  const switches = (await import(
    /* @vite-ignore */ fileURLToPath(new URL("pageSwitches.ts", MOBILE_NAV))
  )) as MobileSwitches;
  return { ...nav, ...switches, ICON_SHAPES: icons.ICON_SHAPES };
};

const EN: Record<string, string> = enCommon;

/**
 * Tab icons the app draws differently on purpose. Pay: web gives Pay and Calculators the same
 * calculator, which the device check found confusing in the app's More list beside the tab bar
 * (coordinator, 26 November 2026). Web keeps its icon until its phone screenshots are redone.
 */
const ICON_EXCEPTIONS: Readonly<Record<string, unknown>> = { taxAndPay: lucide.Banknote };

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
      expect(lucideIcon(mobile.icon)).toBe(ICON_EXCEPTIONS[tab.key] ?? tab.icon);
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

  /** Web's phone drawer for a stored page list, as `MobileNavDrawer` builds it when signed in. */
  const drawerFor = (enabled: string[]) =>
    withoutBarPages(filterNavRoutes(AUTH_NAV_ROUTES, enabled, isPageEnabled)).map((route) =>
      route.children
        ? { kind: "group", key: route.key, label: EN[route.key], pages: route.children.map(pageOf) }
        : { kind: "row", ...pageOf(route) },
    );

  const mobileFor = (entries: MobileEntry[]) =>
    entries.map((entry) =>
      entry.kind === "group"
        ? {
            kind: "group",
            key: entry.key,
            label: entry.label,
            pages: entry.pages.map((p) => ({ ...p, icon: lucideIcon(p.icon) })),
          }
        : {
            kind: "row",
            key: entry.key,
            label: entry.label,
            webRoute: entry.webRoute,
            icon: lucideIcon(entry.icon),
          },
    );

  /**
   * Every subset of the switchable pages, stored as web stores them: the following page
   * (Retirement) is never switched on its own, so it is left out, as Profile and onboarding write
   * the list. 2^7 lists, the empty one included.
   */
  const SWITCHABLE = ALL_PAGE_KEYS.filter((key) => !(key in FOLLOWING_PAGE_KEYS));
  const ALL_LISTS: string[][] = Array.from({ length: 2 ** SWITCHABLE.length }, (_, mask) =>
    SWITCHABLE.filter((_key, bit) => (mask >> bit) & 1),
  );

  it("lists every switchable page of web's (and no other) in its pages and footer", async () => {
    const { moreEntries } = await loadMobile();
    const pageKeys = (entries: MobileEntry[]) =>
      entries.flatMap((e) => (e.kind === "group" ? e.pages.map((p) => p.key) : [e.pageKey]));
    // With every page on, More reaches every switchable page the tab bar does not.
    expect(pageKeys(moreEntries(SWITCHABLE)).sort()).toEqual(
      ["debt", "mortgage", "pension", "retirement", "savings", "tax"].sort(),
    );
    expect(SWITCHABLE.length).toBe(7);
    expect(ALL_LISTS).toHaveLength(128);
  });

  it.each(ALL_LISTS.map((list) => [list.join(",") || "(empty)", list] as const))(
    "has the drawer's groups and rows, without the tab bar's, for %s",
    async (_name, list) => {
      const { moreEntries } = await loadMobile();
      expect(mobileFor(moreEntries(list))).toEqual(drawerFor(list));
    },
  );

  it.each([
    ["missing", undefined],
    ["null", null],
  ] as const)("a %s list reads as the default set, Self Assessment off", async (_name, list) => {
    const { moreEntries } = await loadMobile();
    // Web's drawer reads a missing list as [] (`profile.enabledPages || []`): the default set.
    expect(mobileFor(moreEntries(list))).toEqual(drawerFor([]));
    expect(
      drawerFor([]).flatMap((e) => ("pages" in e ? e.pages.map((p) => p.key) : [])),
    ).not.toContain("tax");
  });

  it("ignores keys it does not know, as web's drawer does", async () => {
    const { moreEntries } = await loadMobile();
    for (const list of [
      ["forecast"],
      ["forecast", "tax"],
      ["retirement"],
      ["retirement", "pension"],
    ]) {
      expect(mobileFor(moreEntries(list))).toEqual(drawerFor(list));
    }
  });

  it.each([...ALL_LISTS, ["retirement"], ["forecast"]].map((l) => [l.join(",") || "(empty)", l]))(
    "agrees with web's isPageEnabled for every page key, for %s",
    async (_name, list) => {
      const { isPageEnabled: mobileIsPageEnabled } = await loadMobile();
      for (const key of ALL_PAGE_KEYS) {
        expect([key, mobileIsPageEnabled(list, key)]).toEqual([key, isPageEnabled(list, key)]);
      }
    },
  );

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
    "banknote",
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
    "chevron-left",
    "file-text",
    "monitor",
    "sun",
    "moon",
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

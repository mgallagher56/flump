/**
 * Which pages a person has switched on, and what More lists for them (E12 S9, plan 9.10): a mirror
 * of web's `apps/web/app/utils/pageConfig.ts` (`isPageEnabled`, the opt-in list and the
 * following-page rule) and of its phone drawer (`filterNavRoutes`, then `withoutBarPages`). Plain
 * data and functions, so web's `mobileNavParity.test.tsx` runs both over every combination of
 * switchable pages and fails when they drift.
 */
import { MORE_GROUPS, type MorePage, TABS } from "./navItems";

/** Web's `AppPageKey`: the pages a person can switch on and off. */
export type PageKey =
  | "accounts"
  | "budget"
  | "debt"
  | "savings"
  | "pension"
  | "retirement"
  | "mortgage"
  | "tax";

/**
 * Pages that are never switched on their own and follow another page (web's
 * `FOLLOWING_PAGE_KEYS`): Retirement shows wherever Pension does.
 */
const FOLLOWING_PAGE_KEYS: Readonly<Partial<Record<PageKey, PageKey>>> = {
  retirement: "pension",
};

const PAGE_KEYS: readonly PageKey[] = [
  "accounts",
  "budget",
  "debt",
  "savings",
  "pension",
  "retirement",
  "mortgage",
  "tax",
];

/** Off until switched on in Profile (web's `OPT_IN_PAGE_KEYS`): Self Assessment. */
const OPT_IN_PAGE_KEYS: readonly PageKey[] = ["tax"];

/** What a person with nothing stored has on (web's `DEFAULT_ENABLED_PAGES`). */
const DEFAULT_ENABLED_PAGES: readonly PageKey[] = PAGE_KEYS.filter(
  (key) => !(key in FOLLOWING_PAGE_KEYS) && !OPT_IN_PAGE_KEYS.includes(key),
);

const isPageKey = (key: string): key is PageKey => (PAGE_KEYS as readonly string[]).includes(key);

/**
 * Web's `isPageEnabled`. Nothing stored (missing, not a list, or empty) is the default set, without
 * the opt-in pages.
 */
export function isPageEnabled(
  enabledPages: readonly string[] | null | undefined,
  key: PageKey,
): boolean {
  const followed = FOLLOWING_PAGE_KEYS[key];
  if (followed) return isPageEnabled(enabledPages, followed);
  if (!enabledPages || !Array.isArray(enabledPages) || enabledPages.length === 0) {
    return DEFAULT_ENABLED_PAGES.includes(key);
  }
  return enabledPages.includes(key);
}

/** One entry of More above its footer: a group with its heading, or a group left with one page. */
export type MoreEntry =
  | { readonly kind: "group"; readonly key: string; readonly label: string; pages: MorePage[] }
  | {
      readonly kind: "row";
      /** Web's key for the row: the group's when it collapses under the group's name. */
      readonly key: string;
      readonly label: string;
      readonly icon: MorePage["icon"];
      readonly webRoute: string;
      /** The page it opens (`flump://page/<pageKey>`). */
      readonly pageKey: string;
    };

/** The pages the tab bar reaches (web's `BAR_KEYS`: the bar's tabs and the page Pay opens). */
const BAR_KEYS: ReadonlySet<string> = new Set([...TABS.map((tab) => tab.key), "takeHome"]);

/**
 * What More lists above its footer for these switched-on pages, as web's phone drawer: switched-off
 * pages dropped, a group left with no page dropped, a group left with one page turned into a row
 * for it, then whatever the tab bar already reaches dropped. With no profile read, the default set.
 */
export function moreEntries(enabledPages: readonly string[] | null | undefined): MoreEntry[] {
  const entries: MoreEntry[] = [];
  for (const group of MORE_GROUPS) {
    const pages: MorePage[] = group.pages.filter(
      (page: MorePage) =>
        page.alwaysOn === true || (isPageKey(page.key) && isPageEnabled(enabledPages, page.key)),
    );
    if (pages.length === 0) continue;
    const [only] = pages;
    if (pages.length === 1 && only) {
      // Web's collapse. Under the group's name, the row keeps the group's key and icon.
      const row: MoreEntry =
        "collapseTo" in group && group.collapseTo === "group"
          ? {
              kind: "row",
              key: group.key,
              label: group.label,
              icon: group.icon,
              webRoute: only.webRoute,
              pageKey: only.key,
            }
          : {
              kind: "row",
              key: only.key,
              label: only.label,
              icon: only.icon,
              webRoute: only.webRoute,
              pageKey: only.key,
            };
      if (!BAR_KEYS.has(row.key)) entries.push(row);
      continue;
    }
    const shown = pages.filter((page) => !BAR_KEYS.has(page.key));
    if (shown.length > 0) {
      entries.push({ kind: "group", key: group.key, label: group.label, pages: shown });
    }
  }
  return entries;
}

/**
 * A stored page list with Self Assessment switched on or off, as web's Profile writes it. Unlike
 * web, an empty or missing list starts from the default set, so switching Self Assessment on never
 * switches the default pages off (an empty list means "the defaults", not "none").
 */
export function withSelfAssessment(
  list: readonly string[] | null | undefined,
  on: boolean,
): string[] {
  const base = (list && list.length > 0 ? list : DEFAULT_ENABLED_PAGES).filter((k) => k !== "tax");
  return on ? [...base, "tax"] : [...base];
}

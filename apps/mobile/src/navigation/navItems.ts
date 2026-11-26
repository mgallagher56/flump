/**
 * The app's navigation, mirrored from web's `navConfig.ts` (E12 S4, plan 9.7): the tab bar is web's
 * `BOTTOM_BAR_TABS` plus More, and the More list is what web's phone drawer lists below the bottom
 * bar (`withoutBarPages(AUTH_NAV_ROUTES)`, then `DRAWER_FOOTER_ROUTES`). Plain data with no
 * imports, so web's Vitest suite reads it: `apps/web/app/components/navigation/mobileNavParity.test.tsx`
 * fails when the two drift. Labels are web's English locale strings.
 */

/** A shape in `iconShapes.ts`, named as lucide names it. */
export type IconName =
  | "house"
  | "scale"
  | "wallet"
  | "calculator"
  | "ellipsis"
  | "file-text"
  | "piggy-bank"
  | "coins"
  | "briefcase"
  | "trending-down"
  | "building-2"
  | "settings"
  | "bot"
  | "log-out"
  | "menu"
  | "chevron-right";

export interface TabItem {
  /** Web's key. */
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  /** The route file under `app/(app)/(tabs)/`. */
  readonly routeName: string;
  /** The same page on the website; More has none (web's More opens the drawer). */
  readonly webRoute?: string;
}

export const TABS = [
  { key: "home", label: "Home", icon: "house", routeName: "index", webRoute: "/" },
  {
    key: "accounts",
    label: "Accounts",
    icon: "scale",
    routeName: "accounts",
    webRoute: "/app/accounts",
  },
  { key: "budget", label: "Budget", icon: "wallet", routeName: "budget", webRoute: "/app/budget" },
  {
    key: "taxAndPay",
    label: "Pay",
    icon: "calculator",
    routeName: "pay",
    webRoute: "/app/take-home",
  },
  { key: "more", label: "More", icon: "ellipsis", routeName: "more" },
] as const satisfies readonly TabItem[];

export type TabKey = (typeof TABS)[number]["key"];

export interface MorePage {
  /** Web's key, and the deep link `flump://page/<key>`. */
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly webRoute: string;
}

export interface MoreGroup {
  readonly key: string;
  readonly label: string;
  readonly pages: readonly MorePage[];
}

/** Web's drawer groups, without the pages the tab bar already reaches. */
export const MORE_GROUPS = [
  {
    key: "taxAndPay",
    label: "Pay",
    pages: [
      {
        key: "tax",
        label: "Self Assessment",
        icon: "file-text",
        webRoute: "/app/self-assessment",
      },
    ],
  },
  {
    key: "savingsAndPension",
    label: "Savings and pension",
    pages: [
      { key: "savings", label: "Savings", icon: "piggy-bank", webRoute: "/app/savings" },
      { key: "pension", label: "Pension", icon: "coins", webRoute: "/app/pension" },
      { key: "retirement", label: "Retirement", icon: "briefcase", webRoute: "/app/retirement" },
    ],
  },
  {
    key: "borrowing",
    label: "Debt and borrowing",
    pages: [
      { key: "debt", label: "Cards and loans", icon: "trending-down", webRoute: "/app/debt" },
      { key: "mortgage", label: "Mortgage", icon: "building-2", webRoute: "/app/mortgage" },
    ],
  },
] as const satisfies readonly MoreGroup[];

/** The rows under the groups: web's `DRAWER_FOOTER_ROUTES`. Sign out follows them. */
export const MORE_FOOTER = [
  { key: "settings", label: "Settings", icon: "settings", webRoute: "/app/profile" },
  {
    key: "connectAi",
    label: "Connect AI",
    icon: "bot",
    webRoute: "/app/profile?tab=ai_connections",
  },
  { key: "tools", label: "Calculators", icon: "calculator", webRoute: "/tools" },
] as const satisfies readonly MorePage[];

/** Every page the More list opens, in its order. */
export const MORE_PAGES: readonly MorePage[] = [
  ...MORE_GROUPS.flatMap((group): readonly MorePage[] => group.pages),
  ...MORE_FOOTER,
];

export const findMorePage = (key: string): MorePage | undefined =>
  MORE_PAGES.find((page) => page.key === key);

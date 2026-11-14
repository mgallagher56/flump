/**
 * Single source of truth for the public calculator slugs, their display order and the older
 * URLs that redirect to them. Used by the web app (`/tools`, 301s) and marketing (`/tools`,
 * sitemap, canonical links). Pure data with no React, so either app's server can import it.
 */

/**
 * Display order (E31, E16 PR 11): everyday money first. The income-above-£100,000 tool is always
 * last and is never featured (owner rule). The slug keeps its old wording because it is a URL.
 */
export const TOOL_SLUGS = [
  "uk-debt-snowball-vs-avalanche-calculator",
  "0-percent-balance-transfer-payoff-calculator",
  "overdraft-cost-and-payoff-calculator",
  "mortgage-overpayment-vs-isa-calculator",
  "uk-student-loan-overpay-or-invest-calculator",
  "uk-pay-rise-take-home-calculator",
  "section-24-landlord-tax-calculator",
  "uk-100k-tax-trap-calculator",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

/** The money domain a tool belongs to. Picks its `IconTile` colour (E16 P9.3). */
export type ToolDomain = "debt" | "mortgage" | "pay" | "tax";

/** Names a Lucide icon in `toolIcons.ts`; kept as a string so this file stays free of React. */
export type ToolIconName =
  | "layers"
  | "credit-card"
  | "wallet"
  | "house"
  | "graduation-cap"
  | "pound-sterling"
  | "building"
  | "percent";

export interface ToolCatalogueEntry {
  slug: ToolSlug;
  /** The tool's one name: the card title, the h1 and the breadcrumb in both apps (D11). */
  title: string;
  /** For compact link lists such as footers. */
  shortTitle: string;
  /** One line under the title, on the card and on the tool page. Describes only what the tool does. */
  description: string;
  /** The `<title>` text, without the " | Flump" suffix. */
  metaTitle: string;
  domain: ToolDomain;
  icon: ToolIconName;
}

const ENTRIES: Record<ToolSlug, Omit<ToolCatalogueEntry, "slug">> = {
  "uk-debt-snowball-vs-avalanche-calculator": {
    title: "Debt payoff methods compared",
    shortTitle: "Debt payoff methods",
    description:
      "Compare total interest and the time to pay off when paying the highest rate first (avalanche) or the smallest balance first (snowball).",
    metaTitle: "Debt payoff methods calculator: highest rate or smallest balance first",
    domain: "debt",
    icon: "layers",
  },
  "0-percent-balance-transfer-payoff-calculator": {
    title: "When a 0% balance transfer ends",
    shortTitle: "0% balance transfer",
    description:
      "Estimate the monthly payment that pays off a transferred balance before the 0% deal ends.",
    metaTitle: "0% balance transfer payoff calculator",
    domain: "debt",
    icon: "credit-card",
  },
  "overdraft-cost-and-payoff-calculator": {
    title: "Overdraft interest cost calculator",
    shortTitle: "Overdraft interest",
    description:
      "Estimate a year's interest on an arranged overdraft from the balance and rate you enter.",
    metaTitle: "Arranged overdraft interest calculator",
    domain: "debt",
    icon: "wallet",
  },
  "mortgage-overpayment-vs-isa-calculator": {
    title: "Mortgage overpayment or Stocks and Shares ISA",
    shortTitle: "Mortgage or ISA",
    description:
      "Compare the interest saved by overpaying with what the same money might earn in an ISA.",
    metaTitle: "Mortgage overpayment or Stocks and Shares ISA calculator",
    domain: "mortgage",
    icon: "house",
  },
  "uk-student-loan-overpay-or-invest-calculator": {
    title: "Student loan repayment calculator",
    shortTitle: "Student loan repayments",
    description:
      "Estimate whether a Plan 1, 2, 4 or 5 student loan is paid off or written off first.",
    metaTitle: "Student loan repayment calculator (Plans 1, 2, 4 and 5)",
    domain: "pay",
    icon: "graduation-cap",
  },
  "uk-pay-rise-take-home-calculator": {
    title: "What you keep from a pay rise",
    shortTitle: "Pay rise take-home",
    description:
      "Estimate how much of a pay rise you keep after Income Tax, National Insurance, student loan and the Child Benefit charge.",
    metaTitle: "What you keep from a pay rise: take-home calculator",
    domain: "pay",
    icon: "pound-sterling",
  },
  "section-24-landlord-tax-calculator": {
    title: "Section 24 landlord tax calculator",
    shortTitle: "Landlord tax",
    description:
      "Estimate buy-to-let tax under Section 24, including the tax credit for mortgage interest.",
    metaTitle: "Section 24 landlord tax calculator",
    domain: "tax",
    icon: "building",
  },
  "uk-100k-tax-trap-calculator": {
    title: "Pension contributions and income above £100,000",
    shortTitle: "Income above £100,000",
    description:
      "Estimate how a pension contribution changes adjusted net income, the Personal Allowance and take-home pay.",
    metaTitle: "Pension contributions and income above £100,000: calculator",
    domain: "tax",
    icon: "percent",
  },
};

/** The h1 of both apps' `/tools` index (D11; "free during the beta", owner ruling 4). */
export const TOOLS_INDEX_TITLE = "UK money calculators, free during the beta";

/** The line under that h1, and the index meta description, in both apps. */
export const TOOLS_INDEX_DESCRIPTION =
  "Calculators for UK debt, mortgages, student loans and tax. No account needed.";

/** Every tool in display order: the one source for both apps' indexes, tool pages and footers. */
export const TOOL_CATALOGUE: readonly ToolCatalogueEntry[] = TOOL_SLUGS.map((slug) => ({
  slug,
  ...ENTRIES[slug],
}));

export const getToolEntry = (slug: ToolSlug): ToolCatalogueEntry => ({ slug, ...ENTRIES[slug] });

/** Older URLs that redirect (301) to a canonical slug. Never listed in a sitemap. */
export const TOOL_SLUG_ALIASES: Readonly<Record<string, ToolSlug>> = {
  // Former web app slugs.
  "mortgage-overpay-vs-isa": "mortgage-overpayment-vs-isa-calculator",
  "section-24-landlord-calculator": "section-24-landlord-tax-calculator",
  // Former marketing slugs.
  "mortgage-overpay-vs-isa-calculator": "mortgage-overpayment-vs-isa-calculator",
  "zero-percent-balance-transfer-calculator": "0-percent-balance-transfer-payoff-calculator",
  "landlord-section-24-tax-calculator": "section-24-landlord-tax-calculator",
  "overdraft-interest-calculator": "overdraft-cost-and-payoff-calculator",
  "student-loan-plan-2-calculator": "uk-student-loan-overpay-or-invest-calculator",
};

export const isCanonicalToolSlug = (slug: string | undefined): slug is ToolSlug =>
  !!slug && (TOOL_SLUGS as readonly string[]).includes(slug);

/** The canonical slug for a canonical slug or an alias; undefined for anything else. */
export const resolveToolSlug = (slug: string | undefined): ToolSlug | undefined => {
  if (!slug) return undefined;
  if (isCanonicalToolSlug(slug)) return slug;
  return Object.hasOwn(TOOL_SLUG_ALIASES, slug) ? TOOL_SLUG_ALIASES[slug] : undefined;
};

/** True for a canonical slug or an alias. */
export const isKnownToolSlug = (slug: string | undefined): boolean =>
  resolveToolSlug(slug) !== undefined;

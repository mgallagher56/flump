/**
 * Single source of truth for the public calculator slugs, their display order and the older
 * URLs that redirect to them. Used by the web app (`/tools`, 301s) and marketing (`/tools`,
 * sitemap, canonical links). Pure data with no React, so either app's server can import it.
 */

/** Display order (E31): everyday money first; the £100k trap is near the end and never leads. */
export const TOOL_SLUGS = [
  "uk-debt-snowball-vs-avalanche-calculator",
  "0-percent-balance-transfer-payoff-calculator",
  "overdraft-cost-and-payoff-calculator",
  "mortgage-overpayment-vs-isa-calculator",
  "uk-student-loan-overpay-or-invest-calculator",
  "uk-pay-rise-take-home-calculator",
  "uk-100k-tax-trap-calculator",
  "section-24-landlord-tax-calculator",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

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

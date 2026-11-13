/** Pure data (no React) so the Express server can read it for the sitemap. */
export const STATIC_PATHS = ["/", "/tools", "/pricing", "/security", "/mcp", "/contact"] as const;

/** Display order (E31): everyday money first; the £100k trap is one tool among many. */
export const CANONICAL_TOOL_SLUGS = [
  "uk-debt-snowball-vs-avalanche-calculator",
  "0-percent-balance-transfer-payoff-calculator",
  "overdraft-cost-and-payoff-calculator",
  "mortgage-overpayment-vs-isa-calculator",
  "uk-student-loan-overpay-or-invest-calculator",
  "uk-100k-tax-trap-calculator",
  "section-24-landlord-tax-calculator",
] as const;

/** Older URLs that still resolve to a calculator (not listed in the sitemap). */
export const TOOL_SLUG_ALIASES: Record<string, string> = {
  "mortgage-overpay-vs-isa-calculator": "mortgage-overpayment-vs-isa-calculator",
  "zero-percent-balance-transfer-calculator": "0-percent-balance-transfer-payoff-calculator",
  "landlord-section-24-tax-calculator": "section-24-landlord-tax-calculator",
  "overdraft-interest-calculator": "overdraft-cost-and-payoff-calculator",
  "student-loan-plan-2-calculator": "uk-student-loan-overpay-or-invest-calculator",
};

export const isKnownToolSlug = (slug: string | undefined): boolean =>
  !!slug &&
  ((CANONICAL_TOOL_SLUGS as readonly string[]).includes(slug) ||
    Object.hasOwn(TOOL_SLUG_ALIASES, slug));

import { TOOL_SLUGS, type ToolSlug } from "@repo/ui/tools";

/** Pure data (no React) so the Express server can read it for the sitemap. */
export const STATIC_PATHS = ["/", "/tools", "/pricing", "/security", "/mcp", "/contact"] as const;

/**
 * Tool slugs, order and aliases come from the shared catalogue in `@repo/ui/tools`, which the
 * web app's `/tools` also reads, so the two sites cannot drift.
 */
export const CANONICAL_TOOL_SLUGS = TOOL_SLUGS;
export { isKnownToolSlug, TOOL_SLUG_ALIASES } from "@repo/ui/tools";

/** Short names for the footer and other compact lists. A Record, so a new slug must add one. */
export const TOOL_SHORT_LABELS: Record<ToolSlug, string> = {
  "uk-debt-snowball-vs-avalanche-calculator": "Snowball vs avalanche",
  "0-percent-balance-transfer-payoff-calculator": "0% balance transfer calculator",
  "overdraft-cost-and-payoff-calculator": "Overdraft cost",
  "mortgage-overpayment-vs-isa-calculator": "Mortgage vs Stocks and Shares ISA",
  "uk-student-loan-overpay-or-invest-calculator": "Student loan repayments",
  "uk-pay-rise-take-home-calculator": "What you keep from a pay rise",
  "uk-100k-tax-trap-calculator": "Income between £100,000 and £125,140",
  "section-24-landlord-tax-calculator": "Section 24 landlord tax",
};

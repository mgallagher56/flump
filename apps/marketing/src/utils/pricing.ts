import { BUSINESS_DETAILS, formatPrice } from "@flump/business-details";

/**
 * The single place the marketing site reads the paid-plan price from (E24-T4). The values live in
 * `packages/business-details` (owner runbook: docs/runbooks/business-details.md). While the price
 * is still a placeholder `status` is "not-set" and the page shows only `display` ("Price not
 * set"): never the placeholder figures, never an example price and never a billing toggle (E16
 * D10 b). Setting the price there flips `status` to "set", and `display` becomes the real monthly
 * price.
 *
 * Whether the paid card renders at all is decided at build time by `VITE_SHOW_PAID_PLAN`
 * (vite.config.ts): "false" in a public launch build (FLUMP_LAUNCH or ALLOW_INDEXING exactly
 * "true") while `status` is "not-set". PricingPage reads it inline so the bundler drops the card.
 * Unset (dev, tests) means shown.
 */
export type PricingStatus = "not-set" | "set";

export interface Pricing {
  status: PricingStatus;
  /** The only price text the page may show for the paid plan. */
  display: string;
}

export const PRICE_NOT_SET = "Price not set";

/** Builds the page's price text from business details. Exported for the guard tests. */
export function pricingFrom(price: typeof BUSINESS_DETAILS.price): Pricing {
  if (price.isPlaceholder) return { status: "not-set", display: PRICE_NOT_SET };
  return { status: "set", display: `${formatPrice(price.value.monthly)} a month` };
}

export const PRICING: Pricing = pricingFrom(BUSINESS_DETAILS.price);

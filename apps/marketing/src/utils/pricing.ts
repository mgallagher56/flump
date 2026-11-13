import { BUSINESS_DETAILS } from "@flump/business-details";

/**
 * The single place the marketing site reads the paid-plan price from (E24-T4). The values live in
 * `packages/business-details` (owner runbook: docs/runbooks/business-details.md). While the price
 * is still a placeholder `status` is "not-set". Setting the price there flips it to "set", which
 * is the only way the paid plan card is shown in a launch build.
 *
 * Whether the paid card and billing toggle render is decided at build time by `VITE_SHOW_PAID_PLAN`
 * (vite.config.ts): "false" in a public launch build (FLUMP_LAUNCH or ALLOW_INDEXING exactly
 * "true") while `status` is "not-set". PricingPage reads it inline so the bundler drops the
 * placeholder price code instead of hiding it with CSS. Unset (dev, tests) means shown.
 */
export type PricingStatus = "not-set" | "set";

export interface Pricing {
  /** Monthly price in pounds, billed monthly. */
  monthly: number;
  /** Annual price in pounds, billed annually. */
  annual: number;
  /** Badge text shown beside the price while it is not final. */
  label: string;
  status: PricingStatus;
}

export const PRICING: Pricing = {
  monthly: BUSINESS_DETAILS.price.value.monthly,
  annual: BUSINESS_DETAILS.price.value.annual,
  label: BUSINESS_DETAILS.price.value.label,
  status: BUSINESS_DETAILS.price.isPlaceholder ? "not-set" : "set",
};

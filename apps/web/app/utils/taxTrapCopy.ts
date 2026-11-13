import type { TaxTrapAnalysis, UkTaxRegion } from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";

/**
 * Tax trap copy for every surface. The two rates come from the engine's named fields
 * (decision D7-a): `marginalRatePct` is income tax only and `effectiveMarginalRatePct`
 * adds employee NI. Components never hard-code the figures.
 */
export function formatTrapRate(pct: number): string {
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(pct)}%`;
}

export interface TaxTrapCopy {
  /** Income tax only, e.g. "60%". */
  incomeTaxRate: string;
  /** Income tax plus employee NI, e.g. "62%". */
  effectiveRate: string;
  /** e.g. "60% income tax, 62% including NI". */
  breakdown: string;
}

export function getTaxTrapCopy(analysis: TaxTrapAnalysis): TaxTrapCopy {
  const incomeTaxRate = formatTrapRate(analysis.marginalRatePct);
  const effectiveRate = formatTrapRate(analysis.effectiveMarginalRatePct);
  return {
    incomeTaxRate,
    effectiveRate,
    breakdown: `${incomeTaxRate} income tax, ${effectiveRate} including NI`,
  };
}

export const REGION_ASSUMPTION_LABEL = "Assuming England, Wales and Northern Ireland rates.";

/** Where a user sets their tax region after onboarding (profile settings, E23 D-4-C). */
export const REGION_SETTINGS_PATH = "/app/profile";

/** The "Set your region" link after the assumption label: primary colour and a visible focus ring. */
export const regionLinkStyle = css({
  color: "primary",
  textDecoration: "underline",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/**
 * The region the user told us, or null when England, Wales and NI is only the labelled
 * assumption (E23 D-4). Scotland is only ever stored from the user's own answer, so it is
 * always known; a baseline without `ukRegionAssumed: false` is treated as assumed.
 */
export function getKnownTrapRegion(
  baseline: { ukRegion?: UkTaxRegion | null; ukRegionAssumed?: boolean } | null | undefined,
): UkTaxRegion | null {
  if (!baseline?.ukRegion) return null;
  if (baseline.ukRegion === "SCOTLAND") return "SCOTLAND";
  return baseline.ukRegionAssumed === false ? baseline.ukRegion : null;
}

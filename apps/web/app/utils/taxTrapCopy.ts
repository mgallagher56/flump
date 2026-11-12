import type { TaxTrapAnalysis, UkTaxRegion } from "@flump/finance-engine";

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
export const REGION_SETTINGS_HREF = "/app/profile";
export const REGION_SETTINGS_ACTION = "Set your region";

/**
 * Only Scotland can be known today: the baseline always carries a default ukRegion and region is
 * not yet captured (E23 T-FIX-2), so England, Wales and NI is an assumption until it is.
 */
export function getKnownTrapRegion(ukRegion: UkTaxRegion | undefined | null): UkTaxRegion | null {
  return ukRegion === "SCOTLAND" ? "SCOTLAND" : null;
}

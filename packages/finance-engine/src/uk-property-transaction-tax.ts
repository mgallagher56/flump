import type { UkTaxRegion } from "./types.js";
import { UK_PROPERTY_TRANSACTION_TAX_SOURCES } from "./uk-rule-sources.js";

/**
 * UK residential property transaction tax engine (E39 S1b, MA7).
 *
 * Covers the three UK jurisdictions for a main home bought by one or more people who own no other
 * home, with first-time buyer relief where the regime has one:
 * - England & Northern Ireland: Stamp Duty Land Tax (SDLT)
 * - Scotland: Land and Buildings Transaction Tax (LBTT)
 * - Wales: Land Transaction Tax (LTT)
 *
 * Higher rates for additional homes and non-UK resident surcharges are outside version one.
 *
 * Tax bands and rates signed off by fable-decider, 2026-11-22 (no signed vector hash exists).
 */

/** Date the official sources for every regime were last read against these bands (ISO 8601). */
export const PROPERTY_TAX_SOURCES_CHECKED_ON = "2026-11-22";

export type UkPropertyTaxJurisdiction = "ENGLAND_NI" | "SCOTLAND" | "WALES";

export type UkPropertyTaxRegime = "SDLT" | "LBTT" | "LTT";

export interface PropertyTaxBand {
  /** Lower bound of the band in pounds (portion above this threshold up to `toGbp` is taxed). */
  fromGbp: number;
  /** Inclusive upper bound of the band in pounds, or `null` for the open-ended top band. */
  toGbp: number | null;
  /** Marginal tax rate as a percentage (e.g. `5` for 5%). */
  ratePct: number;
}

export interface PropertyTransactionTaxInput {
  /** Property purchase price in pounds. Non-finite or negative values are treated as 0. */
  propertyPriceGbp: number;
  /** UK property-tax jurisdiction: England & Northern Ireland, Scotland, or Wales. */
  jurisdiction: UkPropertyTaxJurisdiction;
  /** Whether the buyer(s) qualify as first-time buyers (main home, never owned property). */
  isFirstTimeBuyer?: boolean;
}

export interface PropertyTransactionTaxBandBreakdown {
  fromGbp: number;
  toGbp: number | null;
  ratePct: number;
  /** Portion of the property price falling in this band, in pounds. */
  taxableSliceGbp: number;
  /** Tax due on this band, in pounds (rounded to pence for every regime; only the SDLT total is floored). */
  taxGbp: number;
}

export interface PropertyTransactionTaxResult {
  jurisdiction: UkPropertyTaxJurisdiction;
  regime: UkPropertyTaxRegime;
  /** Official tax name (e.g. "Stamp Duty Land Tax"). */
  taxName: string;
  propertyPriceGbp: number;
  isFirstTimeBuyer: boolean;
  /** True when the regime has first-time buyer relief and the purchase qualifies for it. */
  firstTimeBuyerReliefApplied: boolean;
  /**
   * Total estimated tax in pounds. SDLT is rounded down to the whole pound (HMRC SDLTM00050);
   * LBTT and LTT stay in pence, as no published rounding rule for them was found.
   */
  taxGbp: number;
  /** Effective tax rate as a percentage of `propertyPriceGbp` (2 decimal places), or 0 at £0. */
  effectiveRatePct: number;
  /** Band-by-band breakdown of the calculation. */
  bands: readonly PropertyTransactionTaxBandBreakdown[];
  /** Primary official source URL for the regime. */
  sourceUrl: string;
  /** Date the regime's current rates took effect (ISO 8601). */
  ratesEffectiveFrom: string;
  /** Date the official sources were last read against these rates (ISO 8601). */
  sourcesCheckedOn: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Maximum purchase price eligible for SDLT first-time buyer relief in England & Northern Ireland.
 * Above this threshold, standard residential SDLT rates apply to the entire purchase price.
 */
export const SDLT_FTB_MAX_PRICE_GBP = 500_000;

/** England & Northern Ireland SDLT standard residential bands (from 1 April 2025). */
export const SDLT_STANDARD_BANDS: readonly PropertyTaxBand[] = [
  { fromGbp: 0, toGbp: 125_000, ratePct: 0 },
  { fromGbp: 125_000, toGbp: 250_000, ratePct: 2 },
  { fromGbp: 250_000, toGbp: 925_000, ratePct: 5 },
  { fromGbp: 925_000, toGbp: 1_500_000, ratePct: 10 },
  { fromGbp: 1_500_000, toGbp: null, ratePct: 12 },
];

/** England & Northern Ireland SDLT first-time buyer relief bands (purchases up to £500,000). */
export const SDLT_FTB_BANDS: readonly PropertyTaxBand[] = [
  { fromGbp: 0, toGbp: 300_000, ratePct: 0 },
  { fromGbp: 300_000, toGbp: 500_000, ratePct: 5 },
];

/** Scotland LBTT standard residential bands (from 1 April 2021). */
export const LBTT_STANDARD_BANDS: readonly PropertyTaxBand[] = [
  { fromGbp: 0, toGbp: 145_000, ratePct: 0 },
  { fromGbp: 145_000, toGbp: 250_000, ratePct: 2 },
  { fromGbp: 250_000, toGbp: 325_000, ratePct: 5 },
  { fromGbp: 325_000, toGbp: 750_000, ratePct: 10 },
  { fromGbp: 750_000, toGbp: null, ratePct: 12 },
];

/** Scotland LBTT first-time buyer relief bands (from 1 April 2021; nil-rate band raised to £175,000). */
export const LBTT_FTB_BANDS: readonly PropertyTaxBand[] = [
  { fromGbp: 0, toGbp: 175_000, ratePct: 0 },
  { fromGbp: 175_000, toGbp: 250_000, ratePct: 2 },
  { fromGbp: 250_000, toGbp: 325_000, ratePct: 5 },
  { fromGbp: 325_000, toGbp: 750_000, ratePct: 10 },
  { fromGbp: 750_000, toGbp: null, ratePct: 12 },
];

/** Wales LTT main residential bands (from 10 October 2022; Wales has no first-time buyer relief). */
export const LTT_STANDARD_BANDS: readonly PropertyTaxBand[] = [
  { fromGbp: 0, toGbp: 225_000, ratePct: 0 },
  { fromGbp: 225_000, toGbp: 400_000, ratePct: 6 },
  { fromGbp: 400_000, toGbp: 750_000, ratePct: 7.5 },
  { fromGbp: 750_000, toGbp: 1_500_000, ratePct: 10 },
  { fromGbp: 1_500_000, toGbp: null, ratePct: 12 },
];

export interface PropertyTaxRegimeMeta {
  regime: UkPropertyTaxRegime;
  taxName: string;
  sourceUrl: string;
  hasFirstTimeBuyerRelief: boolean;
  /** Date the regime's current rates took effect (ISO 8601). */
  ratesEffectiveFrom: string;
  /** Date the official sources were last read against these rates (ISO 8601). */
  sourcesCheckedOn: string;
}

export const PROPERTY_TAX_REGIME_META: Readonly<
  Record<UkPropertyTaxJurisdiction, PropertyTaxRegimeMeta>
> = {
  ENGLAND_NI: {
    regime: "SDLT",
    taxName: "Stamp Duty Land Tax",
    sourceUrl: UK_PROPERTY_TRANSACTION_TAX_SOURCES.sdlt.url,
    hasFirstTimeBuyerRelief: true,
    ratesEffectiveFrom: "2025-04-01",
    sourcesCheckedOn: PROPERTY_TAX_SOURCES_CHECKED_ON,
  },
  SCOTLAND: {
    regime: "LBTT",
    taxName: "Land and Buildings Transaction Tax",
    sourceUrl: UK_PROPERTY_TRANSACTION_TAX_SOURCES.lbtt.url,
    hasFirstTimeBuyerRelief: true,
    ratesEffectiveFrom: "2021-04-01",
    sourcesCheckedOn: PROPERTY_TAX_SOURCES_CHECKED_ON,
  },
  WALES: {
    regime: "LTT",
    taxName: "Land Transaction Tax",
    sourceUrl: UK_PROPERTY_TRANSACTION_TAX_SOURCES.ltt.url,
    hasFirstTimeBuyerRelief: false,
    ratesEffectiveFrom: "2022-10-10",
    sourcesCheckedOn: PROPERTY_TAX_SOURCES_CHECKED_ON,
  },
};

function selectBandsForJurisdiction(
  jurisdiction: UkPropertyTaxJurisdiction,
  propertyPriceGbp: number,
  isFirstTimeBuyer: boolean,
): { bands: readonly PropertyTaxBand[]; firstTimeBuyerReliefApplied: boolean } {
  switch (jurisdiction) {
    case "ENGLAND_NI": {
      const qualifies = isFirstTimeBuyer && propertyPriceGbp <= SDLT_FTB_MAX_PRICE_GBP;
      return {
        bands: qualifies ? SDLT_FTB_BANDS : SDLT_STANDARD_BANDS,
        firstTimeBuyerReliefApplied: qualifies,
      };
    }
    case "SCOTLAND": {
      return {
        bands: isFirstTimeBuyer ? LBTT_FTB_BANDS : LBTT_STANDARD_BANDS,
        firstTimeBuyerReliefApplied: isFirstTimeBuyer,
      };
    }
    case "WALES": {
      return {
        bands: LTT_STANDARD_BANDS,
        firstTimeBuyerReliefApplied: false,
      };
    }
  }
}

function calculateBandedTax(
  propertyPriceGbp: number,
  bands: readonly PropertyTaxBand[],
): { totalTaxGbp: number; breakdown: PropertyTransactionTaxBandBreakdown[] } {
  let totalTaxGbp = 0;
  const breakdown: PropertyTransactionTaxBandBreakdown[] = [];

  for (const band of bands) {
    const upperBound = band.toGbp ?? propertyPriceGbp;
    const taxableSliceGbp =
      propertyPriceGbp > band.fromGbp
        ? round2(Math.min(propertyPriceGbp, upperBound) - band.fromGbp)
        : 0;
    const taxGbp = round2((taxableSliceGbp * band.ratePct) / 100);
    totalTaxGbp = round2(totalTaxGbp + taxGbp);
    breakdown.push({
      fromGbp: band.fromGbp,
      toGbp: band.toGbp,
      ratePct: band.ratePct,
      taxableSliceGbp,
      taxGbp,
    });
  }

  return { totalTaxGbp, breakdown };
}

/**
 * Maps the user's saved income-tax region (`"ENGLAND_NI_WALES"` or `"SCOTLAND"`) to the initial
 * property-tax jurisdiction for prefilling the "Where is the property?" control (E39 MA7).
 * `"ENGLAND_NI_WALES"` covers two regimes (SDLT and LTT), so it and a missing region return null
 * and the UI makes the user choose.
 */
export function defaultPropertyTaxJurisdictionForTaxRegion(
  ukRegion: UkTaxRegion | null | undefined,
): UkPropertyTaxJurisdiction | null {
  return ukRegion === "SCOTLAND" ? "SCOTLAND" : null;
}

/**
 * Estimates UK residential property transaction tax (SDLT, LBTT, or LTT) for a main home bought by
 * one or more people who own no other home.
 */
export function calculatePropertyTransactionTax(
  input: PropertyTransactionTaxInput,
): PropertyTransactionTaxResult {
  const propertyPriceGbp =
    Number.isFinite(input.propertyPriceGbp) && input.propertyPriceGbp > 0
      ? round2(input.propertyPriceGbp)
      : 0;
  const isFirstTimeBuyer = Boolean(input.isFirstTimeBuyer);
  const meta = PROPERTY_TAX_REGIME_META[input.jurisdiction];

  const { bands, firstTimeBuyerReliefApplied } = selectBandsForJurisdiction(
    input.jurisdiction,
    propertyPriceGbp,
    isFirstTimeBuyer,
  );
  const banded = calculateBandedTax(propertyPriceGbp, bands);
  const breakdown = banded.breakdown;
  // SDLT: "The amount calculated is round down to the nearest pound" (HMRC SDLTM00050), applied
  // to the total only. LBTT and LTT keep pence: no published rounding rule was found for them.
  const totalTaxGbp = meta.regime === "SDLT" ? Math.floor(banded.totalTaxGbp) : banded.totalTaxGbp;
  const effectiveRatePct =
    propertyPriceGbp > 0 ? round2((totalTaxGbp / propertyPriceGbp) * 100) : 0;

  return {
    jurisdiction: input.jurisdiction,
    regime: meta.regime,
    taxName: meta.taxName,
    propertyPriceGbp,
    isFirstTimeBuyer,
    firstTimeBuyerReliefApplied,
    taxGbp: totalTaxGbp,
    effectiveRatePct,
    bands: breakdown,
    sourceUrl: meta.sourceUrl,
    ratesEffectiveFrom: meta.ratesEffectiveFrom,
    sourcesCheckedOn: meta.sourcesCheckedOn,
  };
}

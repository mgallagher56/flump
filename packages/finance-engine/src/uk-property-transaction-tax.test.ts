import { describe, expect, it } from "vitest";
import {
  calculatePropertyTransactionTax,
  defaultPropertyTaxJurisdictionForTaxRegion,
  PROPERTY_TAX_REGIME_META,
  SDLT_FTB_MAX_PRICE_GBP,
} from "./uk-property-transaction-tax.js";
import { UK_PROPERTY_TRANSACTION_TAX_SOURCES } from "./uk-rule-sources.js";

describe("UK property transaction tax engine (E39 S1b, MA7)", () => {
  describe("England & Northern Ireland — SDLT", () => {
    it("returns £0 and 0% effective rate for £0, negative, and non-finite prices", () => {
      for (const price of [0, -50_000, Number.NaN, Number.POSITIVE_INFINITY]) {
        const res = calculatePropertyTransactionTax({
          propertyPriceGbp: price,
          jurisdiction: "ENGLAND_NI",
        });
        expect(res.regime).toBe("SDLT");
        expect(res.taxName).toBe("Stamp Duty Land Tax");
        expect(res.propertyPriceGbp).toBe(0);
        expect(res.taxGbp).toBe(0);
        expect(res.effectiveRatePct).toBe(0);
        expect(res.firstTimeBuyerReliefApplied).toBe(false);
        expect(res.sourceUrl).toBe(UK_PROPERTY_TRANSACTION_TAX_SOURCES.sdlt.url);
        expect(res.ratesEffectiveFrom).toBe("2025-04-01");
        expect(res.sourcesCheckedOn).toBe("2026-11-22");
      }
    });

    it.each([
      // Band 1: 0% up to £125,000
      { price: 125_000, expectedTax: 0, expectedEffectiveRate: 0 },
      // Just above £125,000: £100 * 2% = £2.00
      { price: 125_100, expectedTax: 2, expectedEffectiveRate: 0 },
      // Band 2 boundary £250,000: (£250,000 - £125,000) * 2% = £2,500
      { price: 250_000, expectedTax: 2_500, expectedEffectiveRate: 1 },
      // Just above £250,000: £2,500 + £100 * 5% = £2,505
      { price: 250_100, expectedTax: 2_505, expectedEffectiveRate: 1 },
      // Mid-band £350,000: £125,000 * 2% (£2,500) + £100,000 * 5% (£5,000) = £7,500
      { price: 350_000, expectedTax: 7_500, expectedEffectiveRate: 2.14 },
      // Band 3 boundary £925,000: £2,500 + £675,000 * 5% (£33,750) = £36,250
      { price: 925_000, expectedTax: 36_250, expectedEffectiveRate: 3.92 },
      // Just above £925,000: £36,250 + £100 * 10% = £36,260
      { price: 925_100, expectedTax: 36_260, expectedEffectiveRate: 3.92 },
      // Band 4 boundary £1,500,000: £36,250 + £575,000 * 10% (£57,500) = £93,750
      { price: 1_500_000, expectedTax: 93_750, expectedEffectiveRate: 6.25 },
      // Above £1,500,000 (£2,000,000): £93,750 + £500,000 * 12% (£60,000) = £153,750
      { price: 2_000_000, expectedTax: 153_750, expectedEffectiveRate: 7.69 },
    ])(
      "standard residential at £$price -> £$expectedTax",
      ({ price, expectedTax, expectedEffectiveRate }) => {
        const res = calculatePropertyTransactionTax({
          propertyPriceGbp: price,
          jurisdiction: "ENGLAND_NI",
          isFirstTimeBuyer: false,
        });
        expect(res.taxGbp).toBe(expectedTax);
        expect(res.effectiveRatePct).toBe(expectedEffectiveRate);
        expect(res.firstTimeBuyerReliefApplied).toBe(false);
      },
    );

    it("applies first-time buyer relief up to £500,000 and falls back to standard above £500,000", () => {
      expect(PROPERTY_TAX_REGIME_META.ENGLAND_NI.hasFirstTimeBuyerRelief).toBe(true);
      expect(SDLT_FTB_MAX_PRICE_GBP).toBe(500_000);

      // £300,000: 0% up to £300,000 -> £0
      const at300k = calculatePropertyTransactionTax({
        propertyPriceGbp: 300_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(at300k.taxGbp).toBe(0);
      expect(at300k.firstTimeBuyerReliefApplied).toBe(true);

      // £400,000: £100,000 * 5% = £5,000 (standard would be £10,000)
      const at400k = calculatePropertyTransactionTax({
        propertyPriceGbp: 400_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(at400k.taxGbp).toBe(5_000);
      expect(at400k.effectiveRatePct).toBe(1.25);
      expect(at400k.firstTimeBuyerReliefApplied).toBe(true);
      expect(at400k.bands).toEqual([
        { fromGbp: 0, toGbp: 300_000, ratePct: 0, taxableSliceGbp: 300_000, taxGbp: 0 },
        { fromGbp: 300_000, toGbp: 500_000, ratePct: 5, taxableSliceGbp: 100_000, taxGbp: 5_000 },
      ]);

      // Exactly £500,000 (inclusive cap): £200,000 * 5% = £10,000
      const at500k = calculatePropertyTransactionTax({
        propertyPriceGbp: 500_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(at500k.taxGbp).toBe(10_000);
      expect(at500k.firstTimeBuyerReliefApplied).toBe(true);

      // £500,001 (cliff edge over £500,000): standard rates apply!
      // £125,000 * 2% (£2,500) + £250,001 * 5% (£12,500.05) = £15,000.05
      const above500k = calculatePropertyTransactionTax({
        propertyPriceGbp: 500_001,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(above500k.taxGbp).toBe(15_000.05);
      expect(above500k.isFirstTimeBuyer).toBe(true);
      expect(above500k.firstTimeBuyerReliefApplied).toBe(false);
    });
  });

  describe("Scotland — LBTT", () => {
    it.each([
      // £0: £0
      { price: 0, expectedTax: 0 },
      // Band 1 boundary £145,000: 0% -> £0
      { price: 145_000, expectedTax: 0 },
      // Just above £145,000 (£145,100): £100 * 2% = £2
      { price: 145_100, expectedTax: 2 },
      // £175,000 (standard): £30,000 * 2% = £600
      { price: 175_000, expectedTax: 600 },
      // Band 2 boundary £250,000: £105,000 * 2% = £2,100
      { price: 250_000, expectedTax: 2_100 },
      // Just above £250,000 (£250,100): £2,100 + £100 * 5% = £2,105
      { price: 250_100, expectedTax: 2_105 },
      // Band 3 boundary £325,000: £2,100 + £75,000 * 5% (£3,750) = £5,850
      { price: 325_000, expectedTax: 5_850 },
      // Just above £325,000 (£325,100): £5,850 + £100 * 10% = £5,860
      { price: 325_100, expectedTax: 5_860 },
      // Band 4 boundary £750,000: £5,850 + £425,000 * 10% (£42,500) = £48,350
      { price: 750_000, expectedTax: 48_350 },
      // Above £750,000 (£1,000,000): £48,350 + £250,000 * 12% (£30,000) = £78,350
      { price: 1_000_000, expectedTax: 78_350 },
    ])("standard residential at £$price -> £$expectedTax", ({ price, expectedTax }) => {
      const res = calculatePropertyTransactionTax({
        propertyPriceGbp: price,
        jurisdiction: "SCOTLAND",
        isFirstTimeBuyer: false,
      });
      expect(res.regime).toBe("LBTT");
      expect(res.taxName).toBe("Land and Buildings Transaction Tax");
      expect(res.taxGbp).toBe(expectedTax);
      expect(res.firstTimeBuyerReliefApplied).toBe(false);
      expect(res.sourceUrl).toBe(UK_PROPERTY_TRANSACTION_TAX_SOURCES.lbtt.url);
      expect(res.ratesEffectiveFrom).toBe("2021-04-01");
      expect(res.sourcesCheckedOn).toBe("2026-11-22");
    });

    it("applies first-time buyer relief (0% up to £175,000, £600 max saving, no price cap)", () => {
      expect(PROPERTY_TAX_REGIME_META.SCOTLAND.hasFirstTimeBuyerRelief).toBe(true);
      // £175,000: £0 (saving £600 vs standard £600)
      const at175k = calculatePropertyTransactionTax({
        propertyPriceGbp: 175_000,
        jurisdiction: "SCOTLAND",
        isFirstTimeBuyer: true,
      });
      expect(at175k.taxGbp).toBe(0);
      expect(at175k.firstTimeBuyerReliefApplied).toBe(true);

      // £250,000: £75,000 * 2% = £1,500 (saving £600 vs standard £2,100)
      const at250k = calculatePropertyTransactionTax({
        propertyPriceGbp: 250_000,
        jurisdiction: "SCOTLAND",
        isFirstTimeBuyer: true,
      });
      expect(at250k.taxGbp).toBe(1_500);
      expect(at250k.firstTimeBuyerReliefApplied).toBe(true);

      // £600,000 (above England's £500k cap, still eligible in Scotland):
      // £175k @ 0% = £0
      // £75k (£175k-£250k) @ 2% = £1,500
      // £75k (£250k-£325k) @ 5% = £3,750
      // £275k (£325k-£600k) @ 10% = £27,500
      // Total = £32,750 (standard is £33,350, £600 saving)
      const at600k = calculatePropertyTransactionTax({
        propertyPriceGbp: 600_000,
        jurisdiction: "SCOTLAND",
        isFirstTimeBuyer: true,
      });
      expect(at600k.taxGbp).toBe(32_750);
      expect(at600k.firstTimeBuyerReliefApplied).toBe(true);
    });
  });

  describe("Wales — LTT", () => {
    it.each([
      // £0: £0
      { price: 0, expectedTax: 0 },
      // Band 1 boundary £225,000: 0% -> £0
      { price: 225_000, expectedTax: 0 },
      // Just above £225,000 (£225,100): £100 * 6% = £6
      { price: 225_100, expectedTax: 6 },
      // Band 2 boundary £400,000: £175,000 * 6% = £10,500
      { price: 400_000, expectedTax: 10_500 },
      // Just above £400,000 (£400,100): £10,500 + £100 * 7.5% = £10,507.50
      { price: 400_100, expectedTax: 10_507.5 },
      // Band 3 boundary £750,000: £10,500 + £350,000 * 7.5% (£26,250) = £36,750
      { price: 750_000, expectedTax: 36_750 },
      // Just above £750,000 (£750,100): £36,750 + £100 * 10% = £36,760
      { price: 750_100, expectedTax: 36_760 },
      // Band 4 boundary £1,500,000: £36,750 + £750,000 * 10% (£75,000) = £111,750
      { price: 1_500_000, expectedTax: 111_750 },
      // Above £1,500,000 (£2,000,000): £111,750 + £500,000 * 12% (£60,000) = £171,750
      { price: 2_000_000, expectedTax: 171_750 },
    ])("main residential at £$price -> £$expectedTax", ({ price, expectedTax }) => {
      const res = calculatePropertyTransactionTax({
        propertyPriceGbp: price,
        jurisdiction: "WALES",
      });
      expect(res.regime).toBe("LTT");
      expect(res.taxName).toBe("Land Transaction Tax");
      expect(res.taxGbp).toBe(expectedTax);
      expect(res.firstTimeBuyerReliefApplied).toBe(false);
      expect(res.sourceUrl).toBe(UK_PROPERTY_TRANSACTION_TAX_SOURCES.ltt.url);
      expect(res.ratesEffectiveFrom).toBe("2022-10-10");
      expect(res.sourcesCheckedOn).toBe("2026-11-22");
    });

    it("has no first-time buyer relief even when isFirstTimeBuyer is true", () => {
      expect(PROPERTY_TAX_REGIME_META.WALES.hasFirstTimeBuyerRelief).toBe(false);
      // £300,000 in Wales: (£300,000 - £225,000) * 6% = £75,000 * 6% = £4,500
      const res = calculatePropertyTransactionTax({
        propertyPriceGbp: 300_000,
        jurisdiction: "WALES",
        isFirstTimeBuyer: true,
      });
      expect(res.isFirstTimeBuyer).toBe(true);
      expect(res.firstTimeBuyerReliefApplied).toBe(false);
      expect(res.taxGbp).toBe(4_500);
    });
  });

  describe("defaultPropertyTaxJurisdictionForTaxRegion", () => {
    it("maps SCOTLAND to SCOTLAND and ENGLAND_NI_WALES / missing to ENGLAND_NI", () => {
      expect(defaultPropertyTaxJurisdictionForTaxRegion("SCOTLAND")).toBe("SCOTLAND");
      expect(defaultPropertyTaxJurisdictionForTaxRegion("ENGLAND_NI_WALES")).toBe("ENGLAND_NI");
      expect(defaultPropertyTaxJurisdictionForTaxRegion(null)).toBe("ENGLAND_NI");
      expect(defaultPropertyTaxJurisdictionForTaxRegion(undefined)).toBe("ENGLAND_NI");
    });
  });
});

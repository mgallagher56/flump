import { describe, expect, it } from "vitest";
import {
  PROPERTY_PRICE_SOLVER_MAX_GBP,
  type PropertyPriceSolution,
  type PropertyPriceSolverInput,
  solvePropertyPrice,
} from "./property-price-solver.js";
import {
  calculatePropertyTransactionTax,
  LBTT_FTB_BANDS,
  LBTT_STANDARD_BANDS,
  LTT_STANDARD_BANDS,
  SDLT_FTB_BANDS,
  SDLT_STANDARD_BANDS,
  type UkPropertyTaxJurisdiction,
} from "./uk-property-transaction-tax.js";

/** Narrows to a solved result, failing the test with the actual status otherwise. */
function solved(input: PropertyPriceSolverInput) {
  const result = solvePropertyPrice(input);
  if (result.status !== "solved") throw new Error(`expected solved, got ${result.status}`);
  return result;
}

/** ceil(log2(gap)) for the whole-pence gap the bisection starts with: budget + 1p - loan. */
function stepBound(depositGbp: number, costsGbp = 0): number {
  const gapPence = Math.round((depositGbp - costsGbp) * 100) + 1;
  return Math.ceil(Math.log2(gapPence));
}

/**
 * Every hand-worked case: budget B = loan + deposit - other costs. The answer P is the largest
 * whole-pence price with P + tax(P) <= B. Each working shows tax(P) and that P + 1p does not fit.
 */
describe("solvePropertyPrice (E39 S1c)", () => {
  describe("England and Northern Ireland: SDLT, total floored to whole pounds", () => {
    it("stops exactly on the £125,000 edge of the nil band", () => {
      // B = 100,000 + 25,000 = 125,000. tax(125,000) = 0, so 125,000 + 0 = B fits.
      // P = 125,000.01: 2% of £0.01 = £0.0002 -> £0.00, floored £0 -> 125,000.01 > B.
      const res = solved({ loanGbp: 100_000, depositGbp: 25_000, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(125_000);
      expect(res.propertyTax.taxGbp).toBe(0);
      expect(res.depositTowardsPriceGbp).toBe(25_000);
      expect(res.unspentGbp).toBe(0);
      expect(res.steps).toBeLessThanOrEqual(stepBound(25_000));
    });

    it("solves inside the 2% band", () => {
      // B = 180,000 + 21,500 = 201,500. P + 2% x (P - 125,000) = 201,500 -> 1.02P = 204,000
      // -> P = 200,000; tax = 2% x 75,000 = £1,500; 200,000 + 1,500 = B.
      // P = 200,000.01: 2% x 75,000.01 = 1,500.0002 -> 1,500.00 -> £1,500 -> 201,500.01 > B.
      const res = solved({ loanGbp: 180_000, depositGbp: 21_500, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(200_000);
      expect(res.propertyTax.taxGbp).toBe(1_500);
      expect(res.depositTowardsPriceGbp).toBe(20_000);
      expect(res.unspentGbp).toBe(0);
    });

    it("lets the floored total reach pence the unfloored tax would not", () => {
      // B = 180,000 + 21,500.50 = 201,500.50.
      // P = 200,000.50: 2% x 75,000.50 = 1,500.01, floored to £1,500 -> 201,500.50 = B, fits.
      // P = 200,000.51: 2% x 75,000.51 = 1,500.0102 -> 1,500.01 -> £1,500 -> 201,500.51 > B.
      // Without the floor, P = 200,000.50 would cost 201,500.51 and not fit.
      const res = solved({ loanGbp: 180_000, depositGbp: 21_500.5, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(200_000.5);
      expect(res.propertyTax.taxGbp).toBe(1_500);
      expect(res.unspentGbp).toBe(0);
    });

    it("stops exactly on the £250,000 edge between 2% and 5% (~£2,500 stamp duty)", () => {
      // B = 225,000 + 27,500 = 252,500. tax(250,000) = 2% x 125,000 = £2,500 -> 252,500 = B.
      // P = 250,000.01: 2,500 + 5% x 0.01 (0.0005 -> 0.00) = £2,500 -> 252,500.01 > B.
      const res = solved({ loanGbp: 225_000, depositGbp: 27_500, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(250_000);
      expect(res.propertyTax.taxGbp).toBe(2_500);
      expect(res.unspentGbp).toBe(0);
    });

    it("takes other buying costs off the deposit before the tax", () => {
      // B = 225,000 + 29,500 - 2,000 = 252,500: the same budget as the £250,000 edge case.
      const res = solved({
        loanGbp: 225_000,
        depositGbp: 29_500,
        otherBuyingCostsGbp: 2_000,
        jurisdiction: "ENGLAND_NI",
      });
      expect(res.propertyPriceGbp).toBe(250_000);
      expect(res.propertyTax.taxGbp).toBe(2_500);
      expect(res.otherBuyingCostsGbp).toBe(2_000);
      expect(res.depositTowardsPriceGbp).toBe(25_000);
      expect(res.unspentGbp).toBe(0);
    });

    it("solves inside the 5% band, where the floor moves the answer up", () => {
      // B = 250,000 + 40,000 = 290,000. Unfloored: 1.05P = 290,000 - 2,500 + 12,500 -> P = 285,714.29.
      // P = 285,715: 2,500 + 5% x 35,715 = 4,285.75, floored £4,285 -> 290,000 = B, fits.
      // P = 285,715.01: 5% x 35,715.01 = 1,785.7505 -> 1,785.75; total 4,285.75 -> £4,285
      // -> 290,000.01 > B.
      const res = solved({ loanGbp: 250_000, depositGbp: 40_000, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(285_715);
      expect(res.propertyTax.taxGbp).toBe(4_285);
      expect(res.unspentGbp).toBe(0);
    });

    it("first-time buyer: stops on the £300,000 edge of the relief nil band", () => {
      // B = 250,000 + 50,000 = 300,000. Relief tax(300,000) = 0 -> fits.
      // P = 300,000.01: 5% x 0.01 = 0.0005 -> £0 -> 300,000.01 > B.
      const res = solved({
        loanGbp: 250_000,
        depositGbp: 50_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(res.propertyPriceGbp).toBe(300_000);
      expect(res.propertyTax.taxGbp).toBe(0);
      expect(res.propertyTax.firstTimeBuyerReliefApplied).toBe(true);
    });

    it("first-time buyer: stops at £500,000 when relief ends, leaving the jump unspent", () => {
      // B = 450,000 + 62,000 = 512,000. Relief tax(500,000) = 5% x 200,000 = £10,000 -> 510,000.
      // P = 500,000.01 loses relief: 2,500 + 5% x 250,000.01 (12,500.0005 -> 12,500.00) = £15,000
      // -> 515,000.01 > B. Nothing between fits, so P = 500,000 with 512,000 - 510,000 = £2,000 left.
      const res = solved({
        loanGbp: 450_000,
        depositGbp: 62_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(res.propertyPriceGbp).toBe(500_000);
      expect(res.propertyTax.taxGbp).toBe(10_000);
      expect(res.propertyTax.firstTimeBuyerReliefApplied).toBe(true);
      expect(res.unspentGbp).toBe(2_000);
    });

    it("first-time buyer: just past the jump the answer is one penny over £500,000", () => {
      // B = 450,000 + 65,000.01 = 515,000.01. P = 500,000.01: standard tax £15,000 -> = B, fits.
      // P = 500,000.02: 5% x 250,000.02 = 12,500.001 -> 12,500.00 -> £15,000 -> 515,000.02 > B.
      const res = solved({
        loanGbp: 450_000,
        depositGbp: 65_000.01,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(res.propertyPriceGbp).toBe(500_000.01);
      expect(res.propertyTax.taxGbp).toBe(15_000);
      expect(res.propertyTax.firstTimeBuyerReliefApplied).toBe(false);
      expect(res.unspentGbp).toBe(0);
    });

    it("first-time buyer: well past the jump, standard rates apply to the whole price", () => {
      // B = 450,000 + 70,000 = 520,000. 1.05P = 520,000 - 2,500 + 12,500 -> P = 504,761.90.
      // P = 504,762: 2,500 + 5% x 254,762 = 15,238.10 -> £15,238 -> 520,000 = B, fits.
      // P = 504,762.01: 5% x 254,762.01 = 12,738.1005 -> 12,738.10 -> £15,238 -> 520,000.01 > B.
      const res = solved({
        loanGbp: 450_000,
        depositGbp: 70_000,
        jurisdiction: "ENGLAND_NI",
        isFirstTimeBuyer: true,
      });
      expect(res.propertyPriceGbp).toBe(504_762);
      expect(res.propertyTax.taxGbp).toBe(15_238);
      expect(res.unspentGbp).toBe(0);
    });
  });

  describe("Scotland: LBTT, in pence", () => {
    it("stops exactly on the £145,000 edge of the nil band", () => {
      // B = 130,000 + 15,000 = 145,000. tax(145,000) = 0. P = 145,000.01: 2% x 0.01 -> £0.00.
      const res = solved({ loanGbp: 130_000, depositGbp: 15_000, jurisdiction: "SCOTLAND" });
      expect(res.propertyPriceGbp).toBe(145_000);
      expect(res.propertyTax.taxGbp).toBe(0);
      expect(res.propertyTax.regime).toBe("LBTT");
    });

    it("solves inside the 2% band to the penny", () => {
      // B = 180,000 + 22,000 = 202,000. 1.02P = 202,000 + 2,900 -> P = 200,882.3529.
      // P = 200,882.35: 2% x 55,882.35 = 1,117.647 -> £1,117.65 -> 202,000.00 = B, fits.
      // P = 200,882.36: 2% x 55,882.36 = 1,117.6472 -> £1,117.65 -> 202,000.01 > B.
      const res = solved({ loanGbp: 180_000, depositGbp: 22_000, jurisdiction: "SCOTLAND" });
      expect(res.propertyPriceGbp).toBe(200_882.35);
      expect(res.propertyTax.taxGbp).toBe(1_117.65);
      expect(res.unspentGbp).toBe(0);
    });

    it("stops exactly on the £250,000 edge between 2% and 5%", () => {
      // B = 220,000 + 32,100 = 252,100. tax(250,000) = 2% x 105,000 = £2,100 -> = B.
      // P = 250,000.01: 5% x 0.01 = 0.0005 -> £0.00 -> 252,100.01 > B.
      const res = solved({ loanGbp: 220_000, depositGbp: 32_100, jurisdiction: "SCOTLAND" });
      expect(res.propertyPriceGbp).toBe(250_000);
      expect(res.propertyTax.taxGbp).toBe(2_100);
    });

    it("stops exactly on the £325,000 edge between 5% and 10%", () => {
      // B = 300,000 + 30,850 = 330,850. tax(325,000) = 2,100 + 5% x 75,000 = £5,850 -> = B.
      // P = 325,000.01: 10% x 0.01 = 0.001 -> £0.00 -> 330,850.01 > B.
      const res = solved({ loanGbp: 300_000, depositGbp: 30_850, jurisdiction: "SCOTLAND" });
      expect(res.propertyPriceGbp).toBe(325_000);
      expect(res.propertyTax.taxGbp).toBe(5_850);
    });

    it("first-time buyer: stops on the £175,000 relief edge, where standard rates stop lower", () => {
      // B = 150,000 + 25,000 = 175,000. Relief: tax(175,000) = 0 -> fits; 175,000.01 costs 175,000.01.
      // Standard: 1.02P = 175,000 + 2,900 -> P = 174,411.7647. P = 174,411.76: 2% x 29,411.76 =
      // 588.2352 -> £588.24 -> 175,000.00 = B. P = 174,411.77: 588.2354 -> £588.24 -> 175,000.01 > B.
      const relief = solved({
        loanGbp: 150_000,
        depositGbp: 25_000,
        jurisdiction: "SCOTLAND",
        isFirstTimeBuyer: true,
      });
      expect(relief.propertyPriceGbp).toBe(175_000);
      expect(relief.propertyTax.taxGbp).toBe(0);
      expect(relief.propertyTax.firstTimeBuyerReliefApplied).toBe(true);

      const standard = solved({ loanGbp: 150_000, depositGbp: 25_000, jurisdiction: "SCOTLAND" });
      expect(standard.propertyPriceGbp).toBe(174_411.76);
      expect(standard.propertyTax.taxGbp).toBe(588.24);
    });
  });

  describe("Wales: LTT, in pence, no first-time buyer relief", () => {
    it("stops exactly on the £225,000 edge of the nil band", () => {
      // B = 200,000 + 25,000 = 225,000. tax(225,000) = 0. P = 225,000.01: 6% x 0.01 = 0.0006 -> £0.00.
      const res = solved({ loanGbp: 200_000, depositGbp: 25_000, jurisdiction: "WALES" });
      expect(res.propertyPriceGbp).toBe(225_000);
      expect(res.propertyTax.taxGbp).toBe(0);
      expect(res.propertyTax.regime).toBe("LTT");
    });

    it("solves inside the 6% band to the penny", () => {
      // B = 250,000 + 20,000 = 270,000. 1.06P = 270,000 + 13,500 -> P = 267,452.8302.
      // P = 267,452.83: 6% x 42,452.83 = 2,547.1698 -> £2,547.17 -> 270,000.00 = B, fits.
      // P = 267,452.84: 6% x 42,452.84 = 2,547.1704 -> £2,547.17 -> 270,000.01 > B.
      const res = solved({ loanGbp: 250_000, depositGbp: 20_000, jurisdiction: "WALES" });
      expect(res.propertyPriceGbp).toBe(267_452.83);
      expect(res.propertyTax.taxGbp).toBe(2_547.17);
      expect(res.unspentGbp).toBe(0);
    });

    it("stops exactly on the £400,000 edge between 6% and 7.5%", () => {
      // B = 360,000 + 50,500 = 410,500. tax(400,000) = 6% x 175,000 = £10,500 -> = B.
      // P = 400,000.01: 7.5% x 0.01 = 0.00075 -> £0.00 -> 410,500.01 > B.
      const res = solved({ loanGbp: 360_000, depositGbp: 50_500, jurisdiction: "WALES" });
      expect(res.propertyPriceGbp).toBe(400_000);
      expect(res.propertyTax.taxGbp).toBe(10_500);
    });

    it("solves inside the 7.5% band, and ignores the first-time buyer answer", () => {
      // B = 450,000 + 46,500 = 496,500. tax(480,000) = 10,500 + 7.5% x 80,000 = £16,500 -> = B.
      // P = 480,000.01: 7.5% x 80,000.01 = 6,000.00075 -> 6,000.00 -> 496,500.01 > B.
      for (const isFirstTimeBuyer of [false, true]) {
        const res = solved({
          loanGbp: 450_000,
          depositGbp: 46_500,
          jurisdiction: "WALES",
          isFirstTimeBuyer,
        });
        expect(res.propertyPriceGbp).toBe(480_000);
        expect(res.propertyTax.taxGbp).toBe(16_500);
        expect(res.propertyTax.firstTimeBuyerReliefApplied).toBe(false);
      }
    });
  });

  describe("when no price fits", () => {
    it("solves when the deposit exactly covers the tax at a price equal to the loan", () => {
      // tax(300,000) SDLT = 2,500 + 5% x 50,000 = £5,000. B = 305,000 = 300,000 + 5,000, fits.
      const res = solved({ loanGbp: 300_000, depositGbp: 5_000, jurisdiction: "ENGLAND_NI" });
      expect(res.propertyPriceGbp).toBe(300_000);
      expect(res.depositTowardsPriceGbp).toBe(0);
      expect(res.unspentGbp).toBe(0);
      // Gap = 5,000.00 + 1p = 500,001 pence: ceil(log2(500,001)) = 19 steps at most.
      expect(res.steps).toBeLessThanOrEqual(19);
      expect(res.steps).toBeGreaterThan(0);
    });

    it("is short by one penny when the deposit is a penny less", () => {
      // B = 304,999.99 < 305,000. Shortfall = 0 + 5,000 - 4,999.99 = £0.01.
      const res = solvePropertyPrice({
        loanGbp: 300_000,
        depositGbp: 4_999.99,
        jurisdiction: "ENGLAND_NI",
      });
      expect(res).toMatchObject({ status: "deposit-short", shortfallGbp: 0.01 });
      if (res.status !== "deposit-short") throw new Error("narrowing");
      expect(res.propertyTaxAtLoan.taxGbp).toBe(5_000);
      expect(res.propertyTaxAtLoan.propertyPriceGbp).toBe(300_000);
    });

    it("counts other buying costs in the shortfall", () => {
      // LBTT tax(300,000) = 2,100 + 5% x 50,000 = £4,600. Shortfall = 500 + 4,600 - 1,000 = £4,100.
      const res = solvePropertyPrice({
        loanGbp: 300_000,
        depositGbp: 1_000,
        otherBuyingCostsGbp: 500,
        jurisdiction: "SCOTLAND",
      });
      expect(res).toMatchObject({
        status: "deposit-short",
        loanGbp: 300_000,
        depositGbp: 1_000,
        otherBuyingCostsGbp: 500,
        shortfallGbp: 4_100,
      });
    });

    it("is short when other buying costs alone pass the deposit, even with no tax", () => {
      // Loan £100,000 is in the nil band, so tax is £0. Shortfall = 3,000 + 0 - 2,000 = £1,000.
      const res = solvePropertyPrice({
        loanGbp: 100_000,
        depositGbp: 2_000,
        otherBuyingCostsGbp: 3_000,
        jurisdiction: "WALES",
      });
      expect(res).toMatchObject({ status: "deposit-short", shortfallGbp: 1_000 });
    });
  });

  describe("inputs it refuses", () => {
    it.each<[Partial<PropertyPriceSolverInput>, string]>([
      [{ loanGbp: Number.NaN }, "loanGbp"],
      [{ loanGbp: -1 }, "loanGbp"],
      [{ loanGbp: Number.POSITIVE_INFINITY }, "loanGbp"],
      [{ loanGbp: PROPERTY_PRICE_SOLVER_MAX_GBP + 1 }, "loanGbp"],
      [{ depositGbp: Number.NaN }, "depositGbp"],
      [{ depositGbp: -0.01 }, "depositGbp"],
      [{ depositGbp: PROPERTY_PRICE_SOLVER_MAX_GBP + 1 }, "depositGbp"],
      [{ otherBuyingCostsGbp: Number.NaN }, "otherBuyingCostsGbp"],
      [{ otherBuyingCostsGbp: -5 }, "otherBuyingCostsGbp"],
    ])("refuses %o as %s", (override, field) => {
      const res = solvePropertyPrice({
        loanGbp: 100_000,
        depositGbp: 10_000,
        jurisdiction: "ENGLAND_NI",
        ...override,
      });
      expect(res).toEqual({ status: "invalid-input", field });
    });

    it("accepts inputs at the limit and treats missing costs as none", () => {
      // A loan at the limit with a £0 deposit: tax at that price is far more than £0, so short.
      const atLimit = solvePropertyPrice({
        loanGbp: PROPERTY_PRICE_SOLVER_MAX_GBP,
        depositGbp: 0,
        jurisdiction: "WALES",
      });
      expect(atLimit.status).toBe("deposit-short");
      // A £0 loan and a £100,000 deposit: SDLT nil band to £125,000, so all £100,000 is price.
      for (const otherBuyingCostsGbp of [null, undefined, 0]) {
        const res = solved({
          loanGbp: 0,
          depositGbp: 100_000,
          otherBuyingCostsGbp,
          jurisdiction: "ENGLAND_NI",
        });
        expect(res.propertyPriceGbp).toBe(100_000);
        expect(res.otherBuyingCostsGbp).toBe(0);
      }
    });
  });

  describe("convergence across every band edge", () => {
    const REGIMES: { jurisdiction: UkPropertyTaxJurisdiction; isFirstTimeBuyer: boolean }[] = [
      { jurisdiction: "ENGLAND_NI", isFirstTimeBuyer: false },
      { jurisdiction: "ENGLAND_NI", isFirstTimeBuyer: true },
      { jurisdiction: "SCOTLAND", isFirstTimeBuyer: false },
      { jurisdiction: "SCOTLAND", isFirstTimeBuyer: true },
      { jurisdiction: "WALES", isFirstTimeBuyer: false },
    ];
    const EDGES = [
      ...new Set(
        [
          SDLT_STANDARD_BANDS,
          SDLT_FTB_BANDS,
          LBTT_STANDARD_BANDS,
          LBTT_FTB_BANDS,
          LTT_STANDARD_BANDS,
        ]
          .flat()
          .flatMap((band) => [band.fromGbp, band.toGbp ?? band.fromGbp]),
      ),
    ].filter((edge) => edge > 0);

    /** Price plus tax in pence, from the signed tax engine directly (not from the solver). */
    const costPence = (
      pricePence: number,
      regime: { jurisdiction: UkPropertyTaxJurisdiction; isFirstTimeBuyer: boolean },
    ): number =>
      pricePence +
      Math.round(
        calculatePropertyTransactionTax({ propertyPriceGbp: pricePence / 100, ...regime }).taxGbp *
          100,
      );

    it("price plus tax rises strictly, penny by penny, across every edge (the bisection's premise)", () => {
      for (const regime of REGIMES) {
        for (const edge of EDGES) {
          let previous = -1;
          for (let offset = -300; offset <= 300; offset++) {
            const cost = costPence(edge * 100 + offset, regime);
            expect(cost).toBeGreaterThan(previous);
            previous = cost;
          }
        }
      }
    });

    it("returns the largest fitting price, within the step bound, for budgets around every edge", () => {
      const loanGbp = 50_000;
      for (const regime of REGIMES) {
        for (const edge of EDGES) {
          const edgeCost = costPence(edge * 100, regime) / 100;
          for (const nudge of [-1, -0.01, 0, 0.01, 1, 37.37]) {
            const depositGbp = Math.round((edgeCost + nudge - loanGbp) * 100) / 100;
            const res: PropertyPriceSolution = solvePropertyPrice({
              loanGbp,
              depositGbp,
              ...regime,
            });
            if (res.status !== "solved") throw new Error(`expected solved at ${edge}`);
            const budgetPence = Math.round((loanGbp + depositGbp) * 100);
            const pricePence = Math.round(res.propertyPriceGbp * 100);
            expect(costPence(pricePence, regime)).toBeLessThanOrEqual(budgetPence);
            expect(costPence(pricePence + 1, regime)).toBeGreaterThan(budgetPence);
            expect(res.unspentGbp).toBeGreaterThanOrEqual(0);
            expect(res.steps).toBeLessThanOrEqual(stepBound(depositGbp));
          }
        }
      }
    });
  });
});

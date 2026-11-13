import { describe, expect, it } from "vitest";
import { SUPPORTED_UK_TAX_YEARS } from "./types.js";
import { UK_RULE_SOURCES } from "./uk-rule-sources.js";
import { getUkIncomeThresholds, type UkThresholdKind } from "./uk-tax-thresholds.js";
import { getUkTaxYearRules } from "./uk-tax-year.js";

const byKind = (ts: ReturnType<typeof getUkIncomeThresholds>, kind: UkThresholdKind) =>
  ts.filter((t) => t.kind === kind);

describe("getUkIncomeThresholds", () => {
  it("places every EWNI threshold at its rule figure with no pension, every year", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const rules = getUkTaxYearRules(year);
      const ts = getUkIncomeThresholds(rules, {
        region: "ENGLAND_NI_WALES",
        salary: 0,
        studentLoans: ["plan2", "postgrad"],
        childBenefit: { children: 1 },
      });
      const g = (k: UkThresholdKind) => byKind(ts, k)[0]?.grossAt;
      expect(g("incomeTaxStarts"), year).toBe(rules.ewni.personalAllowance);
      expect(g("higherRate"), year).toBe(
        rules.ewni.personalAllowance + rules.ewni.basicRateBandWidth,
      );
      expect(g("taperStart"), year).toBe(rules.ewni.personalAllowanceTaperStart);
      expect(g("taperEnd"), year).toBe(rules.taperEnd);
      expect(g("niPrimaryThreshold"), year).toBe(rules.ni.class1.primaryThreshold);
      expect(g("niUpperEarningsLimit"), year).toBe(rules.ni.class1.upperEarningsLimit);
      expect(g("hicbcStart"), year).toBe(rules.hicbc.hicbcThresholdStart);
      expect(g("hicbcEnd"), year).toBe(
        rules.hicbc.hicbcThresholdStart + 100 * rules.hicbc.hicbcStepWidth,
      );
      expect(
        byKind(ts, "studentLoan").map((t) => [t.plan, t.grossAt]),
        year,
      ).toEqual([
        ["postgrad", rules.studentLoans.plans.postgrad.threshold],
        ["plan2", rules.studentLoans.plans.plan2.threshold],
      ]);
      // The additional rate starts inside or after the taper, where the allowance has gone.
      expect(g("additionalRate"), year).toBe(rules.ewni.additionalRateThreshold);
      for (const t of ts) {
        expect(t.status, `${year} ${t.kind}`).toBe(UK_RULE_SOURCES[year][t.ruleKey].status);
        expect(t.source).toMatch(/^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//);
      }
      // Sorted by gross pay.
      const gs = ts.map((t) => t.grossAt ?? Number.POSITIVE_INFINITY);
      expect([...gs].sort((a, b) => a - b)).toEqual(gs);
    }
  });

  it("the 2020/21 taper ends at 125,000 (12,500 allowance), not 125,140", () => {
    const ts = getUkIncomeThresholds(getUkTaxYearRules("2020/21"), { salary: 0 });
    expect(byKind(ts, "taperEnd")[0]?.grossAt).toBe(125000);
  });

  it("solves gross pay for the pension method", () => {
    const rules = getUkTaxYearRules("2026/27");
    const ss = getUkIncomeThresholds(rules, {
      salary: 0,
      pension: { method: "salary-sacrifice", pct: 10 },
    });
    // ANI = 0.9 x gross, so the taper starts at 100,000 / 0.9; NI pay is also 0.9 x gross.
    expect(byKind(ss, "taperStart")[0]?.grossAt).toBeCloseTo(100000 / 0.9, 1);
    expect(byKind(ss, "niPrimaryThreshold")[0]?.grossAt).toBeCloseTo(12570 / 0.9, 1);

    const np = getUkIncomeThresholds(rules, {
      salary: 0,
      pension: { method: "net-pay", amount: 5000 },
    });
    // Net pay lowers taxable pay but not NI pay.
    expect(byKind(np, "taperStart")[0]?.grossAt).toBe(105000);
    expect(byKind(np, "niPrimaryThreshold")[0]?.grossAt).toBe(12570);

    const ras = getUkIncomeThresholds(rules, {
      salary: 0,
      pension: { method: "relief-at-source", amount: 4000 },
    });
    // Gross 5,000 extends the basic band and lowers ANI; NI pay unchanged.
    const higher = byKind(ras, "higherRate")[0];
    expect(higher?.grossAt).toBe(50270 + 5000);
    expect(higher?.bandExtension).toBe(5000);
    expect(byKind(ras, "taperStart")[0]?.grossAt).toBe(105000);
  });

  it("lists every Scottish band start and no HICBC without Child Benefit", () => {
    const rules = getUkTaxYearRules("2026/27");
    const ts = getUkIncomeThresholds(rules, { region: "SCOTLAND", salary: 0 });
    const bands = byKind(ts, "scottishBand");
    expect(bands.map((t) => t.band?.name)).toEqual(
      rules.scotland.bands.slice(1).map((b) => b.name),
    );
    expect(bands[0]?.grossAt).toBe(12570 + (rules.scotland.bands[1]?.from ?? 0));
    expect(byKind(ts, "hicbcStart")).toEqual([]);
    expect(byKind(ts, "higherRate")).toEqual([]);
  });
});

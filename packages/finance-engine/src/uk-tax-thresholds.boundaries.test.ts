import { describe, expect, it } from "vitest";
import { getUkIncomeThresholds, type UkThresholdKind } from "./uk-tax-thresholds.js";
import { getUkTaxYearRules } from "./uk-tax-year.js";

// Every case names its tax year; nothing relies on today's date.
const rules2526 = getUkTaxYearRules("2025/26");

const byKind = (ts: ReturnType<typeof getUkIncomeThresholds>, kind: UkThresholdKind) =>
  ts.filter((t) => t.kind === kind);

describe("getUkIncomeThresholds: thresholds that are never crossed", () => {
  it("gives no gross pay and no adjusted net income when all pay is sacrificed into a pension", () => {
    // Salary sacrifice of 100% of pay: employment income, taxable income, NI pay, student loan pay
    // and adjusted net income are all 0 at every gross pay, so no threshold is ever crossed.
    const ts = getUkIncomeThresholds(rules2526, {
      region: "ENGLAND_NI_WALES",
      salary: 0,
      pension: { method: "salary-sacrifice", pct: 100 },
      studentLoans: ["plan2"],
    });
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) {
      expect(t.grossAt, t.kind).toBeNull();
      expect(t.aniAt, t.kind).toBeNull();
      expect(t.bandExtension, t.kind).toBe(0);
    }
  });
});

describe("getUkIncomeThresholds: the penny boundary", () => {
  it("never reports a negative gross pay when the crossing is within a penny of no pay", () => {
    // Other income 12,570.004 with the 2025/26 Personal Allowance of 12,570 (GOV.UK Income Tax
    // rates and Personal Allowances, 2025/26): taxable income at no pay is 0.004, which rounds to
    // 0.00, and any pay of 0.001 or more rounds it up to 0.01. So income tax starts with the first
    // fraction of a penny of pay; floored to the penny that is 0.
    const ts = getUkIncomeThresholds(rules2526, { salary: 0, otherIncome: 12570.004 });
    expect(byKind(ts, "incomeTaxStarts")[0]?.grossAt).toBe(0);
  });
});

describe("getUkIncomeThresholds: Gift Aid moves only band edges above the basic rate", () => {
  // Net Gift Aid 4,000 is grossed up by 1.25 to 5,000 (ITA 2007 s.414: the grossed-up gift extends
  // the basic rate limit and the limits above it, and is deducted in arriving at adjusted net
  // income, ITA 2007 s.58).
  const giftAid = { salary: 0, giftAidNet: 4000 } as const;

  it("pushes the higher and additional rate starts up by 5,000 and reports the extension", () => {
    const ts = getUkIncomeThresholds(rules2526, { region: "ENGLAND_NI_WALES", ...giftAid });
    const higher = byKind(ts, "higherRate")[0];
    // 12,570 allowance + 37,700 basic band + 5,000 extension = 55,270 (GOV.UK 2025/26).
    expect(higher?.grossAt).toBe(55270);
    expect(higher?.bandExtension).toBe(5000);
    expect(higher?.band).toEqual({ name: "Higher", rate: 0.4 });

    const additional = byKind(ts, "additionalRate")[0];
    // Additional rate on taxable income over 125,140, extended to 130,140. At gross 130,140 the
    // adjusted net income is 130,140 - 5,000 = 125,140, so the allowance is fully tapered
    // (12,570 - 25,140 / 2 = 0, ITA 2007 s.35) and taxable income is 130,140 = 125,140 + 5,000.
    // Any more pay crosses it, so the crossing is 130,140.
    expect(additional?.grossAt).toBe(130140);
    expect(additional?.bandExtension).toBe(5000);
    expect(additional?.aniAt).toBe(125140);
    expect(additional?.band).toEqual({ name: "Additional", rate: 0.45 });
  });

  it("does not add the extension to the taper start, which is a test of adjusted net income", () => {
    const ts = getUkIncomeThresholds(rules2526, { region: "ENGLAND_NI_WALES", ...giftAid });
    const taper = byKind(ts, "taperStart")[0];
    // Adjusted net income = gross - 5,000 passes 100,000 (ITA 2007 s.35) at gross 105,000.
    expect(taper?.grossAt).toBe(105000);
    expect(taper?.aniAt).toBe(100000);
    expect(taper?.bandExtension).toBe(0);
  });

  it("moves the Scottish Intermediate and Higher starts with Gift Aid", () => {
    const ts = getUkIncomeThresholds(rules2526, { region: "SCOTLAND", ...giftAid });
    const band = (name: string) => byKind(ts, "scottishBand").find((t) => t.band?.name === name);
    // Scottish bands 2025/26 (GOV.UK Scottish Income Tax 2025 to 2026): Basic from 15,398, so
    // taxable income over 2,827; Intermediate from 27,492 (taxable over 14,921); Higher from
    // 43,663 (taxable over 31,092).
    // Whether Gift Aid also extends the starter band (so moves the Basic start) is not settled:
    // the owner's sign-off of 19 Nov 2026 left that figure out, so it is not asserted.
    // Intermediate start is the basic rate limit, extended: 12,570 + 14,921 + 5,000 = 32,491.
    expect(band("Intermediate")?.grossAt).toBe(32491);
    expect(band("Intermediate")?.bandExtension).toBe(5000);
    // Higher start, extended: 12,570 + 31,092 + 5,000 = 48,662.
    expect(band("Higher")?.grossAt).toBe(48662);
    expect(band("Higher")?.bandExtension).toBe(5000);
  });
});

describe("getUkIncomeThresholds: student loans and Child Benefit", () => {
  it("charges the lower undergraduate threshold whichever order the plans are listed in", () => {
    // 2025/26 thresholds (GOV.UK Rates and thresholds for employers 2025 to 2026): Plan 1 26,065,
    // Plan 2 28,470. With both plans only the lower threshold starts repayments.
    for (const studentLoans of [
      ["plan1", "plan2"],
      ["plan2", "plan1"],
    ] as const) {
      const ts = getUkIncomeThresholds(rules2526, { salary: 0, studentLoans });
      expect(
        byKind(ts, "studentLoan").map((t) => [t.plan, t.grossAt]),
        studentLoans.join(","),
      ).toEqual([["plan1", 26065]]);
    }
  });

  it("shows the charge thresholds only when the claimant is the higher earner", () => {
    const partner = getUkIncomeThresholds(rules2526, {
      salary: 0,
      childBenefit: { children: 1, claimantIsHigherEarner: false },
    });
    expect(byKind(partner, "hicbcStart")).toEqual([]);
    expect(byKind(partner, "hicbcEnd")).toEqual([]);

    const claimant = getUkIncomeThresholds(rules2526, {
      salary: 0,
      childBenefit: { children: 1, claimantIsHigherEarner: true },
    });
    // High Income Child Benefit Charge starts at adjusted net income 60,000 in 2025/26 and is
    // 1% per 200 above it, so all of it is charged at 60,000 + 100 x 200 = 80,000
    // (GOV.UK High Income Child Benefit Charge).
    expect(byKind(claimant, "hicbcStart")[0]?.grossAt).toBe(60000);
    expect(byKind(claimant, "hicbcEnd")[0]?.grossAt).toBe(80000);
  });
});

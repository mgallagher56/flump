import { describe, expect, it } from "vitest";
import { estimateRecordedReturn, type RecordedBalance } from "./recorded-return.js";

const bal = (year: number, month: number, value: number): RecordedBalance => ({
  year,
  month,
  value,
});

describe("estimateRecordedReturn contribution setting", () => {
  // Jan to Mar 2024: 1,000, 1,010, 1,020 with nothing paid in. Chained, the returns telescope:
  // (1,010 / 1,000) * (1,020 / 1,010) - 1 = 1,020 / 1,000 - 1 = 0.02 over 2 months.
  const balances = [bal(2024, 1, 1000), bal(2024, 2, 1010), bal(2024, 3, 1020)];

  it("counts a missing contribution setting as nothing paid in", () => {
    const result = estimateRecordedReturn({ balances });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.monthlyContribution).toBe(0);
    expect(result.overall.months).toBe(2);
    // toBeCloseTo: the chained ratios carry floating point error.
    expect(result.overall.return).toBeCloseTo(0.02, 10);
  });

  it("counts a contribution that is not a finite number as nothing paid in", () => {
    for (const monthlyContribution of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = estimateRecordedReturn({ balances, monthlyContribution });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.monthlyContribution).toBe(0);
      expect(result.overall.return).toBeCloseTo(0.02, 10);
    }
  });
});

describe("estimateRecordedReturn impossible months", () => {
  // Each case is three good months rising 1,000, 1,010, 1,020 (0.02 overall, see above) plus one
  // impossible entry given last. Read as a month, the impossible entry would land on one of the
  // good months and replace its balance with 9,999, a jump far beyond 25%. Ignoring it keeps 0.02.
  const cases: { name: string; good: RecordedBalance[]; bad: RecordedBalance }[] = [
    {
      name: "a year that is not a whole number",
      // 2024.5 * 12 + 0 is the same month index as July 2024 (2024 * 12 + 6).
      good: [bal(2024, 5, 1000), bal(2024, 6, 1010), bal(2024, 7, 1020)],
      bad: bal(2024.5, 1, 9999),
    },
    {
      name: "month 0",
      // 2024 month 0 would sit where December 2023 is.
      good: [bal(2023, 11, 1000), bal(2023, 12, 1010), bal(2024, 1, 1020)],
      bad: bal(2024, 0, 9999),
    },
    {
      name: "month 13",
      // 2023 month 13 would sit where January 2024 is.
      good: [bal(2023, 11, 1000), bal(2023, 12, 1010), bal(2024, 1, 1020)],
      bad: bal(2023, 13, 9999),
    },
  ];

  for (const { name, good, bad } of cases) {
    it(`ignores a balance with ${name}`, () => {
      const result = estimateRecordedReturn({ balances: [...good, bad] });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.overall.months).toBe(2);
      expect(result.overall.return).toBeCloseTo(0.02, 10);
    });
  }

  it("ignores a balance with a month that is not a whole number", () => {
    // Month 2.5 would sit between February and March and break the run into single pairs.
    const result = estimateRecordedReturn({
      balances: [bal(2024, 1, 1000), bal(2024, 2, 1010), bal(2024, 3, 1020), bal(2024, 2.5, 1015)],
    });
    expect(result.status).toBe("ok");
  });
});

describe("estimateRecordedReturn annualising", () => {
  it("annualises the overall figure at exactly 12 months measured", () => {
    // 13 balances, Jan 2024 to Jan 2025, each 1% above the last: 12 monthly returns of 0.01.
    // Total 1.01^12 - 1 = 0.126825030131969 (bc). Annualised over 12 months the power is 12 / 12,
    // so the figure is the same 0.126825.
    const balances: RecordedBalance[] = [];
    let value = 1000;
    for (let i = 0; i <= 12; i++) {
      if (i > 0) value *= 1.01;
      balances.push(bal(2024 + Math.floor(i / 12), (i % 12) + 1, value));
    }
    const result = estimateRecordedReturn({ balances });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.overall.months).toBe(12);
    expect(result.overall.annualised).toBe(true);
    expect(result.overall.return).toBeCloseTo(0.126825030131969, 10);
  });
});

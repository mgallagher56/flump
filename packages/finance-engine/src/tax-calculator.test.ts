import { describe, expect, it } from "vitest";
import {
  buildCopiedRecordForTaxYear,
  calculateUKTax,
  getAnnualRecordEndDate,
  getNextTaxYear,
  getPreviousTaxYear,
  getRecordAnnualTotalForTaxYear,
  getTaxYearForRecordDate,
  type TaxRecord,
} from "./tax-calculator.js";
import { selectUkTaxVectors } from "./test-vectors/uk-tax.vectors.js";
import {
  calculateIncomeTaxOnTaxable,
  getUkTaxYearForDate,
  getUkTaxYearRules,
  roundPence,
} from "./uk-tax-year.js";

function dividendRecord(amount: number, date: string): TaxRecord {
  return {
    id: "d1",
    userId: "u1",
    type: "income",
    source: "savings",
    category: "dividend_income",
    name: "Dividends",
    amount,
    frequency: "one-off",
    date,
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: date,
    updatedAt: date,
  };
}

function savingsRecord(amount: number, date: string): TaxRecord {
  return { ...dividendRecord(amount, date), category: "savings_interest", name: "Interest" };
}

describe("calculateIncomeTaxOnTaxable (shared EWNI band function)", () => {
  const ewniTax = (taxable: number, year: "2020/21" | "2025/26" | "2026/27") =>
    calculateIncomeTaxOnTaxable(taxable, getUkTaxYearRules(year), "ENGLAND_NI_WALES").total;

  // Source: https://www.gov.uk/income-tax-rates (2025/26, 2026/27): additional rate
  // above 125,140 taxable income. 37,700 x 20% + (125,140 - 37,700) x 40% = 7,540 + 34,976.
  it("125140 taxable 2025/26 is 42516 (45% starts above taxable 125140)", () => {
    expect(ewniTax(125140, "2025/26")).toBe(42516);
  });

  // 42516 + (150000 - 125140) x 45% = 42516 + 11187 = 53703
  it("150000 taxable 2026/27 is 53703", () => {
    expect(ewniTax(150000, "2026/27")).toBe(53703);
  });

  // Pre-2023/24 the additional rate starts above taxable 150,000 (2020/21: 37500 x 20% + 112500 x 40%).
  it("150000 taxable 2020/21 has no additional-rate tax (52500)", () => {
    expect(ewniTax(150000, "2020/21")).toBe(52500);
  });
});

describe("calculateUKTax uses the shared EWNI band function", () => {
  it("150000 salary 2026/27 totalIncomeTaxDue is 53703", () => {
    expect(calculateUKTax("2026/27", [], 150000, 100).totalIncomeTaxDue).toBe(53703);
  });

  it("125140 salary 2025/26 totalIncomeTaxDue is 42516", () => {
    expect(calculateUKTax("2025/26", [], 125140, 100).totalIncomeTaxDue).toBe(42516);
  });

  // 140000 salary: PA 0, taxable 140000 (above 125140). Dividends 5000 stack above it, all in the
  // additional dividend band: (5000 - 500 allowance) x 39.35% = 1770.75 (vector dividends.2026-27.additional).
  it("dividends above taxable 125140 are taxed at the additional dividend rate", () => {
    const r = calculateUKTax("2026/27", [dividendRecord(5000, "2026-06-01")], 140000, 100);
    expect(r.taxableDividends).toBe(4500);
    expect(r.dividendTaxDue).toBeCloseTo(1770.75, 2);
  });

  // 120000 salary + 10500 dividends: gross 130500, taper floor(30500/2)=15250 so PA 0. Non-dividend
  // taxable 120000. Per HMRC the 500 dividend allowance still occupies band space, so dividends
  // occupy 120000 to 130500: first 500 at 0%, then 125140 - 120500 = 4640 at 33.75% (higher) and
  // 130500 - 125140 = 5360 at 39.35% (additional). 2025/26 dividend rates.
  // Source: https://www.gov.uk/tax-on-dividends
  it("dividends straddling taxable 125140 split between higher and additional rates", () => {
    const r = calculateUKTax("2025/26", [dividendRecord(10500, "2025-06-01")], 120000, 100);
    expect(r.dividendTaxDue).toBeCloseTo(4640 * 0.3375 + 5360 * 0.3935, 2);
  });

  // PSA band is chosen from taxable income. 130000 salary: PA 0, taxable 130000 > 125140 -> PSA 0.
  it("additional-rate taxpayer gets no personal savings allowance", () => {
    const r = calculateUKTax("2025/26", [savingsRecord(2000, "2025-06-01")], 130000, 100);
    expect(r.personalSavingsAllowance).toBe(0);
  });

  // Gross 125140 exactly: PA 0, taxable 125140 is not above the threshold -> higher-rate PSA 500.
  it("taxable income exactly 125140 is still higher rate for the PSA", () => {
    const r = calculateUKTax("2025/26", [savingsRecord(2000, "2025-06-01")], 123140, 100);
    expect(r.totalGrossIncome).toBe(125140);
    expect(r.personalSavingsAllowance).toBe(500);
  });
});

describe("EWNI income tax vectors through the shared band function", () => {
  const vectors = selectUkTaxVectors({ kind: "incomeTax", region: "ENGLAND_NI_WALES" });

  it("has vectors to check", () => {
    expect(vectors.length).toBeGreaterThan(20);
  });

  it("calculateUKTax totalIncomeTaxDue matches every vector", () => {
    for (const v of vectors) {
      const gross = (v.input as { grossIncome: number }).grossIncome;
      const r = calculateUKTax(v.taxYear, [], gross, 100);
      expect(roundPence(r.totalIncomeTaxDue), v.id).toBeCloseTo(v.expected, 2);
    }
  });
});

describe("dividend vectors through calculateUKTax", () => {
  const vectors = selectUkTaxVectors({ kind: "dividends" });

  it("has dividend vectors for every supported year", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(18);
  });

  it("dividendTaxDue matches every dividend vector in the catalogue", () => {
    for (const v of vectors) {
      const { employmentIncome, dividendIncome } = v.input as {
        employmentIncome: number;
        dividendIncome: number;
      };
      const date = `${v.taxYear.slice(0, 4)}-07-01`;
      const r = calculateUKTax(
        v.taxYear,
        [dividendRecord(dividendIncome, date)],
        employmentIncome,
        100,
      );
      expect(roundPence(r.dividendTaxDue), v.id).toBeCloseTo(v.expected, 2);
    }
  });
});

describe("getTaxYearForRecordDate (6 April boundary, BE-08 M1)", () => {
  it("files 1-5 April under the year that ends on 5 April and 6 April under the next", () => {
    expect(getTaxYearForRecordDate("2026-04-03")).toBe("2025/26");
    expect(getTaxYearForRecordDate("2026-04-05")).toBe("2025/26");
    expect(getTaxYearForRecordDate("2026-04-06")).toBe("2026/27");
    expect(getTaxYearForRecordDate("2024-04-01")).toBe("2023/24");
    expect(getTaxYearForRecordDate("2025-03-31")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2025-01-15")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2024-12-31")).toBe("2024/25");
  });

  it("agrees with getUkTaxYearForDate for ISO dates", () => {
    for (const date of ["2026-04-03", "2026-04-05", "2026-04-06", "2025-03-31", "2026-01-02"]) {
      expect(getTaxYearForRecordDate(date)).toBe(getUkTaxYearForDate(date));
    }
  });

  it("totals agree with filing: a one-off record counts in the year it is filed under", () => {
    for (const date of ["2026-04-01", "2026-04-03", "2026-04-05", "2026-04-06", "2026-03-31"]) {
      const year = getTaxYearForRecordDate(date);
      const rec = dividendRecord(100, date);
      expect(getRecordAnnualTotalForTaxYear(rec, year), date).toBe(100);
      expect(getRecordAnnualTotalForTaxYear(rec, getNextTaxYear(year)), date).toBe(0);
      expect(getRecordAnnualTotalForTaxYear(rec, getPreviousTaxYear(year)), date).toBe(0);
    }
  });

  it("a monthly record starting 3 April contributes from the earlier year", () => {
    const rec: TaxRecord = { ...dividendRecord(100, "2026-04-03"), frequency: "monthly" };
    expect(getRecordAnnualTotalForTaxYear(rec, "2025/26")).toBe(100);
    expect(getRecordAnnualTotalForTaxYear(rec, "2026/27")).toBe(1200);
  });

  it("a monthly record ending 5 April stops at the end of the earlier year", () => {
    const rec: TaxRecord = {
      ...dividendRecord(100, "2025-04-06"),
      frequency: "monthly",
      endDate: "2026-04-05",
    };
    expect(getRecordAnnualTotalForTaxYear(rec, "2025/26")).toBe(1200);
    expect(getRecordAnnualTotalForTaxYear(rec, "2026/27")).toBe(0);
  });
});

describe("buildCopiedRecordForTaxYear derives the source year by the 6 April boundary", () => {
  const base = { ...dividendRecord(100, "2024-04-06"), name: "Salary (2024/25)" };

  // Source year for all three dates is 2024/25 (see above); target 2025/26 => yearDiff 1,
  // so each date moves forward exactly one year with day and month unchanged.
  it.each([
    ["2024-04-06", "2025-04-06"],
    ["2024-12-31", "2025-12-31"],
    ["2025-04-05", "2026-04-05"],
  ])("copies %s to 2025/26 as %s", (from, to) => {
    const copy = buildCopiedRecordForTaxYear({ ...base, date: from }, "2025/26");
    expect(copy.date).toBe(to);
    expect(copy.name).toBe("Salary (2025/26)");
    expect(copy.notes).toBe("Copied from 2024/25");
  });

  it("copies 29 Feb to 28 Feb in a non-leap year and keeps it in a leap year", () => {
    const leapSource = { ...base, date: "2023-04-06", endDate: "2024-02-29" };
    expect(buildCopiedRecordForTaxYear(leapSource, "2024/25").endDate).toBe("2025-02-28");
    expect(buildCopiedRecordForTaxYear(leapSource, "2027/28").endDate).toBe("2028-02-29");
  });

  it("copies a 3 April record from the year it is filed under (2025/26 to 2026/27)", () => {
    const copy = buildCopiedRecordForTaxYear(
      { ...base, date: "2026-04-03", name: "Salary (2025/26)" },
      "2026/27",
    );
    expect(copy.date).toBe("2027-04-03");
    expect(copy.name).toBe("Salary (2026/27)");
    expect(copy.notes).toBe("Copied from 2025/26");
  });

  it("shifts endDate by the same whole-year difference", () => {
    const copy = buildCopiedRecordForTaxYear(
      { ...base, date: "2024-04-06", endDate: "2025-03-31" },
      "2025/26",
    );
    expect(copy.endDate).toBe("2026-03-31");
  });
});

describe("annual records count once, in the tax year containing their date (E23 D16)", () => {
  const salary = (
    id: string,
    amount: number,
    date: string,
    endDate: string | null = null,
  ): TaxRecord => ({
    ...dividendRecord(amount, date),
    id,
    source: "paye",
    category: "paye_salary",
    name: `Salary ${id}`,
    frequency: "annual",
    endDate,
  });
  const monthly = (): TaxRecord => ({
    ...dividendRecord(100, "2022-04-10"),
    id: "m",
    source: "paye",
    category: "paye_bonus",
    frequency: "monthly",
    endDate: null,
  });
  const years = ["2022/23", "2023/24", "2024/25", "2025/26"] as const;
  const records = [
    salary("a", 40000, "2022-05-01"),
    salary("b", 42000, "2023-05-01"),
    salary("c", 45000, "2024-05-01"),
    salary("d", 48000, "2025-05-01"),
  ];

  it("four yearly salary records give four separate tax years, one salary each", () => {
    const expected = [40000, 42000, 45000, 48000];
    years.forEach((y, i) => {
      const r = calculateUKTax(y, [...records, monthly()], 0, 100);
      expect(r.payeIncomeGross, y).toBe(expected[i]! + 1200);
    });
  });

  it("an annual record never repeats on later anniversaries", () => {
    const one = salary("a", 40000, "2022-05-01");
    expect(getRecordAnnualTotalForTaxYear(one, "2022/23")).toBe(40000);
    expect(getRecordAnnualTotalForTaxYear(one, "2023/24")).toBe(0);
    expect(getRecordAnnualTotalForTaxYear(one, "2025/26")).toBe(0);
  });

  it("a record with an explicit later endDate still counts once", () => {
    const one = salary("a", 40000, "2022-05-01", "2030-04-05");
    expect(getRecordAnnualTotalForTaxYear(one, "2022/23")).toBe(40000);
    expect(getRecordAnnualTotalForTaxYear(one, "2024/25")).toBe(0);
  });

  it("record rule boundary: 5 April ends the earlier year, 6 April starts the next", () => {
    expect(getRecordAnnualTotalForTaxYear(salary("x", 1000, "2024-04-05"), "2023/24")).toBe(1000);
    expect(getRecordAnnualTotalForTaxYear(salary("x", 1000, "2024-04-05"), "2024/25")).toBe(0);
    expect(getRecordAnnualTotalForTaxYear(salary("y", 1000, "2024-04-06"), "2024/25")).toBe(1000);
    expect(getRecordAnnualTotalForTaxYear(salary("z", 1000, "2024-03-31"), "2023/24")).toBe(1000);
  });

  it("getAnnualRecordEndDate is 5 April closing the record-rule tax year", () => {
    expect(getAnnualRecordEndDate("2024-03-31")).toBe("2024-04-05");
    expect(getAnnualRecordEndDate("2024-04-01")).toBe("2024-04-05");
    expect(getAnnualRecordEndDate("2024-04-05")).toBe("2024-04-05");
    expect(getAnnualRecordEndDate("2024-04-06")).toBe("2025-04-05");
    expect(getAnnualRecordEndDate("2024-12-31")).toBe("2025-04-05");
  });
});

describe("PAYE bonus records add to the salary, never replace it (C-10)", () => {
  // 2026/27 England, Wales and NI: personal allowance 12,570, basic band 37,700 at 20%, higher
  // rate 40%, allowance tapered by 1 for every 2 over 100,000. Hand-derived golden figures.
  const Y = "2026/27";
  const paye = (id: string, category: string, amount: number, date = "2026-06-01"): TaxRecord => ({
    ...dividendRecord(amount, date),
    id,
    source: "paye",
    category,
    name: id,
  });
  const bonus = (amount: number) => paye("bonus", "paye_bonus", amount);
  const loggedSalary = (amount: number) => ({
    ...paye("salary", "paye_salary", amount, "2026-04-10"),
    frequency: "annual" as const,
    endDate: "2027-04-05",
  });

  it("salary only: 50,000 profile salary, 37,430 taxable at 20% = 7,486", () => {
    const r = calculateUKTax(Y, [], 50000, 100);
    expect(r.effectivePayeSalary).toBe(50000);
    expect(r.payeTaxDue).toBe(7486);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });

  it("salary + bonus: 50,000 + 5,000 = 55,000; 7,540 + 4,730 x 40% = 9,432", () => {
    const r = calculateUKTax(Y, [bonus(5000)], 50000, 100);
    expect(r.effectivePayeSalary).toBe(55000);
    expect(r.payeTaxDue).toBe(9432);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });

  it("bonus with no profile salary: the bonus alone, 8,000, inside the allowance", () => {
    const r = calculateUKTax(Y, [bonus(8000)], 0, 100);
    expect(r.effectivePayeSalary).toBe(8000);
    expect(r.payeTaxDue).toBe(0);
  });

  it("logged salary + bonus: 40,000 logged replaces the 60,000 profile salary, bonus adds", () => {
    const r = calculateUKTax(Y, [loggedSalary(40000), bonus(5000)], 60000, 100);
    expect(r.effectivePayeSalary).toBe(45000);
    // 45,000 - 12,570 = 32,430 x 20%
    expect(r.payeTaxDue).toBe(6486);
  });

  it("logged salary alone still replaces the profile salary", () => {
    const r = calculateUKTax(Y, [loggedSalary(40000)], 60000, 100);
    expect(r.effectivePayeSalary).toBe(40000);
  });

  it("a bonus that crosses the higher-rate threshold: 48,000 + 4,000; 7,540 + 1,730 x 40% = 8,232", () => {
    const r = calculateUKTax(Y, [bonus(4000)], 48000, 100);
    expect(r.effectivePayeSalary).toBe(52000);
    expect(r.payeTaxDue).toBe(8232);
  });

  it("a bonus that crosses 100,000 tapers the allowance: 95,000 + 15,000 = 110,000", () => {
    const r = calculateUKTax(Y, [bonus(15000)], 95000, 100);
    expect(r.effectivePayeSalary).toBe(110000);
    // Allowance 12,570 - (10,000 / 2) = 7,570; taxable 102,430; 7,540 + 64,730 x 40% = 33,432
    expect(r.personalAllowance).toBe(7570);
    expect(r.payeTaxDue).toBe(33432);
  });

  // Logged employee pension (net pay arrangement) comes off the profile salary even when no
  // salary record is logged: 50,000 - 4,000 = 46,000; 33,430 x 20% = 6,686.
  it("logged employee pension comes off the profile salary with no salary record logged", () => {
    const r = calculateUKTax(Y, [paye("pension", "paye_pension", 4000)], 50000, 100);
    expect(r.effectivePayeSalary).toBe(46000);
    expect(r.payeTaxDue).toBe(6686);
  });
});

describe("tax due on income outside PAYE (golden, 2026/27 England, Wales and NI)", () => {
  // Personal allowance 12,570 tapered 1 for 2 above 100,000; basic band 37,700 at 20%, higher 40%,
  // additional 45% above taxable 125,140. Savings starting rate band 5,000 at 0%, reduced 1 for 1
  // by non-savings taxable income. Dividends 10.75% basic, allowance 500. Hand-derived figures.
  const Y = "2026/27";
  const rec = (category: string, source: TaxRecord["source"], amount: number): TaxRecord => ({
    ...dividendRecord(amount, "2026-06-01"),
    id: `${source}-${category}`,
    source,
    category,
    name: category,
  });
  const rent = (amount: number) => rec("rental_income", "rental", amount);
  const tradingIncome = (amount: number) => rec("self_employed_income", "self-employed", amount);

  it("PAYE is deducted with the allowance tapered by the salary alone: 95,000 salary + 20,000 rent", () => {
    const r = calculateUKTax(Y, [rent(20000)], 95000, 100);
    // No costs recorded, so the 1,000 property allowance comes off the rent: profit 19,000.
    // Liability: total 114,000; allowance 12,570 - 7,000 = 5,570; taxable 108,430;
    // 7,540 + 70,730 x 40% = 35,832.
    expect(r.propertyAllowanceUsed).toBe(1000);
    expect(r.totalTaxDue).toBe(35832);
    // PAYE: full 12,570 allowance on 95,000; taxable 82,430; 7,540 + 44,730 x 40% = 25,432.
    expect(r.payeTaxDue).toBe(25432);
    expect(r.netAdditionalTaxToPay).toBe(10400);
  });

  it("120,000 salary + 10,000 rent: 44,253 liability - 39,432 PAYE = 4,821", () => {
    const r = calculateUKTax(Y, [rent(10000)], 120000, 100);
    // Rent less the 1,000 property allowance: 9,000. Total 129,000, no personal allowance left:
    // 7,540 + 87,440 x 40% + 3,860 x 45% = 44,253.
    expect(r.totalTaxDue).toBe(44253);
    expect(r.payeTaxDue).toBe(39432);
    expect(r.netAdditionalTaxToPay).toBe(4821);
  });

  it("unused allowance covers savings: 10,000 trading profit + 3,000 interest = 0", () => {
    const r = calculateUKTax(Y, [tradingIncome(10000), savingsRecord(3000, "2026-06-01")], 0, 100);
    expect(r.taxableSavingsInterest).toBe(0);
    expect(r.savingsTaxDue).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });

  it("no employment, 10,000 interest sits inside the allowance = 0", () => {
    const r = calculateUKTax(Y, [savingsRecord(10000, "2026-06-01")], 0, 100);
    expect(r.savingsTaxDue).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });

  it("starting rate for savings: 0 salary, 20,000 interest; 12,570 allowance, 5,000 at 0%, 1,000 PSA, 1,430 at 20% = 286", () => {
    const r = calculateUKTax(Y, [savingsRecord(20000, "2026-06-01")], 0, 100);
    expect(r.taxableSavingsInterest).toBe(1430);
    expect(r.savingsTaxDue).toBeCloseTo(286, 2);
  });

  it("starting rate shrinks 1 for 1 with non-savings income above the allowance: 15,570 salary, 3,000 interest", () => {
    // Non-savings taxable 3,000 leaves a 2,000 starting band; 1,000 PSA; nothing left to tax.
    const r = calculateUKTax(Y, [savingsRecord(3000, "2026-06-01")], 15570, 100);
    expect(r.savingsTaxDue).toBe(0);
    // 4,000 interest leaves 1,000 at 20% = 200.
    const r2 = calculateUKTax(Y, [savingsRecord(4000, "2026-06-01")], 15570, 100);
    expect(r2.savingsTaxDue).toBeCloseTo(200, 2);
  });

  it("unused allowance then covers dividends: 5,000 trading income + 20,000 dividends = 1,175", () => {
    const r = calculateUKTax(Y, [tradingIncome(5000), dividendRecord(20000, "2026-06-01")], 0, 100);
    // Profit 4,000 after the 1,000 trading allowance; 8,570 personal allowance left;
    // 11,430 dividends - 500 allowance = 10,930 x 10.75% = 1,174.98.
    expect(r.seProfit).toBe(4000);
    expect(r.taxableDividends).toBe(10930);
    expect(Math.round(r.netAdditionalTaxToPay)).toBe(1175);
  });

  it("Section 24 credit still holds: 49,000 salary + 10,000 rent with 6,000 mortgage interest = 2,546", () => {
    const r = calculateUKTax(
      Y,
      [rent(10000), rec("mortgage_interest", "rental", 6000)],
      49000,
      100,
    );
    // 46,430 taxable: 11,032 - 7,286 PAYE = 3,746 on the rent, less 20% x 6,000 = 1,200 credit.
    expect(r.rentalPropertyTaxCredit).toBe(1200);
    expect(r.netAdditionalTaxToPay).toBe(2546);
  });

  it("losses never go below 0: rental and trading losses give 0", () => {
    const r = calculateUKTax(
      Y,
      [
        rent(5000),
        rec("repairs_maintenance", "rental", 8000),
        rec("office_costs", "self-employed", 3000),
      ],
      30000,
      100,
    );
    expect(r.rentalProfitBeforeInterest).toBe(0);
    expect(r.seProfit).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });
});

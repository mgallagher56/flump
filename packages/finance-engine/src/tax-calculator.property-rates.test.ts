/**
 * 2027/28 property and savings rates in the estimate (Finance Act 2026 s.5 to s.7 and Sch 1,
 * at the announced 24/44/49 of Finance Bill 2026-27; owner choice "Announced 24/44/49").
 *
 * Rows 1 to 5 are the owner-signed worked figures (19 November 2026, "Yes, signed off"). Every
 * expected value is worked by hand in the comment beside it; none is read back from the engine.
 * 2027/28: Personal Allowance 12,570, basic rate limit 37,700, additional-rate threshold 125,140,
 * taper from 100,000, main rates 20/40/45, property and savings rates 24/44/49.
 * Each row adds 5,000 of other rental costs, so rent = profit + 5,000. The recorded-costs route then
 * always beats the 1,000 property allowance, as the signed rows assume.
 */
import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

const Y = "2027/28";

function annual(
  source: TaxRecordFields["source"],
  category: string,
  amount: number,
  year: string = Y,
): TaxRecordFields {
  return {
    id: `${source}-${category}`,
    type: category.endsWith("_income") || source === "savings" ? "income" : "expense",
    source,
    category,
    name: category,
    amount,
    frequency: "annual",
    date: `${year.slice(0, 4)}-06-06`,
    endDate: null,
    notes: null,
  };
}

/** Rent records for a profit before interest of `profit`, with 5,000 of other costs. */
function letting(profit: number, interest: number, year: string = Y): TaxRecordFields[] {
  const records = [
    annual("rental", "rental_income", profit + 5000, year),
    annual("rental", "repairs_maintenance", 5000, year),
  ];
  if (interest > 0) records.push(annual("rental", "mortgage_interest", interest, year));
  return records;
}

describe("2027/28 property income at the property rates (signed rows 1 to 5)", () => {
  it("row 1: basic rate. Salary 30,000, profit 10,000, interest 4,000", () => {
    const r = calculateUKTax(Y, letting(10000, 4000), 30000, 100);
    // Salary taxable 30,000 - 12,570 = 17,430; property slice 17,430 to 27,430, all basic band.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(2400, 2); // 10,000 x 24%
    // Credit base min(4,000, 10,000, 27,430) = 4,000; 4,000 x 24% = 960.
    expect(r.rentalPropertyTaxCredit).toBeCloseTo(960, 2);
    expect(r.rentalPropertyTaxDueAfterCredit).toBeCloseTo(1440, 2);
    // Salary tax 17,430 x 20% = 3,486; total 3,486 + 1,440 = 4,926.
    expect(r.totalIncomeTaxDue).toBeCloseTo(4926, 2);
    expect(r.financeCostsCarriedForward).toBeCloseTo(0, 2);
  });

  it("row 2: crosses into higher rate. Salary 45,000, profit 20,000, interest 6,000", () => {
    const r = calculateUKTax(Y, letting(20000, 6000), 45000, 100);
    // Salary taxable 32,430, so 37,700 - 32,430 = 5,270 of basic band is left.
    // 5,270 x 24% = 1,264.80; 14,730 x 44% = 6,481.20; total 7,746.00.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(7746, 2);
    // Credit base min(6,000, 20,000, 52,430) = 6,000; x 24% = 1,440.
    expect(r.rentalPropertyTaxCredit).toBeCloseTo(1440, 2);
    expect(r.rentalPropertyTaxDueAfterCredit).toBeCloseTo(6306, 2);
    // Salary tax 32,430 x 20% = 6,486; total 6,486 + 6,306 = 12,792.
    expect(r.totalIncomeTaxDue).toBeCloseTo(12792, 2);
  });

  it("row 3: allowance lost, crosses into additional rate. Salary 110,000, profit 30,000, interest 10,000", () => {
    const r = calculateUKTax(Y, letting(30000, 10000), 110000, 100);
    // Adjusted net income 140,000: allowance 0. Salary 0 to 110,000: 37,700 x 20% = 7,540 plus
    // 72,300 x 40% = 28,920, so 36,460. Property 110,000 to 140,000: 15,140 x 44% = 6,661.60 plus
    // 14,860 x 49% = 7,281.40, so 13,943.00. Credit 10,000 x 24% = 2,400.
    // Total 36,460 + 13,943 - 2,400 = 48,003.
    expect(r.personalAllowance).toBe(0);
    expect(r.rentalPropertyTaxCredit).toBeCloseTo(2400, 2);
    expect(r.totalIncomeTaxDue).toBeCloseTo(48003, 2);
    // The rent line also carries the allowance the rent takes away: without the rent the allowance
    // is 12,570 - (110,000 - 100,000) / 2 = 7,570, taxed at 40% = 3,028. 13,943 + 3,028 = 16,971.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(16971, 2);
  });

  it("row 4: credit capped by income above the allowance. No salary, profit 15,000, interest 8,000", () => {
    const r = calculateUKTax(Y, letting(15000, 8000), 0, 100);
    // The allowance goes against the property income: 15,000 - 12,570 = 2,430 x 24% = 583.20.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(583.2, 2);
    // Credit base min(8,000, 15,000, 2,430) = 2,430; x 24% = 583.20.
    expect(r.rentalPropertyTaxCredit).toBeCloseTo(583.2, 2);
    expect(r.totalIncomeTaxDue).toBeCloseTo(0, 2);
    // 8,000 - 2,430 = 5,570 carries forward (ITTOIA 2005 s.274AA(4)).
    expect(r.financeCostsCarriedForward).toBeCloseTo(5570, 2);
  });

  it("row 5: savings above property. Salary 40,000, profit 10,000, savings interest 2,000", () => {
    const r = calculateUKTax(
      Y,
      [...letting(10000, 0), annual("savings", "savings_interest", 2000)],
      40000,
      100,
    );
    // Salary taxable 27,430; property 27,430 to 37,430 at 24% = 2,400. Savings above property: a
    // higher-rate taxpayer, so the allowance is 500, using the last 270 of basic band and 230 of
    // higher band. Starting rate 0. The other 1,500 at the savings higher rate 44% = 660.
    // Salary tax 27,430 x 20% = 5,486. Total 5,486 + 2,400 + 660 = 8,546.
    expect(r.personalSavingsAllowance).toBe(500);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8546, 2);
    // Shown split (the engine's convention): savings as they would be without the rent, a
    // basic-rate taxpayer with allowance 1,000, so 1,000 x 24% = 240. The rent line takes the rest:
    // 2,400 + (660 - 240) = 2,820.
    expect(r.savingsTaxDue).toBeCloseTo(240, 2);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(2820, 2);
  });
});

describe("2027/28 property income sits above self-employed profit too", () => {
  it("self-employed profit 20,000 and rental profit 10,000, no salary", () => {
    const r = calculateUKTax(
      Y,
      [
        ...letting(10000, 0),
        annual("self-employed", "self_employed_income", 25000),
        annual("self-employed", "office_costs", 5000),
      ],
      0,
      100,
    );
    // Self-employed profit 20,000 - 12,570 = 7,430 taxable at 20% = 1,486. Property 7,430 to
    // 17,430, all basic band, at 24% = 2,400. Total income tax 3,886.
    expect(r.seProfit).toBeCloseTo(20000, 2);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(2400, 2);
    expect(r.totalIncomeTaxDue).toBeCloseTo(3886, 2);
  });
});

describe("2026/27: property and savings at the main rates, credit at 20%", () => {
  it("row 2's inputs in 2026/27", () => {
    const r = calculateUKTax("2026/27", letting(20000, 6000, "2026/27"), 45000, 100);
    // 5,270 x 20% = 1,054; 14,730 x 40% = 5,892; total 6,946. Credit 6,000 x 20% = 1,200.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(6946, 2);
    expect(r.rentalPropertyTaxCredit).toBeCloseTo(1200, 2);
    // 6,486 + 6,946 - 1,200 = 12,232.
    expect(r.totalIncomeTaxDue).toBeCloseTo(12232, 2);
  });

  it("row 5's inputs in 2026/27", () => {
    const r = calculateUKTax(
      "2026/27",
      [...letting(10000, 0, "2026/27"), annual("savings", "savings_interest", 2000, "2026/27")],
      40000,
      100,
    );
    // Taxable 39,430: PSA 500. With the allowance all on non-savings income (the old order):
    // 5,486 + 10,000 x 20% + 1,500 x 40% = 5,486 + 2,000 + 600 = 8,086. Before 2027/28 the
    // allowance goes where the bill is lowest (ITA 2007 s.25(2); s.25(3A) starts in 2027/28):
    // moving 270 onto the interest takes non-savings taxable to 37,700 x 20% = 7,540 (+54) and
    // puts the PSA on 37,700 to 38,200, leaving 1,730 - 500 = 1,230 x 40% = 492 (-108). Total
    // 8,032. Moving any amount from 270 up to 1,500 is a tie (40% against 40%), so 270 is kept.
    expect(r.totalIncomeTaxDue).toBeCloseTo(8032, 2);
  });
});

describe("2027/28 Scottish estimates are refused", () => {
  it("throws: no Scottish rates are published for 2027/28", () => {
    expect(() => calculateUKTax(Y, letting(10000, 0), 30000, 100, { region: "SCOTLAND" })).toThrow(
      /Scottish income tax/,
    );
  });
});

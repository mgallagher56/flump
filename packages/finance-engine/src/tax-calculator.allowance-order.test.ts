import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * Where the ledger sets the Personal Allowance (ITA 2007 s.25(2)): "in the way which will result
 * in the greatest reduction in the taxpayer's liability". Before this change the allowance always
 * went against non-savings income, then savings, then dividends. Rows follow the step A worked
 * table (allowance-order step A, section 6) for the years this branch supports; every figure is
 * worked by hand beside it.
 *
 * Lines: when allowance moves off non-savings income, the non-savings lines stay as they were,
 * and the net gain comes off the savings or dividend line that benefits. The lines add up to the
 * total.
 *
 * Rates (GOV.UK "Income Tax rates and allowances: current and past"): allowance 12,570 (tapered
 * by 1 for every 2 above 100,000); basic rate 20% to 37,700, higher 40%; starting rate for savings
 * 5,000; PSA 1,000 basic, 500 higher; dividend allowance 500 (2,000 in 2022/23); dividend rates
 * 2026/27 10.75% / 35.75%, 2025/26 8.75% / 33.75%, 2022/23 8.75% / 33.75%. Scotland 2026/27:
 * 19% to 3,967, 20% to 16,956, 21% to 31,092, 42% to 62,430.
 */

let n = 0;
function rec(
  year: string,
  source: TaxRecordFields["source"],
  category: string,
  amount: number,
  type: "income" | "expense" = "income",
): TaxRecordFields {
  return {
    id: `r${++n}`,
    type,
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
const interest = (y: string, a: number) => rec(y, "savings", "savings_interest", a);
const dividends = (y: string, a: number) => rec(y, "savings", "dividend_income", a);
/** Rent with 2,000 of costs, so the recorded costs beat the 1,000 property allowance. */
const rentProfit = (y: string, profit: number) => [
  rec(y, "rental", "rental_income", profit + 2000),
  rec(y, "rental", "repairs_maintenance", 2000, "expense"),
];

describe("Personal Allowance set where it lowers the bill", () => {
  it("salary only: all of it against the salary", () => {
    const r = calculateUKTax("2026/27", [], 30000, 100);
    expect(r.allowanceOnNonSavings).toBe(12570);
    expect(r.allowanceOnSavings).toBe(0);
    expect(r.allowanceOnDividends).toBe(0);
  });

  it("case 2 (2026/27): property 10,000, interest 6,000, dividends 6,000", () => {
    // Today: 10,000 to property, 2,570 to interest; interest 3,430 at the starting rate;
    // dividends 6,000 - 500 = 5,500 x 10.75% = 591.25.
    // Lowest: 10,000 to property, 2,570 to dividends; interest 6,000 = 5,000 starting rate +
    // 1,000 PSA (taxable 9,430, basic rate); dividends 3,430 - 500 = 2,930 x 10.75% = 314.975.
    // Without the rent the 12,570 covers all 12,000, so no tax: all 314.975 is on the rent.
    const y = "2026/27";
    const r = calculateUKTax(
      y,
      [...rentProfit(y, 10000), interest(y, 6000), dividends(y, 6000)],
      0,
      100,
    );
    expect(r.allowanceOnNonSavings).toBe(10000);
    expect(r.allowanceOnSavings).toBe(0);
    expect(r.allowanceOnDividends).toBe(2570);
    expect(r.totalIncomeTaxDue).toBeCloseTo(314.975, 6);
    expect(r.taxableDividends).toBe(2930);
    expect(r.dividendTaxDue).toBe(0);
    expect(r.savingsTaxDue).toBe(0);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(314.975, 6);
  });

  it("case 6 (2026/27 Scotland): the same income, the same answer", () => {
    // No non-savings tax either way; savings and dividends use UK bands (ITA 2007 s.11A).
    const y = "2026/27";
    const r = calculateUKTax(
      y,
      [...rentProfit(y, 10000), interest(y, 6000), dividends(y, 6000)],
      0,
      100,
      { region: "SCOTLAND" },
    );
    expect(r.allowanceOnDividends).toBe(2570);
    expect(r.totalIncomeTaxDue).toBeCloseTo(314.975, 6);
  });

  it("case 3a (2026/27): salary 50,000, dividends 10,000", () => {
    // Today: salary taxable 37,430 x 20% = 7,486; the dividend allowance sits on 37,430 to
    // 37,930, so 9,500 x 35.75% = 3,396.25; total 10,882.25.
    // Lowest: 12,300 to salary, 270 to dividends. Salary 37,700 x 20% = 7,540; dividends
    // 9,730 - 500 = 9,230 x 35.75% = 3,299.725; total 10,839.725 (gain 42.525).
    // Lines: PAYE 7,486 stays; dividend line 3,396.25 - 42.525 = 3,353.725.
    const y = "2026/27";
    const r = calculateUKTax(y, [dividends(y, 10000)], 50000, 100);
    expect(r.allowanceOnNonSavings).toBe(12300);
    expect(r.allowanceOnDividends).toBe(270);
    expect(r.totalIncomeTaxDue).toBeCloseTo(10839.725, 6);
    expect(r.payeTaxDue).toBe(7486);
    expect(r.dividendTaxDue).toBeCloseTo(3353.725, 6);
    expect(r.taxableDividends).toBe(9230);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(3353.725, 6);
  });

  it("case 4 (2026/27): salary 50,000, interest 10,000", () => {
    // Today: 7,486 + PSA on 37,430 to 37,930, 9,500 x 40% = 3,800: 11,286.
    // Lowest: move 270: 7,540 + (9,730 - 500) x 40% = 3,692: 11,232. Moving more ties (40%
    // against 40%), so the move closest to today's, 270, is kept.
    // Lines: savings 3,800 - 54 = 3,746.
    const y = "2026/27";
    const r = calculateUKTax(y, [interest(y, 10000)], 50000, 100);
    expect(r.allowanceOnNonSavings).toBe(12300);
    expect(r.allowanceOnSavings).toBe(270);
    expect(r.totalIncomeTaxDue).toBeCloseTo(11232, 6);
    expect(r.savingsTaxDue).toBeCloseTo(3746, 6);
    expect(r.taxableSavingsInterest).toBe(9230);
  });

  it("tie (2026/27): salary 50,000, interest 3,000 takes the move closest to today's", () => {
    // Taxable 40,430: PSA 500. Moving 0 to 270 saves 20% a pound; 270 to 2,500 is a tie (40%
    // against 40%). So 270 moves: 37,700 x 20% = 7,540; (2,730 - 500) x 40% = 892; 8,432.
    const y = "2026/27";
    const r = calculateUKTax(y, [interest(y, 3000)], 50000, 100);
    expect(r.allowanceOnNonSavings).toBe(12300);
    expect(r.allowanceOnSavings).toBe(270);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8432, 6);
  });

  it("case 7 (2022/23): salary 49,000, dividends 6,000, dividend allowance 2,000", () => {
    // Today: 36,430 x 20% = 7,286; allowance band 36,430 to 38,430; 4,000 x 33.75% = 1,350;
    // total 8,636. Lowest: move 1,270: 37,700 x 20% = 7,540; (4,730 - 2,000) x 33.75% = 921.375;
    // total 8,461.375.
    const y = "2022/23";
    const r = calculateUKTax(y, [dividends(y, 6000)], 49000, 100);
    expect(r.allowanceOnNonSavings).toBe(11300);
    expect(r.allowanceOnDividends).toBe(1270);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8461.375, 6);
  });

  it("case 8 (2026/27): salary 100,000, dividends 10,000: no change inside the taper", () => {
    // Allowance 12,570 - 5,000 = 7,570. 7,540 + 54,730 x 40% + 9,500 x 35.75% = 7,540 +
    // 21,892 + 3,396.25 = 32,828.25. Moving costs 40% and saves 35.75%.
    const y = "2026/27";
    const r = calculateUKTax(y, [dividends(y, 10000)], 100000, 100);
    expect(r.allowanceOnNonSavings).toBe(7570);
    expect(r.allowanceOnDividends).toBe(0);
    expect(r.totalIncomeTaxDue).toBeCloseTo(32828.25, 6);
  });

  it("case 9 (2026/27 Scotland): salary 48,000, dividends 10,000: no change", () => {
    // Scottish: 3,967 x 19% = 753.73; 12,989 x 20% = 2,597.80; 14,136 x 21% = 2,968.56;
    // 4,338 x 42% = 1,821.96; 8,142.05. Dividends: allowance on 35,430 to 35,930; 1,770 x
    // 10.75% = 190.275; 7,730 x 35.75% = 2,763.475. Total 11,095.80. A move costs 42%.
    const y = "2026/27";
    const r = calculateUKTax(y, [dividends(y, 10000)], 48000, 100, { region: "SCOTLAND" });
    expect(r.allowanceOnNonSavings).toBe(12570);
    expect(r.totalIncomeTaxDue).toBeCloseTo(11095.8, 6);
  });

  it("taper (2026/27): the tapered allowance is shared the same way", () => {
    // Salary 2,000, interest 6,000, dividends 100,000: income 108,000, allowance 12,570 -
    // 4,000 = 8,570. Taxable 99,430: PSA 500.
    // Today: 2,000 to salary, 6,000 to interest, 570 to dividends. Dividends 99,430: allowance
    //   0 to 500; 37,200 x 10.75% = 3,999; 61,730 x 35.75% = 22,068.475; total 26,067.475.
    // Lowest: 2,000 to salary, 500 to interest, 6,070 to dividends. Interest 5,500 = 5,000
    //   starting rate + 500 PSA. Dividends 93,930 from 5,500: allowance to 6,000; 31,700 x
    //   10.75% = 3,407.75; 61,730 x 35.75% = 22,068.475; total 25,476.225.
    const y = "2026/27";
    const r = calculateUKTax(y, [interest(y, 6000), dividends(y, 100000)], 2000, 100);
    expect(r.personalAllowance).toBe(8570);
    expect(r.allowanceOnNonSavings).toBe(2000);
    expect(r.allowanceOnSavings).toBe(500);
    expect(r.allowanceOnDividends).toBe(6070);
    expect(r.totalIncomeTaxDue).toBeCloseTo(25476.225, 6);
  });
});

describe("which line the gain comes off", () => {
  it("interest that rises stays on its old line; the dividends take the net gain", () => {
    // 2026/27, no other income: interest 50,000, dividends 10,000. Taxable 47,430: PSA 500.
    // Today: interest 5,000 starting rate, 500 PSA, 5,500 to 37,430 at 20% = 6,386; dividend
    //   allowance 37,430 to 37,930; 9,500 x 35.75% = 3,396.25. Total 9,782.25.
    // Lowest: 270 moves from interest to dividends: interest to 37,700, 32,200 x 20% = 6,440
    //   (+54); dividends 9,230 x 35.75% = 3,299.725 (-96.525). Total 9,739.725, gain 42.525.
    // The interest line rose, so it stays at 6,386; the dividend line is 3,396.25 - 42.525.
    const y = "2026/27";
    const r = calculateUKTax(y, [interest(y, 50000), dividends(y, 10000)], 0, 100);
    expect(r.allowanceOnSavings).toBe(12300);
    expect(r.savingsTaxDue).toBeCloseTo(6386, 6);
    expect(r.dividendTaxDue).toBeCloseTo(3353.725, 6);
    expect(r.totalIncomeTaxDue).toBeCloseTo(9739.725, 6);
  });

  it("dividends that do not change keep their line; the interest takes the net gain", () => {
    // 2026/27: salary 50,000, interest 10,000, dividends 1,000. Taxable 48,430: PSA 500.
    // Today: salary 37,430 x 20% = 7,486; PSA 37,430 to 37,930, 9,500 x 40% = 3,800; dividend
    //   allowance 47,430 to 47,930, 500 x 35.75% = 178.75. Total 11,464.75.
    // Lowest: 270 moves from salary to interest (as in case 4): salary 37,700 x 20% = 7,540;
    //   interest 9,230 x 40% = 3,692; dividends unchanged. Total 11,410.75, gain 54.
    // Lines: salary 7,486; interest 3,800 - 54 = 3,746; dividends 178.75.
    const y = "2026/27";
    const r = calculateUKTax(y, [interest(y, 10000), dividends(y, 1000)], 50000, 100);
    expect(r.allowanceOnSavings).toBe(270);
    expect(r.savingsTaxDue).toBeCloseTo(3746, 6);
    expect(r.dividendTaxDue).toBeCloseTo(178.75, 6);
    expect(r.totalIncomeTaxDue).toBeCloseTo(11410.75, 6);
  });
});

describe("tax on rent when the allowance moves", () => {
  it("the rent line rises while the bill falls (2026/27)", () => {
    // Rent profit 10,000, interest 8,000, dividends 12,000. Taxable 17,430: PSA 1,000.
    // With rent, today: 10,000 to rent, 2,570 to interest; dividends 11,500 x 10.75% = 1,236.25.
    // With rent, lowest: 10,000 to rent, 2,000 to interest, 570 to dividends. Interest 6,000 =
    //   5,000 starting rate + 1,000 PSA; dividends 11,430 - 500 = 10,930 x 10.75% = 1,174.975.
    // Without rent, lowest: 2,000 to interest, 10,570 to dividends; dividends 1,430 - 500 =
    //   930 x 10.75% = 99.975 (today's order gave 744.975).
    // Rent line: 1,174.975 - 99.975 = 1,075 (was 1,236.25 - 744.975 = 491.275). The rent takes
    //   allowance that would have covered dividends, so the tax it causes rises while the bill
    //   falls by 61.275.
    const y = "2026/27";
    const r = calculateUKTax(
      y,
      [...rentProfit(y, 10000), interest(y, 8000), dividends(y, 12000)],
      0,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(1075, 6);
    expect(r.dividendTaxDue).toBeCloseTo(99.975, 6);
    expect(r.savingsTaxDue).toBe(0);
    expect(r.totalIncomeTaxDue).toBeCloseTo(1174.975, 6);
    expect(r.allowanceOnSavings).toBe(2000);
    expect(r.allowanceOnDividends).toBe(570);
  });
});

/**
 * 2027/28 (Finance Act 2026 s.5 to s.7, announced 24/44/49): property and savings income have
 * their own rates, 24% basic, 44% higher, 49% additional, on the same limits; dividends 10.75% /
 * 35.75%, allowance 500. Property income sits immediately above other non-savings income (ITA
 * 2007 s.16A), and the allowance goes against other income (employment, trading, pension) first
 * (s.25(3A)); only what is left is set where it gives the lowest bill (s.25(2)).
 */
describe("2027/28: other income first, then the lowest bill", () => {
  const y = "2027/28";

  it("case 1: property 10,000, interest 6,000, dividends 6,000, no other income", () => {
    // No other income, so all 12,570 may be shared. Taxable 9,430: basic rate, PSA 1,000.
    // Today: 10,000 to property, 2,570 to interest; the interest left, 3,430, is in the 5,000
    //   starting rate; dividends 6,000 - 500 = 5,500 x 10.75% = 591.25.
    // Lowest: 10,000 to property, 2,570 to dividends. Interest 6,000 = 5,000 starting rate +
    //   1,000 PSA; dividends 3,430 - 500 = 2,930 x 10.75% = 314.975. No property is taxable
    //   either way, so the 24% rate does not come in. Without the rent there is no tax, so the
    //   rent line is all of it.
    const r = calculateUKTax(
      y,
      [...rentProfit(y, 10000), interest(y, 6000), dividends(y, 6000)],
      0,
      100,
    );
    expect(r.allowanceOnNonSavings).toBe(10000);
    expect(r.allowanceOnSavings).toBe(0);
    expect(r.allowanceOnDividends).toBe(2570);
    expect(r.totalIncomeTaxDue).toBeCloseTo(314.975, 6);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(314.975, 6);
  });

  it("case 3b: salary 50,000, dividends 10,000: the salary takes the whole allowance", () => {
    // s.25(3A): the salary is other income and takes all 12,570 before the dividends. Nothing
    // moves: salary 37,430 x 20% = 7,486; the dividend allowance sits on 37,430 to 37,930 and
    // 9,500 x 35.75% = 3,396.25. Total 10,882.25 (2026/27 would move 270: case 3a).
    const r = calculateUKTax(y, [dividends(y, 10000)], 50000, 100);
    expect(r.allowanceOnNonSavings).toBe(12570);
    expect(r.allowanceOnDividends).toBe(0);
    expect(r.totalIncomeTaxDue).toBeCloseTo(10882.25, 6);
  });

  it("self-employed profit is other income too: it takes the whole allowance", () => {
    // Self-employed income 52,000 less 2,000 of costs: profit 50,000 (other income, s.25(3A)),
    // dividends 10,000. As case 3b: 37,430 x 20% = 7,486 and 9,500 x 35.75% = 3,396.25, total
    // Income Tax 10,882.25, with all 12,570 against the profit.
    const r = calculateUKTax(
      y,
      [
        rec(y, "self-employed", "self_employed_income", 52000),
        rec(y, "self-employed", "office_costs", 2000, "expense"),
        dividends(y, 10000),
      ],
      0,
      100,
    );
    expect(r.allowanceOnNonSavings).toBe(12570);
    expect(r.allowanceOnDividends).toBe(0);
    expect(r.totalIncomeTaxDue).toBeCloseTo(10882.25, 6);
  });

  it("case 5: property 50,000, interest 3,000: a tie from 270 to 2,500 keeps 270", () => {
    // No other income. Taxable 40,430: PSA 500.
    // Today: property 37,430 x 24% = 8,983.20; the PSA sits on 37,430 to 37,930, so the other
    //   2,500 of interest is above 37,700 at 44% = 1,100. Total 10,083.20.
    // x moved from property to interest: x from 0 to 270, property +24% and interest -44%:
    //   -20% x 270 = -54, total 10,029.20 (property 37,700 x 24% = 9,048; interest 2,730 - 500
    //   = 2,230 x 44% = 981.20). From 270 to 2,500 property pays 44%: a tie. The move closest
    //   to today's is 270.
    const r = calculateUKTax(y, [...rentProfit(y, 50000), interest(y, 3000)], 0, 100);
    expect(r.allowanceOnNonSavings).toBe(12300);
    expect(r.allowanceOnSavings).toBe(270);
    expect(r.totalIncomeTaxDue).toBeCloseTo(10029.2, 6);
  });

  it("salary below the allowance: only the allowance left after it is shared", () => {
    // Salary 8,000, property 2,000, interest 6,000, dividends 6,000. Taxable 9,430: PSA 1,000.
    // s.25(3A): the salary takes 8,000 first; 4,570 is left for the rest.
    // Today: 2,000 to property, 2,570 to interest; the interest left, 3,430, is in the starting
    //   rate; dividends 5,500 x 10.75% = 591.25.
    // Lowest: 2,000 to property, 2,570 to dividends. Interest 6,000 = 5,000 starting rate + 1,000
    //   PSA; dividends 2,930 x 10.75% = 314.975. Taking allowance off the property would cost
    //   24% and shrink the starting rate, so it stays.
    const r = calculateUKTax(
      y,
      [...rentProfit(y, 2000), interest(y, 6000), dividends(y, 6000)],
      8000,
      100,
    );
    expect(r.allowanceOnNonSavings).toBe(10000);
    expect(r.allowanceOnSavings).toBe(0);
    expect(r.allowanceOnDividends).toBe(2570);
    expect(r.totalIncomeTaxDue).toBeCloseTo(314.975, 6);
  });
});

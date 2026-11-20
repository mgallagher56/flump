import { describe, expect, it } from "vitest";
import {
  allocatePersonalAllowance,
  allowanceGoesToOtherIncomeFirst,
  type PersonalAllowanceAllocationInput,
} from "./personal-allowance-allocation.js";
import { getUkTaxYearRules, SUPPORTED_UK_TAX_YEARS, type UkTaxYearRules } from "./uk-tax-year.js";

/**
 * Where the Personal Allowance is set (ITA 2007 s.25(2)): the allocation that gives the greatest
 * reduction in the liability, not always non-savings income first. Every expected allocation is
 * worked by hand in the comment beside it.
 *
 * 2026/27 figures (GOV.UK "Income Tax rates and allowances: current and past"): allowance 12,570;
 * basic rate 20% to 37,700 of taxable income, higher 40%; starting rate for savings 5,000; Personal
 * Savings Allowance 1,000 basic rate, 500 higher; dividend allowance 500, dividend rates 10.75%
 * ordinary and 35.75% upper. Gift Aid (ITA 2007 s.414) and relief-at-source pension contributions
 * (FA 2004 s.192(4)) raise the basic and higher rate limits by the grossed-up amount.
 */
const R2627 = getUkTaxYearRules("2026/27");

const input = (
  over: Partial<PersonalAllowanceAllocationInput>,
): PersonalAllowanceAllocationInput => ({
  rules: R2627,
  region: "ENGLAND_NI_WALES",
  allowance: 12570,
  nonSavings: 0,
  savings: 0,
  dividends: 0,
  personalSavingsAllowance: 1000,
  ...over,
});

describe("allocatePersonalAllowance", () => {
  it("keeps today's order when nothing else is lower (salary only)", () => {
    // Salary 30,000: all 12,570 against it; there is no other income to take any.
    expect(allocatePersonalAllowance(input({ nonSavings: 30000 }))).toEqual({
      onNonSavings: 12570,
      onSavings: 0,
      onDividends: 0,
    });
  });

  it("uses only as much allowance as there is income", () => {
    // Salary 4,000 and interest 1,000: 5,000 of income, so 5,000 of allowance is used.
    expect(allocatePersonalAllowance(input({ nonSavings: 4000, savings: 1000 }))).toEqual({
      onNonSavings: 4000,
      onSavings: 1000,
      onDividends: 0,
    });
  });

  it("uses no allowance when there is none to share", () => {
    // Allowance fully tapered away: nothing to set against any income.
    expect(
      allocatePersonalAllowance(input({ allowance: 0, nonSavings: 130000, dividends: 5000 })),
    ).toEqual({ onNonSavings: 0, onSavings: 0, onDividends: 0 });
  });

  it("moves allowance off salary so the dividend allowance sits above the basic rate limit", () => {
    // Salary 50,000, dividends 10,000 (step A case 3a). Taxable income 47,430: PSA 500.
    // Moving x of allowance off the salary: salary taxable 37,430 + x at 20%; the dividend
    // allowance sits on [37,430 + x, 37,930 + x], already over 37,700, so each pound moved
    // saves 35.75% and costs 20% until the salary reaches 37,700 at x = 270. Beyond that the
    // salary pays 40%, more than 35.75%. So 12,300 to salary, 270 to dividends.
    expect(
      allocatePersonalAllowance(
        input({ nonSavings: 50000, dividends: 10000, personalSavingsAllowance: 500 }),
      ),
    ).toEqual({ onNonSavings: 12300, onSavings: 0, onDividends: 270 });
  });

  it("follows the basic rate limit when Gift Aid extends it", () => {
    // As above with 1,000 of grossed-up Gift Aid: the basic rate limit is 38,700.
    // x moved: salary 37,430 + x; dividend allowance on [37,430 + x, 37,930 + x].
    // x from 0 to 770: the top of the dividend allowance is below 38,700, so each pound moves a
    //   10.75% slice into the nil band and costs 20%: +9.25% x 770 = +71.225.
    // x from 770 to 1,270: the slice saved is at 35.75%: -15.75% x 500 = -78.75.
    // Net at x = 1,270: -7.525, the lowest (beyond, the salary pays 40%). Today (x = 0):
    //   7,486 + 770 x 10.75% + 8,730 x 35.75% = 7,486 + 82.775 + 3,120.975 = 10,689.75.
    // At x = 1,270: 38,700 x 20% = 7,740; 8,230 x 35.75% = 2,942.225; total 10,682.225.
    // Without the extension in the edge list the move to 38,700 would be missed, and the move
    // to 37,700 costs more than today (10,714.725).
    expect(
      allocatePersonalAllowance(
        input({
          nonSavings: 50000,
          dividends: 10000,
          personalSavingsAllowance: 500,
          bandExtension: 1000,
        }),
      ),
    ).toEqual({ onNonSavings: 11300, onSavings: 0, onDividends: 1270 });
  });

  it("follows the basic rate limit when relief-at-source contributions extend it", () => {
    // Salary 50,000, interest 10,000, 2,000 of grossed-up relief-at-source contributions: basic
    // rate limit 39,700. Taxable 47,430: PSA 500. x moved off salary: salary 37,430 + x; PSA
    // band [37,430 + x, 37,930 + x].
    // x from 0 to 1,770: the PSA top stays at or below 39,700, so the slice saved is at 20% and
    //   the salary costs 20%: no change.
    // x from 1,770 to 2,270: the slice saved is at 40%, the salary costs 20%: -20% x 500 = -100.
    // Beyond 2,270 the salary pays 40% and each pound saves 40%: a tie, so the move that keeps
    //   the most on salary is 2,270.
    // Today: 7,486 + 1,770 x 20% + 7,730 x 40% = 7,486 + 354 + 3,092 = 10,932.
    // At x = 2,270: 39,700 x 20% = 7,940; 7,230 x 40% = 2,892; total 10,832.
    expect(
      allocatePersonalAllowance(
        input({
          nonSavings: 50000,
          savings: 10000,
          personalSavingsAllowance: 500,
          bandExtension: 2000,
        }),
      ),
    ).toEqual({ onNonSavings: 10300, onSavings: 2270, onDividends: 0 });
  });

  it("follows the extended Scottish limits for Scottish salary", () => {
    // Scotland 2026/27: Scottish higher rate 42% from 31,092. Gift Aid of 10,000 (grossed up)
    // lifts every Scottish limit from the basic band's top upwards by 10,000, so 42% starts at
    // 41,092; the UK basic rate limit for dividends becomes 47,700.
    // Salary 50,000, dividends 10,000: taxable 47,430, PSA 500 (not used).
    // x moved off salary: salary 37,430 + x pays 21% (Scottish intermediate band, extended to
    // 41,092); the dividend allowance [37,430 + x, 37,930 + x] is below 47,700, so each pound
    // saves 10.75%. 21% > 10.75%: no move.
    expect(
      allocatePersonalAllowance(
        input({
          region: "SCOTLAND",
          nonSavings: 50000,
          dividends: 10000,
          personalSavingsAllowance: 500,
          bandExtension: 10000,
        }),
      ),
    ).toEqual({ onNonSavings: 12570, onSavings: 0, onDividends: 0 });
  });

  it("keeps the allowance off interest the starting rate already covers", () => {
    // Step A case 2 shape: non-savings 10,000, interest 6,000, dividends 6,000. Taxable 9,430:
    // PSA 1,000. With 10,000 on non-savings, the 6,000 of interest is covered by the 5,000
    // starting rate and the 1,000 PSA, so the other 2,570 goes to dividends:
    // dividends 3,430 - 500 = 2,930 x 10.75% = 314.975 (today: 591.25).
    expect(
      allocatePersonalAllowance(input({ nonSavings: 10000, savings: 6000, dividends: 6000 })),
    ).toEqual({ onNonSavings: 10000, onSavings: 0, onDividends: 2570 });
  });

  it("does the same for a Scottish taxpayer: savings and dividends use UK bands", () => {
    // Same income in Scotland: no non-savings tax either way, and the starting rate and the PSA
    // are UK rules (ITA 2007 s.11A, s.12B(8)), so the answer is the same (step A case 6).
    expect(
      allocatePersonalAllowance(
        input({ region: "SCOTLAND", nonSavings: 10000, savings: 6000, dividends: 6000 }),
      ),
    ).toEqual({ onNonSavings: 10000, onSavings: 0, onDividends: 2570 });
  });

  it("does not move allowance off Scottish salary at 42% (step A case 9)", () => {
    // Salary 48,000, dividends 10,000, Scotland. Salary taxable 35,430 sits in the Scottish higher
    // band (31,092 to 62,430 at 42%); moving allowance would cost 42% to save at most 35.75%.
    expect(
      allocatePersonalAllowance(
        input({
          region: "SCOTLAND",
          nonSavings: 48000,
          dividends: 10000,
          personalSavingsAllowance: 500,
        }),
      ),
    ).toEqual({ onNonSavings: 12570, onSavings: 0, onDividends: 0 });
  });

  it("moves allowance from interest to dividends only up to the nil bands", () => {
    // No other income; interest 4,000, dividends 20,000. Taxable 11,430: PSA 1,000. The interest
    // is inside the 5,000 starting rate, so all 12,570 goes to dividends.
    expect(allocatePersonalAllowance(input({ savings: 4000, dividends: 20000 }))).toEqual({
      onNonSavings: 0,
      onSavings: 0,
      onDividends: 12570,
    });
    // Interest 8,000, dividends 20,000: taxable 15,430, PSA 1,000. 6,000 of interest is nil-rated
    // (starting rate and PSA), so 2,000 of allowance covers the rest and 10,570 goes to dividends.
    expect(allocatePersonalAllowance(input({ savings: 8000, dividends: 20000 }))).toEqual({
      onNonSavings: 0,
      onSavings: 2000,
      onDividends: 10570,
    });
  });

  it("moves allowance from interest to dividends until the interest reaches the basic rate limit", () => {
    // Scotland (savings and dividends use UK bands, so the Scottish limits do not apply), no
    // other income; interest 50,000, dividends 10,000. Taxable 47,430: PSA 500.
    // Today: 12,570 against the interest. Interest 0 to 5,000 starting rate, 5,000 to 5,500 PSA,
    //   5,500 to 37,430 at 20% = 6,386. Dividend allowance on 37,430 to 37,930; 9,500 at 35.75%
    //   = 3,396.25. Total 9,782.25.
    // x moved from interest to dividends: the interest top rises to 37,430 + x (+20% a pound
    //   while it stays under 37,700); the dividend allowance moves up, so a pound taxed at 35.75%
    //   falls into it (-35.75%). Net -15.75% a pound until x = 270; beyond, interest pays 40%.
    // Lowest: 12,300 to interest, 270 to dividends: 9,782.25 - 270 x 15.75% = 9,739.725.
    expect(
      allocatePersonalAllowance(
        input({
          region: "SCOTLAND",
          savings: 50000,
          dividends: 10000,
          personalSavingsAllowance: 500,
        }),
      ),
    ).toEqual({ onNonSavings: 0, onSavings: 12300, onDividends: 270 });
  });

  it("moves allowance off property until the dividends sit wholly in their allowance (3A)", () => {
    // 2022/23 (dividend allowance 2,000; 8.75% ordinary, 33.75% upper), 2,000 of grossed-up Gift
    // Aid: basic rate limit 39,700. Salary 11,000 (other income first) and property 34,000:
    // non-savings 45,000; interest 5,000; dividends 3,000. Taxable 40,430: PSA 500.
    // The salary takes 11,000; 1,570 may move.
    // Today: non-savings 32,430 x 20% = 6,486; interest: PSA to 32,930, 4,500 x 20% = 900;
    //   dividend allowance 37,430 to 39,430; 270 x 8.75% = 23.625 and 730 x 33.75% = 246.375.
    //   Total 7,656.
    // x moved from property to dividends: non-savings +20% a pound; the interest only shifts up
    //   (still 20%); the dividend allowance moves up 1 a pound. While x <= 270 the pound it
    //   covers is at 8.75%: a cost. From 270 to 1,000 it covers 33.75%: total 7,723.50 -
    //   13.75% x, which at x = 1,000 is 7,586 (the dividends are then all in their allowance).
    //   Beyond 1,000 nothing is saved. Moving allowance to the interest instead is 20% against
    //   20%: no gain. So 11,570 / 0 / 1,000.
    expect(
      allocatePersonalAllowance(
        input({
          rules: getUkTaxYearRules("2022/23"),
          nonSavings: 45000,
          savings: 5000,
          dividends: 3000,
          personalSavingsAllowance: 500,
          bandExtension: 2000,
          otherIncomeFirst: 11000,
        }),
      ),
    ).toEqual({ onNonSavings: 11570, onSavings: 0, onDividends: 1000 });
  });

  it("keeps today's order on an exact tie at a half penny", () => {
    // Salary 21,158, interest 9,054, dividends 14,374. Taxable 32,016: basic rate, PSA 1,000.
    // Today: salary 8,588 x 20% = 1,717.60; interest above the PSA 8,054 x 20% = 1,610.80;
    //   dividends 14,374 - 500 = 13,874 x 10.75% = 1,491.455. Total 4,819.855.
    // Moving 8,054 to the interest: salary 16,642 x 20% = 3,328.40; interest 1,000, all in the
    //   PSA; dividends unchanged 1,491.455. Total 4,819.855: equal (20% against 20%), so nothing
    //   moves, though float sums can put the two half pennies either side of the rounding point.
    expect(
      allocatePersonalAllowance(input({ nonSavings: 21158, savings: 9054, dividends: 14374 })),
    ).toEqual({ onNonSavings: 12570, onSavings: 0, onDividends: 0 });
  });

  it("keeps today's order on an exact Scottish tie with Gift Aid", () => {
    // Scotland 2020/21, salary 18,395, interest 8,886, dividends 19,109, 6,455 of grossed-up Gift
    // Aid (allowance 12,500; taxable 33,890 is basic rate, PSA 1,000). Salary taxable 5,895
    // sits in the Scottish 20% band, extended by 6,455; the interest above the PSA is at the UK
    // 20% basic rate. Moving allowance from salary to interest is 20% against 20%: the totals
    // are equal (4,018.525 both ways), so nothing moves.
    expect(
      allocatePersonalAllowance(
        input({
          rules: getUkTaxYearRules("2020/21"),
          region: "SCOTLAND",
          allowance: 12500,
          nonSavings: 18395,
          savings: 8886,
          dividends: 19109,
          bandExtension: 6455,
        }),
      ),
    ).toEqual({ onNonSavings: 12500, onSavings: 0, onDividends: 0 });
  });

  it("on a tie keeps the most on non-savings, then savings", () => {
    // Salary 50,000, interest 3,000. Taxable 40,430: PSA 500. x moved: salary 37,430 + x;
    // interest taxed above the PSA band at 40% throughout.
    // x from 0 to 270: salary +20%, interest -40%: -20% x 270 = -54.
    // x from 270 to 2,500: salary +40%, interest -40%: a tie (step A case 5, corrected range).
    // So the lowest allocation closest to today's is 270 moved: 12,300 and 270.
    expect(
      allocatePersonalAllowance(
        input({ nonSavings: 50000, savings: 3000, personalSavingsAllowance: 500 }),
      ),
    ).toEqual({ onNonSavings: 12300, onSavings: 270, onDividends: 0 });
  });

  it("on a tie between savings and dividends keeps savings first", () => {
    // Salary 20,000, interest 2,000, dividends 2,000. Taxable 11,430 is basic rate: PSA 1,000.
    // Salary taxable 7,430: no starting rate. Interest: 1,000 in the PSA, 1,000 at 20% = 200.
    // Dividends: 500 allowance, 1,500 at 10.75% = 161.25. Moving allowance off salary costs 20%
    // and saves 20% on interest (a tie) or 10.75% on dividends (worse), so nothing moves.
    expect(
      allocatePersonalAllowance(input({ nonSavings: 20000, savings: 2000, dividends: 2000 })),
    ).toEqual({ onNonSavings: 12570, onSavings: 0, onDividends: 0 });
  });

  describe("s.25(3A): allowance against other income first (2027/28 on)", () => {
    // These use 2026/27 rates and set the rule with the explicit input, to test the mechanism on
    // its own. The 2027/28 figures are tested through calculateUKTax in
    // tax-calculator.allowance-order.test.ts.
    it("throws for a 2027/28 call that leaves out the other income, never guessing it", () => {
      expect(() =>
        allocatePersonalAllowance({
          ...input({ nonSavings: 50000, savings: 0, dividends: 10000 }),
          rules: getUkTaxYearRules("2027/28"),
        }),
      ).toThrow(/otherIncomeFirst/);
    });
    it("keeps the whole allowance on other income that is large enough (step A case 3b)", () => {
      // Salary 50,000 is other income; it takes the whole 12,570 before savings or dividends.
      expect(
        allocatePersonalAllowance(
          input({
            nonSavings: 50000,
            dividends: 10000,
            personalSavingsAllowance: 500,
            otherIncomeFirst: 50000,
          }),
        ),
      ).toEqual({ onNonSavings: 12570, onSavings: 0, onDividends: 0 });
    });

    it("optimises only what is left after other income", () => {
      // Non-savings 50,000 of which 12,400 is other income and the rest property. The other
      // income takes 12,400; only 170 is free. Each pound moved to dividends saves 35.75% and
      // costs 20% (as in case 3a), so all 170 moves: 12,400 and 170.
      expect(
        allocatePersonalAllowance(
          input({
            nonSavings: 50000,
            dividends: 10000,
            personalSavingsAllowance: 500,
            otherIncomeFirst: 12400,
          }),
        ),
      ).toEqual({ onNonSavings: 12400, onSavings: 0, onDividends: 170 });
    });

    it("on a tie that runs to the other-income limit keeps the move closest to today's", () => {
      // Salary 11,000 (other income) and property 39,000: non-savings 50,000; interest 10,000.
      // Taxable 47,430: PSA 500. The salary takes 11,000; 1,570 is free. x moved off the
      // property onto the interest (as in case 4): x from 0 to 270 saves 20% a pound (the
      // non-savings income reaches 37,700); x from 270 to 1,570 is a tie (40% against 40%), and
      // the tie ends at the limit the salary sets. The move closest to today's is 270.
      expect(
        allocatePersonalAllowance(
          input({
            nonSavings: 50000,
            savings: 10000,
            personalSavingsAllowance: 500,
            otherIncomeFirst: 11000,
          }),
        ),
      ).toEqual({ onNonSavings: 12300, onSavings: 270, onDividends: 0 });
    });

    it("leaves the choice open when other income is small", () => {
      // Other income 5,000: it takes 5,000; the remaining 7,570 may come off the property
      // income, so the answer is case 3a's.
      expect(
        allocatePersonalAllowance(
          input({
            nonSavings: 50000,
            dividends: 10000,
            personalSavingsAllowance: 500,
            otherIncomeFirst: 5000,
          }),
        ),
      ).toEqual({ onNonSavings: 12300, onSavings: 0, onDividends: 270 });
    });
  });
});

describe("allowanceGoesToOtherIncomeFirst", () => {
  it("is off for every supported year before 2027/28", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      if (Number(year.slice(0, 4)) >= 2027) continue;
      expect(allowanceGoesToOtherIncomeFirst(getUkTaxYearRules(year)), year).toBe(false);
    }
  });

  it("is on from 2027/28 (ITA 2007 s.25(3A), inserted by FA 2026 s.6)", () => {
    // 2027/28 is not a supported year on this branch, so only the year is set here.
    const as = (year: string) => ({ ...R2627, year }) as unknown as UkTaxYearRules;
    expect(allowanceGoesToOtherIncomeFirst(as("2027/28"))).toBe(true);
    expect(allowanceGoesToOtherIncomeFirst(as("2028/29"))).toBe(true);
    expect(allowanceGoesToOtherIncomeFirst(as("2026/27"))).toBe(false);
  });
});

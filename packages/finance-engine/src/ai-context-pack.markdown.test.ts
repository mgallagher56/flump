import { describe, expect, it } from "vitest";
import {
  buildFlumpAiContextPack,
  type ContextPackUkTaxResult,
  type FlumpAiContextPack,
  formatAiContextPackMarkdown,
} from "./ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { DEFAULT_FINANCIAL_BASELINE } from "./profile.js";
import type {
  AvalancheVsSnowballComparison,
  PromoCliffAlert,
  StudentLoanEvaluationResult,
} from "./types.js";

// 19 November 2026, local noon.
const asOf = new Date(2026, 10, 19, 12);

/**
 * A pack with no accounts, budget, debts or salary (a salary of 0 is "not saved", so no salary
 * tax is worked out). Each test sets only the fields it formats, so every figure in an assertion
 * is one the test itself put in.
 */
function emptyPack(): FlumpAiContextPack {
  return buildFlumpAiContextPack(
    {
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 0, userId: "u" },
    },
    { asOf },
  );
}

function withDebt(
  pack: FlumpAiContextPack,
  debt: Partial<FlumpAiContextPack["debtSummary"]>,
): FlumpAiContextPack {
  return { ...pack, debtSummary: { ...pack.debtSummary, ...debt } };
}

/** The text between two headings, trimmed. */
function section(md: string, from: string, to: string): string {
  const start = md.indexOf(from);
  const end = md.indexOf(to, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return md.slice(start + from.length, end).trim();
}

const debts = (pack: FlumpAiContextPack) =>
  section(formatAiContextPackMarkdown(pack), "## 3. Debts", "## 4. Budget");

describe("context pack Markdown: header and observations", () => {
  it("says whether the pack is anonymised", () => {
    const pack = emptyPack();
    const yes = formatAiContextPackMarkdown({
      ...pack,
      metadata: { ...pack.metadata, isAnonymized: true },
    });
    const no = formatAiContextPackMarkdown({
      ...pack,
      metadata: { ...pack.metadata, isAnonymized: false },
    });
    expect(yes).toContain("| Anonymised: yes |");
    expect(no).toContain("| Anonymised: no |");
  });

  it("lists each observation on its own line", () => {
    const md = formatAiContextPackMarkdown({ ...emptyPack(), observations: ["First.", "Second."] });
    expect(section(md, "- **Observations:**", "## 2. Net worth")).toBe("* First.\n  * Second.");
  });

  it("says None when there are no observations", () => {
    const md = formatAiContextPackMarkdown({ ...emptyPack(), observations: [] });
    expect(section(md, "- **Observations:**", "## 2. Net worth")).toBe("* None.");
  });
});

describe("context pack Markdown: net worth", () => {
  const withPortfolio = (p: Partial<FlumpAiContextPack["portfolio"]>) => {
    const pack = emptyPack();
    return formatAiContextPackMarkdown({ ...pack, portfolio: { ...pack.portfolio, ...p } });
  };

  it("puts nothing between the net worth and what you own when nothing is left out", () => {
    const md = withPortfolio({ netWorthLeavesOut: [] });
    expect(md).toContain("- **Net worth:** £0\n- **What you own:**");
    expect(md).not.toContain("Home value");
  });

  it("lists what is left out, then the missing home value, one line each", () => {
    const md = withPortfolio({ netWorthLeavesOut: ["studentLoan", "homeValueMissing"] });
    expect(section(md, "- **Net worth:** £0", "- **What you own:**")).toBe(
      "- **Not counted in net worth (the user's choice):** student loan\n" +
        "- **Home value:** not saved, so the mortgage counts without it",
    );
  });

  it("leaves the home estimate out of what you own when it is 0", () => {
    const md = withPortfolio({
      totalAssets: 50000,
      totalLiquidCash: 5000,
      totalInvestments: 10000,
      totalPensions: 35000,
      homeEstimate: 0,
      netWorthBasis: { countProperty: true, countStudentLoan: false },
    });
    expect(md).toContain(
      "- **What you own:** £50,000 (cash you can get at quickly: £5,000, investments: £10,000, pensions: £35,000)\n",
    );
  });

  it("adds the home estimate to what you own when property counts", () => {
    const md = withPortfolio({
      totalAssets: 250000,
      totalLiquidCash: 5000,
      totalInvestments: 10000,
      totalPensions: 35000,
      homeEstimate: 200000,
      netWorthBasis: { countProperty: true, countStudentLoan: false },
    });
    expect(md).toContain("pensions: £35,000, Home (your estimate): £200,000)\n- **What you owe:**");
  });

  it("shows only debts in what you owe when neither property nor student loans count", () => {
    const md = withPortfolio({
      totalLiabilities: 3000,
      totalConsumerDebt: 3000,
      totalMortgageBalance: 170000,
      totalStudentLoans: 7000,
      netWorthBasis: { countProperty: false, countStudentLoan: false },
    });
    expect(md).toContain("- **What you owe:** £3,000 (debts: £3,000)\n");
  });

  it("adds mortgages and student loans to what you owe when both count", () => {
    const md = withPortfolio({
      totalLiabilities: 180000,
      totalConsumerDebt: 3000,
      totalMortgageBalance: 170000,
      totalStudentLoans: 7000,
      netWorthBasis: { countProperty: true, countStudentLoan: true },
    });
    expect(md).toContain(
      "- **What you owe:** £180,000 (debts: £3,000, mortgages: £170,000, student loans: £7,000)\n",
    );
  });

  it("states a known savings rate as AER", () => {
    expect(withPortfolio({ weightedSavingsRate: 4.25 })).toContain(
      "- **Average savings rate:** 4.25% AER",
    );
  });
});

describe("context pack Markdown: accounts", () => {
  it("lists each account on its own line, with its category in capitals and any rate", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u" },
        accounts: [
          { id: "a", name: "Everyday", type: "Current", balance: 0 },
          { id: "b", name: "Rainy day", type: "Saving", balance: -50, interestRate: 4.5 },
          { id: "c", name: "Spare", type: "Current", balance: 1500 },
        ],
      },
      { anonymizeInstitutions: false, asOf },
    );
    // A £0 current account is not overdrawn, and only a cash account below £0 is ever labelled
    // overdrawn, so the negative saving shows its sign with no label.
    expect(section(formatAiContextPackMarkdown(pack), "### Accounts:", "## 3. Debts")).toBe(
      "- Everyday (CASH): £0\n- Rainy day (SAVINGS): -£50 @ 4.5%\n- Spare (CASH): £1,500",
    );
  });
});

describe("context pack Markdown: debts", () => {
  it("shows only the debt balance when there is no debt", () => {
    expect(debts(emptyPack())).toBe("- **Debt balance:** £0");
  });

  it("states the minimums, says when some are estimates, and why there is no date", () => {
    const pack = withDebt(emptyPack(), {
      totalStartingDebtGbp: 2000,
      monthlyMinimumsGbp: 1234.5,
      monthlyMinimumsEstimated: true,
      debtFreeDate: null,
      debtFreeDateUnknownReason: "aprUnknown",
    });
    expect(debts(pack)).toBe(
      "- **Debt balance:** £2,000\n" +
        "- **Minimum payments, a month:** £1,234.5 (some are estimates)\n" +
        "- **Debt-free date on minimum payments:** not shown, because an interest rate (APR) is not saved for every debt",
    );
  });

  it("says the minimums do not clear the debts when that is the reason", () => {
    const pack = withDebt(emptyPack(), {
      totalStartingDebtGbp: 10000,
      monthlyMinimumsGbp: 10,
      monthlyMinimumsEstimated: false,
      debtFreeDate: null,
      debtFreeDateUnknownReason: "notClearedOnMinimums",
    });
    expect(debts(pack)).toBe(
      "- **Debt balance:** £10,000\n" +
        "- **Minimum payments, a month:** £10\n" +
        "- **Debt-free date on minimum payments:** not shown, because minimum payments do not clear the debts within the 30 years the estimate covers",
    );
  });

  it("states the date, the interest and the smallest-balance-first comparison", () => {
    const comparison = {
      snowball: { debtFreeDate: "December 2027", totalInterest: 160.5 },
    } as unknown as AvalancheVsSnowballComparison;
    const pack = withDebt(emptyPack(), {
      totalStartingDebtGbp: 1200,
      monthlyMinimumsGbp: 100,
      monthlyMinimumsEstimated: false,
      debtFreeDate: "November 2027",
      debtFreeDateUnknownReason: null,
      totalInterestGbp: 150.25,
      avalancheVsSnowballComparison: comparison,
    });
    expect(debts(pack)).toBe(
      "- **Debt balance:** £1,200\n" +
        "- **Minimum payments, a month:** £100\n" +
        "- **Debt-free date on minimum payments (highest rate first):** November 2027, total interest £150.25\n" +
        "- **Smallest balance first, on minimum payments:** debt-free date December 2027, total interest £160.5",
    );
  });

  it("lists each 0% deal that ends, with the payment that clears it first", () => {
    const alert = (
      debtName: string,
      required: number,
      revertApr: number,
      revertAprAssumed: boolean,
    ): PromoCliffAlert => ({
      debtId: debtName,
      debtName,
      promoExpiryDate: "2027-05-19",
      projectedPayoffDate: "May 2028",
      projectedBalanceAtExpiryGbp: 0,
      revertApr,
      revertAprAssumed,
      requiredMonthlyToClearBeforeCliff: required,
      hasCliffRisk: true,
    });
    const pack = withDebt(emptyPack(), {
      promoCliffAlerts: [alert("Card 1", 200, 24.9, true), alert("Card 2", 75.5, 19.9, false)],
    });
    // An assumed rate says so; a saved one is stated plainly.
    expect(debts(pack)).toBe(
      "- **Debt balance:** £0\n\n" +
        "### When the 0% deal ends:\n" +
        "- Card 1: the 0% deal ends 2027-05-19, then 24.9% APR (assumed: no rate for after the deal is saved). Monthly payment that pays it off before then: £200\n" +
        "- Card 2: the 0% deal ends 2027-05-19, then 19.9% APR. Monthly payment that pays it off before then: £75.5",
    );
  });

  it("states the student loan check with the saved balance and the plan in capitals", () => {
    const evaluation = {
      plan: "plan2",
      projectedOutcome: "written_off_first",
      reasoning: "Detail text.",
    } as StudentLoanEvaluationResult;
    const pack = withDebt(
      {
        ...emptyPack(),
        portfolio: { ...emptyPack().portfolio, totalStudentLoans: 20000 },
      },
      { studentLoanEvaluation: evaluation },
    );
    expect(debts(pack)).toBe(
      "- **Debt balance:** £0\n\n\n" +
        "### Student loan:\n" +
        "- Balance saved: £20,000\n" +
        "- Plan: PLAN2 | Projected outcome: written_off_first\n" +
        "- Detail: Detail text.",
    );
  });

  it("names a saved plan with no balance, and says nothing for no plan or NONE", () => {
    const pack = emptyPack();
    const withPlan = (plan: unknown) =>
      debts({ ...pack, baseline: { ...pack.baseline, studentLoanPlan: plan as "NONE" } });
    expect(withPlan("PLAN_2")).toBe(
      "- **Debt balance:** £0\n\n\n" +
        "### Student loan:\n" +
        "- Plan: PLAN_2 | No student loan balance is saved, so no repayment estimate is shown.",
    );
    expect(withPlan("NONE")).toBe("- **Debt balance:** £0");
    expect(withPlan(undefined)).toBe("- **Debt balance:** £0");
  });
});

describe("context pack Markdown: budget", () => {
  const budget = (b: Partial<FlumpAiContextPack["budgetSummary"]>) => {
    const pack = emptyPack();
    return section(
      formatAiContextPackMarkdown({ ...pack, budgetSummary: { ...pack.budgetSummary, ...b } }),
      "## 4. Budget",
      "## 5. Tax",
    );
  };

  it("says Not set for unknown figures", () => {
    const text = budget({
      monthlyIncome: null,
      essentialBillsMonthly: null,
      monthlySurplus: null,
      safeToSpend: null,
    });
    expect(text).toContain("- **Income in your budget, a month:** Not set\n");
    expect(text).toContain("- **Essential spending, a month:** Not set\n");
    expect(text).toContain("- **Safe to spend:** Not set\n");
    expect(text).toContain("- **Income minus spending, a month:** Not set");
  });

  it("shows known figures in pounds, with the minus sign before the pound sign", () => {
    const text = budget({
      monthlyIncome: 2400,
      essentialBillsMonthly: 1000,
      monthlySurplus: -200,
      safeToSpend: {
        weeklyAllowance: 85.5,
        dailyAllowance: 12.2,
        monthlyDiscretionary: 370,
        fixedCommitments: 1000,
      },
    });
    expect(text).toContain("- **Income in your budget, a month:** £2,400\n");
    expect(text).toContain("- **Essential spending, a month:** £1,000\n");
    expect(text).toContain("- **Safe to spend:** £85.5 a week\n");
    expect(text).toContain("- **Income minus spending, a month:** -£200");
  });

  it("shows a zero figure as £0, with no minus sign", () => {
    expect(budget({ monthlySurplus: 0 })).toContain("- **Income minus spending, a month:** £0");
  });
});

describe("context pack Markdown: Self Assessment line", () => {
  it("ends after the ISA line when there are no tax records", () => {
    const md = formatAiContextPackMarkdown({
      ...emptyPack(),
      taxSummary: { ...emptyPack().taxSummary, selfAssessmentLedgerSummary: undefined },
    });
    expect(md).not.toContain("Self Assessment estimate");
    expect(md.endsWith("(no monthly amount is saved into an ISA)\n")).toBe(true);
  });

  it("falls back to the no-untaxed-income line when no missing fact is named", () => {
    const pack = emptyPack();
    const withLedger = (notSet: []) =>
      formatAiContextPackMarkdown({
        ...pack,
        taxSummary: { ...pack.taxSummary, selfAssessmentLedgerSummary: { notSet } },
      });
    const named = formatAiContextPackMarkdown({
      ...pack,
      taxSummary: {
        ...pack.taxSummary,
        selfAssessmentLedgerSummary: { notSet: ["untaxedIncomeRecords"] },
      },
    });
    expect(withLedger([])).not.toContain("undefined");
    expect(withLedger([])).toBe(named);
  });
});

describe("context pack Markdown: salary tax lines", () => {
  // A saved salary, so the pack works out salary tax. The tests below replace only the flags and
  // the figures they print, and assert those, never a figure the tax calculation worked out.
  const salaried = buildFlumpAiContextPack(
    {
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 50000, userId: "u" },
    },
    { asOf },
  );
  const withTax = (change: (tx: ContextPackUkTaxResult) => ContextPackUkTaxResult) =>
    formatAiContextPackMarkdown({
      ...salaried,
      taxSummary: {
        ...salaried.taxSummary,
        ukTaxCalculation: change(salaried.taxSummary.ukTaxCalculation as ContextPackUkTaxResult),
      },
    });

  it("states each assumption on its own line before the adjusted net income", () => {
    const md = withTax((tx) => ({ ...tx, assumptions: ["First.", "Second."] }));
    expect(md).toContain(
      "- **Assumption:** First.\n- **Assumption:** Second.\n- **Adjusted net income:**",
    );
  });

  it("says No for the £100,000 band and adds no contribution lines", () => {
    const md = withTax((tx) => ({ ...tx, taxTrap: { ...tx.taxTrap, isInTaxTrap: false } }));
    expect(md).toContain(
      "in the £100,000 to £125,140 band:** No\n\n- **Pension annual allowance unused",
    );
  });

  it("says Yes for the £100,000 band and states the contribution figures it carries", () => {
    const md = withTax((tx) => ({
      ...tx,
      taxTrap: {
        ...tx.taxTrap,
        isInTaxTrap: true,
        contributionRequiredToEscapeGbp: 5000,
        estimatedTaxSavedByEscapingGbp: 2000,
      },
    }));
    expect(md).toContain(
      "band:** Yes (the Personal Allowance reduces in this band)\n" +
        "- **Contribution that brings adjusted net income to £100,000:** £5,000\n" +
        "- **Estimated tax difference at that contribution:** £2,000\n" +
        "- **Pension annual allowance unused",
    );
  });
});

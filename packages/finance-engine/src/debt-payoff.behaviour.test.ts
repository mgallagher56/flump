import { describe, expect, it } from "vitest";
import {
  analyzePromoCliff,
  bridgePayoffMonth,
  calculateAvalanche,
  calculateCarFinanceBalloon,
  calculateDebtSchedule,
  calculateDebtToWealthBridge,
  calculateOverdraftCost,
  calculateSnowball,
  calculateZeroPercentCliff,
  compareAvalancheAndSnowball,
  evaluateUkStudentLoan,
  filterConsumerDebts,
  normalizeDebtItem,
  projectCrossoverWealth,
  sortDebtsByStrategy,
} from "./debt-payoff.js";
import type { DebtItem, DebtToWealthBridgePoint } from "./types.js";

// Every expected figure below is worked by hand, month by month, with round numbers.
// Interest each month is the balance times APR / 12, rounded to the penny, then the
// minimum is paid, then any budget left over goes to the strategy's first debt.

const REF = new Date(Date.UTC(2026, 0, 15)); // 15 January 2026, 00:00 UTC

function debt(
  id: string,
  name: string,
  balanceGbp: number,
  interestRateApr: number,
  minimumPaymentGbp: number,
  extra: Partial<DebtItem> = {},
): DebtItem {
  return { id, name, balanceGbp, interestRateApr, minimumPaymentGbp, ...extra };
}

describe("normalizeDebtItem and filterConsumerDebts", () => {
  it("gives a debt with no type the type 'other'", () => {
    expect(normalizeDebtItem({ id: "x", name: "X" }).debtType).toBe("other");
  });

  it("treats an id containing STUDENT_LOAN in capitals as a student loan", () => {
    const { consumerDebts, excludedStudentLoans } = filterConsumerDebts([
      debt("STUDENT_LOAN_1", "Loan", 20000, 6, 0, { debtType: "other" }),
    ]);
    expect(consumerDebts).toHaveLength(0);
    expect(excludedStudentLoans.map((d) => d.id)).toEqual(["STUDENT_LOAN_1"]);
  });
});

describe("sortDebtsByStrategy", () => {
  it("puts a known APR before an unknown one even when the unknown one has a higher stored APR", () => {
    const sorted = sortDebtsByStrategy(
      [
        { id: "known", name: "K", balance: 100, apr: 10 },
        { id: "unknown", name: "U", balance: 100, apr: 50, aprKnown: false },
      ],
      "AVALANCHE",
    );
    expect(sorted.map((d) => d.id)).toEqual(["known", "unknown"]);
  });

  it("breaks an avalanche APR tie by the smaller balance", () => {
    const sorted = sortDebtsByStrategy(
      [
        { id: "big", name: "B", balance: 500, apr: 20 },
        { id: "small", name: "S", balance: 100, apr: 20 },
      ],
      "AVALANCHE",
    );
    expect(sorted.map((d) => d.id)).toEqual(["small", "big"]);
  });

  it("orders snowball by balance even when APRs point the other way", () => {
    const sorted = sortDebtsByStrategy(
      [
        { id: "big-high", name: "B", balance: 200, apr: 30 },
        { id: "small-low", name: "S", balance: 100, apr: 10 },
      ],
      "SNOWBALL",
    );
    expect(sorted.map((d) => d.id)).toEqual(["small-low", "big-high"]);
  });

  it("breaks a snowball balance tie by the higher APR", () => {
    const sorted = sortDebtsByStrategy(
      [
        { id: "low", name: "L", balance: 100, apr: 10 },
        { id: "high", name: "H", balance: 100, apr: 30 },
      ],
      "SNOWBALL",
    );
    expect(sorted.map((d) => d.id)).toEqual(["high", "low"]);
  });
});

describe("analyzePromoCliff", () => {
  // Expiry 16 July 2026 is 182 days after 15 January 2026 (16+28+31+30+31+30+16).
  // 182 / 30.4375 = 5.98, which rounds to 6 months until the cliff.
  const promo = debt("bt", "Balance transfer", 1200, 0, 50, {
    promoAprExpiryDate: "2026-07-16",
    revertApr: 29.9,
  });

  it("returns null for a debt with no promotional expiry", () => {
    expect(analyzePromoCliff(debt("c", "Card", 1200, 20, 50), 6, REF)).toBeNull();
  });

  it("works out the monthly payment that clears the balance before the cliff", () => {
    const alert = analyzePromoCliff(promo, 6, REF);
    // 1200 / 6 months = 200 a month.
    expect(alert?.requiredMonthlyToClearBeforeCliff).toBe(200);
    // Paying the 50 minimum for 6 months clears 300, leaving 1200 - 300 = 900.
    expect(alert?.projectedBalanceAtExpiryGbp).toBe(900);
    expect(alert?.revertApr).toBe(29.9);
    // 15 January plus 6 months is 15 July 2026.
    expect(alert?.projectedPayoffDate).toBe("July 2026");
  });

  it("flags cliff risk only when payoff comes after the cliff month", () => {
    expect(analyzePromoCliff(promo, 6, REF)?.hasCliffRisk).toBe(false);
    expect(analyzePromoCliff(promo, 7, REF)?.hasCliffRisk).toBe(true);
  });

  it("uses a floor of 5 a month when the stored minimum is lower", () => {
    const lowMin = { ...promo, minimumPaymentGbp: 2 };
    // 1200 - 5 * 6 = 1170.
    expect(analyzePromoCliff(lowMin, 6, REF)?.projectedBalanceAtExpiryGbp).toBe(1170);
  });
});

describe("projectCrossoverWealth", () => {
  it("compounds monthly at the twelfth root of the annual return", () => {
    // 6% a year: 1.06^(1/12) = exp(ln 1.06 / 12) = exp(0.0048557) = 1.00486755.
    // Month 1: 1,000,000 * 1.00486755 = 1,004,867.55, rounded to 1,004,868.
    const [first] = projectCrossoverWealth(1_000_000, REF, 6);
    expect(first?.projectedWealthGbp).toBe(1_004_868);
    // Interest earned = 1,004,867.55 - 1,000,000 = 4,867.55, rounded to 4,868.
    expect(first?.interestEarnedGbp).toBe(4_868);
  });

  it("labels the first month as the month after the debt-free date", () => {
    const projection = projectCrossoverWealth(100, REF, 0);
    expect(projection[0]?.calendarDate).toBe("2026-02");
    expect(projection[11]?.calendarDate).toBe("2027-01");
  });
});

describe("calculateDebtSchedule month by month", () => {
  it("records interest, minimum and balances for one debt until it clears", () => {
    // 300 at 12% (1% a month), minimum 100:
    // M1: 300 + 3.00 = 303.00, pay 100 -> 203.00
    // M2: 203 + 2.03 = 205.03, pay 100 -> 105.03
    // M3: 105.03 + 1.05 = 106.08, pay 100 -> 6.08
    // M4: 6.08 + 0.06 = 6.14, pay 6.14 -> 0
    const res = calculateDebtSchedule([debt("d", "Card", 300, 12, 100)], 0, "AVALANCHE", {
      referenceDate: REF,
    });
    expect(res.monthsToPayoff).toBe(4);
    expect(res.totalInterestPaidGbp).toBe(6.14); // 3 + 2.03 + 1.05 + 0.06
    const m1 = res.schedule[0];
    expect(m1?.calendarDate).toBe("2026-02");
    expect(m1?.totalInterestGbp).toBe(3);
    // The principal and payment columns are not asserted for a debt that charges interest:
    // by the rule M1 pays 100, of which 3.00 is interest and 97.00 principal, but the code
    // reports 100 principal, 0 interest on the row and 103 paid in total. Reported to the
    // coordinator as a possible bug (E41 M2); see the triage ledger.
    expect(m1?.remainingDebtGbp).toBe(203);
    expect(m1?.payments).toMatchObject([
      {
        debtId: "d",
        debtName: "Card",
        endingBalanceGbp: 203,
        isPaidOff: false,
      },
    ]);
    const m4 = res.schedule[3];
    expect(m4?.payments[0]?.endingBalanceGbp).toBe(0);
    expect(m4?.payments[0]?.isPaidOff).toBe(true);
    expect(res.firstQuickWinMonth).toBe(4);
  });

  const cardA = debt("a", "Card A", 100, 0, 10);
  const loanB = debt("b", "Loan B", 1000, 12, 50);

  it("avalanche sends the extra budget to the highest APR and stops when it is spent", () => {
    // Budget 10 + 50 + 100 = 160. M1: B interest 10.00 -> 1010.
    // Minimums: A 100 -> 90, B 1010 -> 960, 100 left. Extra to B: 960 -> 860.
    const res = calculateDebtSchedule([cardA, loanB], 100, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    const m1 = res.schedule[0];
    expect(m1?.totalInterestGbp).toBe(10);
    expect(m1?.remainingDebtGbp).toBe(950);
    const a = m1?.payments.find((p) => p.debtId === "a");
    const b = m1?.payments.find((p) => p.debtId === "b");
    expect(a).toMatchObject({ principalPaidGbp: 10, endingBalanceGbp: 90, isPaidOff: false });
    expect(b).toMatchObject({
      endingBalanceGbp: 860,
      isPaidOff: false,
    });
    // Nothing was cleared in the month.
    expect(res.firstQuickWinDebtName).toBeUndefined();
    expect(res.firstQuickWinMonth).toBeUndefined();
  });

  it("snowball clears the smallest balance with the extra and rolls the rest on", () => {
    // M1: B 1010 after interest. Minimums: A -> 90, B -> 960, 100 left.
    // Extra to A: 90 clears it, 10 left goes to B: 960 -> 950.
    // M2: only B. 950 + 9.50 = 959.50, minimum 50 -> 909.50, 110 left -> 799.50.
    const res = calculateDebtSchedule([cardA, loanB], 100, "SNOWBALL", {
      referenceDate: REF,
      maxMonths: 2,
    });
    const m1 = res.schedule[0];
    const a = m1?.payments.find((p) => p.debtId === "a");
    const b = m1?.payments.find((p) => p.debtId === "b");
    expect(a).toMatchObject({ principalPaidGbp: 100, endingBalanceGbp: 0, isPaidOff: true });
    expect(b).toMatchObject({ endingBalanceGbp: 950, isPaidOff: false });
    expect(m1?.remainingDebtGbp).toBe(950);
    expect(res.firstQuickWinDebtName).toBe("Card A");
    expect(res.firstQuickWinMonth).toBe(1);
    expect(res.firstQuickWinDate).toBe("February 2026");

    const m2 = res.schedule[1];
    expect(m2?.totalInterestGbp).toBe(9.5);
    expect(m2?.payments).toHaveLength(1);
    expect(m2?.payments[0]).toMatchObject({
      debtId: "b",
      endingBalanceGbp: 799.5,
    });
  });

  it("counts every pound paid on a 0% debt as principal, minimum and extra alike", () => {
    // 100 at 0%, minimum 10, extra 20, one month. No interest, so the whole payment is principal:
    // minimum 10 -> 90, extra 20 -> 70. Principal 10 + 20 = 30, paid 30, interest 0, left 70.
    const res = calculateDebtSchedule([debt("z", "Zero", 100, 0, 10)], 20, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    const m1 = res.schedule[0];
    expect(m1?.totalInterestGbp).toBe(0);
    expect(m1?.totalPrincipalGbp).toBe(30);
    expect(m1?.totalPaymentsGbp).toBe(30);
    expect(m1?.remainingDebtGbp).toBe(70);
  });

  it("gives payment rows that add up: start + interest charged - paid = end", () => {
    // A statement row must reconcile whichever column shows the interest, so this holds
    // without fixing what the starting balance means. Uses the two-debt snowball case above.
    const res = calculateDebtSchedule([cardA, loanB], 100, "SNOWBALL", {
      referenceDate: REF,
      maxMonths: 2,
    });
    const rows = res.schedule.flatMap((m) => m.payments);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.startingBalanceGbp + row.interestChargedGbp - row.principalPaidGbp).toBeCloseTo(
        row.endingBalanceGbp,
        2,
      ); // toBeCloseTo: penny sums in floating point
    }
  });

  it("counts a debt cleared by its own minimum as the first win and measures saving against no rollover", () => {
    // A 10 at 0% min 10; B 200 at 12% min 50; no extra. Budget 60.
    // Main run (freed minimum rolls to B):
    // M1: B 200 + 2.00 = 202 -> 152; A 10 -> 0 (cleared by its minimum).
    // M2: 152 + 1.52 = 153.52 -> 103.52, freed 10 -> 93.52
    // M3: 93.52 + 0.94 = 94.46 -> 44.46, freed 10 -> 34.46
    // M4: 34.46 + 0.34 = 34.80 -> 0. Interest 2 + 1.52 + 0.94 + 0.34 = 4.80.
    // Baseline (no rollover):
    // M2: 152 -> 103.52; M3: 103.52 + 1.04 = 104.56 -> 54.56;
    // M4: 54.56 + 0.55 = 55.11 -> 5.11; M5: 5.11 + 0.05 = 5.16 -> 0.
    // Interest 2 + 1.52 + 1.04 + 0.55 + 0.05 = 5.16. Saving 5.16 - 4.80 = 0.36.
    const res = calculateDebtSchedule(
      [debt("a", "Card A", 10, 0, 10), debt("b", "Loan B", 200, 12, 50)],
      0,
      "AVALANCHE",
      { referenceDate: REF },
    );
    expect(res.monthsToPayoff).toBe(4);
    expect(res.totalInterestPaidGbp).toBe(4.8);
    expect(res.interestSavedVsMinimumGbp).toBe(0.36);
    expect(res.firstQuickWinDebtName).toBe("Card A");
    expect(res.firstQuickWinMonth).toBe(1);
    const m1 = res.schedule[0];
    expect(m1?.payments.find((p) => p.debtId === "a")?.isPaidOff).toBe(true);
    expect(m1?.payments.find((p) => p.debtId === "b")?.isPaidOff).toBe(false);
  });

  it("switches to the revert APR from the month the promotion expires", () => {
    // 1000 at 0% min 100, reverting to 12% on 15 March 2026.
    // M1 (15 Feb): no interest -> 900.
    // M2 (15 Mar, the expiry day): 900 * 1% = 9.00 -> 909 -> 809.
    // M3 (15 Apr): 809 * 1% = 8.09.
    const res = calculateDebtSchedule(
      [debt("p", "Promo", 1000, 0, 100, { promoAprExpiryDate: "2026-03-15", revertApr: 12 })],
      0,
      "AVALANCHE",
      { referenceDate: REF, maxMonths: 3 },
    );
    expect(res.schedule.map((m) => m.totalInterestGbp)).toEqual([0, 9, 8.09]);
  });

  it("keeps the promotional rate when no revert APR is given", () => {
    const res = calculateDebtSchedule(
      [debt("p", "Promo", 1000, 0, 100, { promoAprExpiryDate: "2026-03-15" })],
      0,
      "AVALANCHE",
      { referenceDate: REF, maxMonths: 3 },
    );
    expect(res.schedule.map((m) => m.totalInterestGbp)).toEqual([0, 0, 0]);
  });

  it("treats a balance under a penny as already cleared", () => {
    const res = calculateDebtSchedule([debt("d", "Card", 0.005, 20, 5)], 0, "AVALANCHE", {
      referenceDate: REF,
    });
    expect(res.monthsToPayoff).toBe(0);
    expect(res.schedule).toEqual([]);
    expect(res.payoffAchievable).toBe(true);
  });
});

describe("calculateDebtSchedule edges and summary fields", () => {
  it("defaults to the avalanche strategy", () => {
    expect(calculateDebtSchedule([debt("d", "Card", 300, 12, 100)]).strategy).toBe("AVALANCHE");
  });

  it("uses the given expected return for the post-debt projection", () => {
    // No debts, 1,000,000 a month at 12%: 1.12^(1/12) = exp(0.1133287 / 12)
    // = exp(0.0094441) = 1.0094888, so month 1 is 1,009,488.80, rounded to 1,009,489.
    const res = calculateDebtSchedule([], 1_000_000, "AVALANCHE", {
      referenceDate: REF,
      expectedIsaAnnualReturnPct: 12,
    });
    expect(res.crossoverProjection[0]?.projectedWealthGbp).toBe(1_009_489);
  });

  it("returns the empty result with the extra budget alone when every balance is zero", () => {
    // The minimum floor of 5 must not be added: the projection invests the 100 extra only.
    const res = calculateDebtSchedule([debt("z", "Paid card", 0, 20, 0)], 100, "AVALANCHE", {
      referenceDate: REF,
      expectedIsaAnnualReturnPct: 0,
    });
    expect(res.monthsToPayoff).toBe(0);
    expect(res.schedule).toEqual([]);
    expect(res.promoCliffAlerts).toEqual([]);
    expect(res.crossoverProjection[0]?.monthlyContributionGbp).toBe(100);
    // 0% return: 60 months of 100 is 6,000.
    expect(res.fiveYearPostDebtWealthGbp).toBe(6000);
  });

  it("dates a promo alert from the month that debt clears, not the whole schedule", () => {
    // Both at 0%, so avalanche orders by balance: promo P (100) first, then B (1000).
    // M1: P pays its 100 minimum and clears; B 1000 -> 900.
    // M2 onwards B gets 200 a month: 700, 500, 300, 100, 0 (cleared in M6).
    // P cleared in month 1, so its projected payoff is 15 February 2026.
    const res = calculateDebtSchedule(
      [
        debt("b", "Loan B", 1000, 0, 100),
        debt("p", "Promo P", 100, 0, 100, { promoAprExpiryDate: "2026-07-16", revertApr: 20 }),
      ],
      0,
      "AVALANCHE",
      { referenceDate: REF },
    );
    expect(res.monthsToPayoff).toBe(6);
    expect(res.promoCliffAlerts).toHaveLength(1);
    const alert = res.promoCliffAlerts[0];
    expect(alert?.debtId).toBe("p");
    expect(alert?.projectedPayoffDate).toBe("February 2026");
    expect(alert?.hasCliffRisk).toBe(false);
    // 6 months to the cliff: 100 / 6 = 16.666..., 16.67.
    expect(alert?.requiredMonthlyToClearBeforeCliff).toBe(16.67);
  });

  it("calls a one-month cap with a falling balance MAX_MONTHS_REACHED", () => {
    // 1000 at 0%, min 100: after one month 900, below the starting 1000.
    const res = calculateDebtSchedule([debt("d", "Card", 1000, 0, 100)], 0, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    expect(res.payoffAchievable).toBe(false);
    expect(res.debtFreeDate).toBeNull();
    expect(res.unachievableReason).toBe("MAX_MONTHS_REACHED");
  });

  it("calls a one-month cap with a rising balance BALANCE_GROWING", () => {
    // 10000 at 24% (2% a month), min 5: 10000 + 200 - 5 = 10195, above 10000.
    const res = calculateDebtSchedule([debt("d", "Card", 10000, 24, 5)], 0, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    expect(res.unachievableReason).toBe("BALANCE_GROWING");
  });

  it("compares the last month with the month before, not the start, once there are two months", () => {
    // 1000 at 0% min 50, reverting to 120% (10% a month) on 15 March.
    // M1: 1000 -> 950. M2: 950 + 95 = 1045 -> 995.
    // 995 is above M1's 950 (growing) though below the starting 1000.
    const res = calculateDebtSchedule(
      [debt("p", "Promo", 1000, 0, 50, { promoAprExpiryDate: "2026-03-15", revertApr: 120 })],
      0,
      "AVALANCHE",
      { referenceDate: REF, maxMonths: 2 },
    );
    expect(res.schedule.map((m) => m.remainingDebtGbp)).toEqual([950, 995]);
    expect(res.unachievableReason).toBe("BALANCE_GROWING");
  });

  it("counts a balance that stays level as growing", () => {
    // 1000 at 6% (0.5% a month) = 5.00 interest, min 5: stays at 1000 each month.
    const res = calculateDebtSchedule([debt("d", "Card", 1000, 6, 5)], 0, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 2,
    });
    expect(res.schedule.map((m) => m.remainingDebtGbp)).toEqual([1000, 1000]);
    expect(res.unachievableReason).toBe("BALANCE_GROWING");
  });
});

describe("calculateAvalanche and calculateSnowball wrappers", () => {
  // Same single debt as above: 4 months, interest 3, 2.03, 1.05, 0.06 = 6.14.
  const single = [debt("d", "Card", 300, 12, 100)];

  for (const [label, fn] of [
    ["calculateAvalanche", calculateAvalanche],
    ["calculateSnowball", calculateSnowball],
  ] as const) {
    it(`${label} reports months, total paid and a per-debt monthly schedule`, () => {
      const res = fn(single, 0);
      expect(res.months).toBe(4);
      expect(res.totalInterest).toBe(6.14);
      // 300 borrowed + 6.14 interest.
      expect(res.totalPaid).toBe(306.14);
      expect(res.payoffAchievable).toBe(true);
      expect(res.debtFreeDate).toMatch(/^[A-Z][a-z]+ \d{4}$/);
      expect(res.monthlySchedule[0]).toEqual({
        month: 1,
        debtBalances: { d: 203 },
        totalBalance: 203,
        totalInterestPaidThisMonth: 3,
        cumulativeInterest: 0,
        paymentsMade: { d: 100 },
      });
      expect(res.monthlySchedule[3]?.paymentsMade).toEqual({ d: 6.14 });
    });
  }

  it("gives a non-empty label in place of a date when payoff is not achievable", () => {
    const res = calculateAvalanche([debt("d", "Card", 10000, 24, 5)], 0);
    expect(res.payoffAchievable).toBe(false);
    expect(typeof res.debtFreeDate).toBe("string");
    expect(res.debtFreeDate.length).toBeGreaterThan(0);
  });
});

describe("compareAvalancheAndSnowball", () => {
  it("reports the interest and months each strategy saves", () => {
    // A 20 at 0% min 10; B 100 at 12% min 10; extra 50 (budget 70).
    // Avalanche: M1 B 101 -> 91 -> extra 50 -> 41, A -> 10.
    //            M2 B 41.41 -> 31.41 -> extra clears it; A -> 0. Interest 1 + 0.41 = 1.41.
    // Snowball:  M1 B 101 -> 91, A -> 10 -> extra 10 clears A, 40 to B -> 51.
    //            M2 B 51.51 -> 41.51 -> extra clears it. Interest 1 + 0.51 = 1.51.
    // Minimum only (budget 20, freed minimum rolls on):
    //   M1 B 101 -> 91; M2 B 91.91 -> 81.91, A clears; M3 82.73 -> 62.73;
    //   M4 63.36 -> 43.36; M5 43.79 -> 23.79; M6 24.03 -> 4.03; M7 4.07 -> 0.
    //   Interest 1 + 0.91 + 0.82 + 0.63 + 0.43 + 0.24 + 0.04 = 4.07 over 7 months.
    const res = compareAvalancheAndSnowball(
      [debt("a", "Card A", 20, 0, 10), debt("b", "Loan B", 100, 12, 10)],
      50,
    );
    expect(res.avalanche.months).toBe(2);
    expect(res.avalanche.totalInterest).toBe(1.41);
    expect(res.snowball.totalInterest).toBe(1.51);
    expect(res.minimumOnly.months).toBe(7);
    expect(res.minimumOnly.totalInterest).toBe(4.07);
    expect(res.interestSavedAvalancheVsMin).toBe(2.66); // 4.07 - 1.41
    expect(res.monthsShavedAvalancheVsMin).toBe(5); // 7 - 2
    expect(res.interestSavedAvalancheVsSnowball).toBe(0.1); // 1.51 - 1.41
    expect(res.snowball.quickWinDebtName).toBe("Card A");
    expect(res.snowballFirstWinDescription).toContain("Card A");
  });
});

describe("calculateZeroPercentCliff", () => {
  it("asks for the whole balance once the promotion has ended", () => {
    // 1000 at a 20% revert rate: a year's interest is 200.
    expect(calculateZeroPercentCliff(1000, 0, 20)).toEqual({
      requiredMonthlyPayment: 1000,
      balanceRemainingIfMinimum: 1000,
      penaltyInterestFirstYearIfUnpaid: 200,
      daysRemaining: 0,
      alertRequired: true,
    });
  });

  it("takes the ended-promotion path for a zero balance", () => {
    const res = calculateZeroPercentCliff(0, 6, 20);
    expect(res.daysRemaining).toBe(0);
    expect(res.alertRequired).toBe(true);
  });

  it("uses the larger of 2% or 25 as the assumed minimum when none is given", () => {
    // 1200 over 6 months: 200 a month. 2% of 1200 is 24, so the minimum is 25.
    // 1200 - 25 * 6 = 1050 left; 20% of 1050 = 210. Days: 6 * 30.4375 = 182.6, so 183.
    expect(calculateZeroPercentCliff(1200, 6, 20)).toEqual({
      requiredMonthlyPayment: 200,
      balanceRemainingIfMinimum: 1050,
      penaltyInterestFirstYearIfUnpaid: 210,
      daysRemaining: 183,
      alertRequired: false,
    });
  });

  it("uses the current payment when one is given", () => {
    // 1200 - 100 * 6 = 600 left; 20% of 600 = 120.
    const res = calculateZeroPercentCliff(1200, 6, 20, 100);
    expect(res.balanceRemainingIfMinimum).toBe(600);
    expect(res.penaltyInterestFirstYearIfUnpaid).toBe(120);
  });

  it("alerts at exactly 60 days left", () => {
    // 1.97 * 30.4375 = 59.96, so 60 days. 1000 - 100 * 1.97 = 803 left.
    const res = calculateZeroPercentCliff(1000, 1.97, 20, 100);
    expect(res.daysRemaining).toBe(60);
    expect(res.alertRequired).toBe(true);
  });

  it("alerts only when more than 10 would be left", () => {
    // 30 days left. 110 - 100 = 10 left: no alert. 111 - 100 = 11 left: alert.
    expect(calculateZeroPercentCliff(110, 1, 20, 100).alertRequired).toBe(false);
    expect(calculateZeroPercentCliff(111, 1, 20, 100).alertRequired).toBe(true);
  });
});

describe("calculateOverdraftCost", () => {
  it("charges nothing on a negative balance", () => {
    expect(calculateOverdraftCost(-1000, 39.9)).toEqual({
      annualPoundCost: 0,
      monthlyPoundCost: 0,
      effectiveApr: 39.9,
    });
  });

  it("charges the EAR on a positive balance", () => {
    // 1200 * 20% = 240 a year, 20 a month.
    expect(calculateOverdraftCost(1200, 20)).toEqual({
      annualPoundCost: 240,
      monthlyPoundCost: 20,
      effectiveApr: 20,
    });
  });
});

describe("calculateCarFinanceBalloon", () => {
  it("spreads the balloon over the months left", () => {
    // 6000 / 24 = 250 a month; total 200 * 24 + 6000 = 10800.
    expect(calculateCarFinanceBalloon(200, 24, 6000)).toEqual({
      balloonAmount: 6000,
      dueMonths: 24,
      monthlySinkingFundNeeded: 250,
      totalCostOfFinance: 10800,
    });
  });

  it("treats zero months left as one month", () => {
    // 6000 / 1 = 6000; total 200 * 1 + 6000 = 6200.
    expect(calculateCarFinanceBalloon(200, 0, 6000)).toEqual({
      balloonAmount: 6000,
      dueMonths: 0,
      monthlySinkingFundNeeded: 6000,
      totalCostOfFinance: 6200,
    });
  });
});

describe("evaluateUkStudentLoan plan fallback", () => {
  it("falls back to Plan 2 for a plan it does not recognise", () => {
    expect(evaluateUkStudentLoan("plan9", 0, 0).plan).toBe("plan2");
  });
});

describe("calculateDebtToWealthBridge", () => {
  it("defaults to the avalanche schedule", () => {
    // A 200 at 0% min 10; B 1000 at 120% (10% a month) min 100; extra 100 (budget 210).
    // Avalanche: M1 B 1100 -> 1000 -> 900, A 190 (1090)
    //            M2 B 990 -> 890 -> 790, A 180 (970)
    //            M3 B 869 -> 769 -> 669, A 170 (839)
    // Snowball would give 868 at month 3, so 839 shows the avalanche order.
    const points = calculateDebtToWealthBridge(
      [debt("a", "Card A", 200, 0, 10), debt("b", "Loan B", 1000, 120, 100)],
      100,
    );
    expect(points[0]).toMatchObject({ month: 0, debtRemaining: 1200 });
    expect(points[1]).toMatchObject({ month: 3, debtRemaining: 839, isPostDebtFree: false });
  });

  it("invests the freed payments after payoff and samples every third month", () => {
    // 100 at 0% min 50, extra 50: cleared in month 1. Freed cash 50 + 50 = 100 a month.
    // 12% a year is 1% a month. Horizon 1 + 12 = 13 months.
    // m2: 100 * 1.01 = 101; m3: 201 * 1.01 = 203.01; m4: 303.01 * 1.01 = 306.04;
    // m5: 406.04 * 1.01 = 410.10; m6: 510.10 * 1.01 = 515.20.
    const points = calculateDebtToWealthBridge([debt("x", "Card", 100, 0, 50)], 50, 12, 1);
    // Sampled: 0, the payoff month 1, multiples of 3, and the last month 13.
    expect(points.map((p) => p.month)).toEqual([0, 1, 3, 6, 9, 12, 13]);
    expect(points[0]).toEqual({
      month: 0,
      yearNumber: 0,
      debtRemaining: 100,
      wealthAccumulated: 0,
      isPostDebtFree: false,
    });
    // 1 / 12 = 0.083 years, shown to one decimal as 0.1.
    expect(points[1]).toEqual({
      month: 1,
      yearNumber: 0.1,
      debtRemaining: 0,
      wealthAccumulated: 0,
      isPostDebtFree: false,
    });
    // 3 / 12 = 0.25, shown as 0.3.
    expect(points[2]).toEqual({
      month: 3,
      yearNumber: 0.3,
      debtRemaining: 0,
      wealthAccumulated: 203,
      isPostDebtFree: true,
    });
    expect(points[3]?.wealthAccumulated).toBe(515);
    expect(points[3]?.yearNumber).toBe(0.5);
  });
});

describe("bridgePayoffMonth", () => {
  const p = (month: number, debtRemaining: number, isPostDebtFree: boolean) =>
    ({
      month,
      yearNumber: 0,
      debtRemaining,
      wealthAccumulated: 0,
      isPostDebtFree,
    }) satisfies DebtToWealthBridgePoint;

  it("returns the last paying month when the debt clears", () => {
    expect(bridgePayoffMonth([p(0, 100, false), p(1, 0, false), p(3, 0, true)])).toBe(1);
  });

  it("returns null when no point is after payoff", () => {
    expect(bridgePayoffMonth([p(0, 100, false), p(3, 0, false)])).toBeNull();
  });

  it("returns null when the last paying point still has debt", () => {
    expect(bridgePayoffMonth([p(0, 1200, false), p(360, 50, false), p(363, 0, true)])).toBeNull();
  });

  it("returns null when every point is after payoff", () => {
    expect(bridgePayoffMonth([p(3, 0, true)])).toBeNull();
  });
});

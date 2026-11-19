/**
 * The payment and principal columns of the debt schedule (E41 M2 finding).
 *
 * The rule: interest is added to a debt at the start of the month, and a payment covers that
 * interest first. So for each debt and month,
 *   paid = what was paid this month (minimum plus any extra),
 *   interest charged = the month's interest on the opening balance,
 *   principal = paid - interest charged,
 *   opening balance - principal = closing balance.
 * The month's totals are the sums of those: total paid = the money paid, total principal =
 * total paid - total interest. Every figure below is worked by hand.
 */
import { describe, expect, it } from "vitest";
import { calculateDebtSchedule } from "./debt-payoff.js";
import type { DebtItem } from "./types.js";

const REF = new Date("2026-01-15T12:00:00Z");

function debt(
  id: string,
  name: string,
  balanceGbp: number,
  interestRateApr: number,
  minimumPaymentGbp: number,
): DebtItem {
  return { id, name, balanceGbp, interestRateApr, minimumPaymentGbp };
}

describe("debt schedule payment columns", () => {
  it("splits each month's payment into interest and principal for one card", () => {
    // £300 at 12% APR (1% a month), minimum £100, no extra.
    // M1: interest 300 x 1% = 3.00; paid 100 = 3.00 interest + 97.00 principal; 300 - 97 = 203.00
    // M2: interest 203 x 1% = 2.03; paid 100 = 2.03 + 97.97; 203 - 97.97 = 105.03
    // M3: interest 105.03 x 1% = 1.0503 -> 1.05; paid 100 = 1.05 + 98.95; 105.03 - 98.95 = 6.08
    // M4: interest 6.08 x 1% = 0.0608 -> 0.06; balance 6.14 is less than the minimum, so
    //     paid 6.14 = 0.06 + 6.08 principal; closes at 0.
    const res = calculateDebtSchedule([debt("d", "Card", 300, 12, 100)], 0, "AVALANCHE", {
      referenceDate: REF,
    });
    expect(res.monthsToPayoff).toBe(4);
    expect(res.totalInterestPaidGbp).toBe(6.14); // 3 + 2.03 + 1.05 + 0.06

    const [m1, m2, m3, m4] = res.schedule;
    expect(m1?.payments[0]).toMatchObject({
      startingBalanceGbp: 300,
      interestChargedGbp: 3,
      principalPaidGbp: 97,
      endingBalanceGbp: 203,
      isPaidOff: false,
    });
    expect(m1).toMatchObject({
      totalPaymentsGbp: 100,
      totalInterestGbp: 3,
      totalPrincipalGbp: 97,
      remainingDebtGbp: 203,
    });

    expect(m2?.payments[0]).toMatchObject({
      startingBalanceGbp: 203,
      interestChargedGbp: 2.03,
      principalPaidGbp: 97.97,
      endingBalanceGbp: 105.03,
    });
    expect(m2).toMatchObject({ totalPaymentsGbp: 100, totalPrincipalGbp: 97.97 });

    expect(m3?.payments[0]).toMatchObject({
      startingBalanceGbp: 105.03,
      interestChargedGbp: 1.05,
      principalPaidGbp: 98.95,
      endingBalanceGbp: 6.08,
    });

    // The month the card clears.
    expect(m4?.payments[0]).toMatchObject({
      startingBalanceGbp: 6.08,
      interestChargedGbp: 0.06,
      principalPaidGbp: 6.08,
      endingBalanceGbp: 0,
      isPaidOff: true,
    });
    expect(m4).toMatchObject({
      totalPaymentsGbp: 6.14,
      totalInterestGbp: 0.06,
      totalPrincipalGbp: 6.08,
      remainingDebtGbp: 0,
    });

    // Over the whole schedule the money paid is the debt plus its interest: 300 + 6.14 = 306.14,
    // and the principal repaid is the original 300.
    const paid = res.schedule.reduce((s, m) => s + m.totalPaymentsGbp, 0);
    const principal = res.schedule.reduce((s, m) => s + m.totalPrincipalGbp, 0);
    expect(paid).toBeCloseTo(306.14, 2); // toBeCloseTo: a sum of pence in floating point
    expect(principal).toBeCloseTo(300, 2);
  });

  it("counts the avalanche extra payment as principal on the debt it goes to", () => {
    // Card A £100 at 0%, minimum £10. Loan B £1,000 at 12% (1% a month), minimum £50.
    // Extra £100, avalanche (highest APR first: B). Budget 10 + 50 + 100 = 160.
    // M1: B interest 1,000 x 1% = 10.00. Minimums: A pays 10 -> 90; B pays 50.
    //     £100 left goes to B. B paid 50 + 100 = 150 = 10 interest + 140 principal;
    //     1,000 - 140 = 860. Totals: paid 160, interest 10, principal 150, left 90 + 860 = 950.
    const res = calculateDebtSchedule(
      [debt("a", "Card A", 100, 0, 10), debt("b", "Loan B", 1000, 12, 50)],
      100,
      "AVALANCHE",
      { referenceDate: REF, maxMonths: 1 },
    );
    const m1 = res.schedule[0];
    const a = m1?.payments.find((p) => p.debtId === "a");
    const b = m1?.payments.find((p) => p.debtId === "b");
    expect(a).toMatchObject({
      startingBalanceGbp: 100,
      interestChargedGbp: 0,
      principalPaidGbp: 10,
      endingBalanceGbp: 90,
    });
    expect(b).toMatchObject({
      startingBalanceGbp: 1000,
      interestChargedGbp: 10,
      principalPaidGbp: 140,
      endingBalanceGbp: 860,
    });
    expect(m1).toMatchObject({
      totalPaymentsGbp: 160,
      totalInterestGbp: 10,
      totalPrincipalGbp: 150,
      remainingDebtGbp: 950,
    });
  });

  it("splits the snowball extra across a debt it clears mid-month and the next one", () => {
    // Same debts and £100 extra, snowball (smallest balance first: A).
    // M1: B interest 10.00. Minimums: A 10 -> 90; B 50. £100 left: A takes 90 and clears,
    //     the last 10 goes to B. A paid 10 + 90 = 100, all principal, closes at 0.
    //     B paid 50 + 10 = 60 = 10 interest + 50 principal; 1,000 - 50 = 950.
    //     Totals: paid 160, interest 10, principal 150, left 950.
    const res = calculateDebtSchedule(
      [debt("a", "Card A", 100, 0, 10), debt("b", "Loan B", 1000, 12, 50)],
      100,
      "SNOWBALL",
      { referenceDate: REF, maxMonths: 1 },
    );
    const m1 = res.schedule[0];
    const a = m1?.payments.find((p) => p.debtId === "a");
    const b = m1?.payments.find((p) => p.debtId === "b");
    expect(a).toMatchObject({
      startingBalanceGbp: 100,
      interestChargedGbp: 0,
      principalPaidGbp: 100,
      endingBalanceGbp: 0,
      isPaidOff: true,
    });
    expect(b).toMatchObject({
      startingBalanceGbp: 1000,
      interestChargedGbp: 10,
      principalPaidGbp: 50,
      endingBalanceGbp: 950,
    });
    expect(m1).toMatchObject({
      totalPaymentsGbp: 160,
      totalInterestGbp: 10,
      totalPrincipalGbp: 150,
      remainingDebtGbp: 950,
    });
    expect(res.firstQuickWinDebtName).toBe("Card A");
  });

  it("counts every pound paid on a 0% debt as principal", () => {
    // £100 at 0%, minimum £10, extra £20, one month: paid 30, no interest, principal 30, left 70.
    const res = calculateDebtSchedule([debt("z", "Zero", 100, 0, 10)], 20, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    expect(res.schedule[0]?.payments[0]).toMatchObject({
      startingBalanceGbp: 100,
      interestChargedGbp: 0,
      principalPaidGbp: 30,
      endingBalanceGbp: 70,
    });
    expect(res.schedule[0]).toMatchObject({
      totalPaymentsGbp: 30,
      totalInterestGbp: 0,
      totalPrincipalGbp: 30,
      remainingDebtGbp: 70,
    });
  });

  it("shows principal going up when the payment is less than the interest", () => {
    // £1,000 at 24% APR (2% a month), minimum £5 (the engine's floor). M1: interest 20.00;
    // paid 5 covers only part of it, so principal = 5 - 20 = -15 and the balance grows to 1,015.
    const res = calculateDebtSchedule([debt("g", "Growing", 1000, 24, 5)], 0, "AVALANCHE", {
      referenceDate: REF,
      maxMonths: 1,
    });
    expect(res.schedule[0]?.payments[0]).toMatchObject({
      startingBalanceGbp: 1000,
      interestChargedGbp: 20,
      principalPaidGbp: -15,
      endingBalanceGbp: 1015,
    });
    expect(res.schedule[0]).toMatchObject({
      totalPaymentsGbp: 5,
      totalInterestGbp: 20,
      totalPrincipalGbp: -15,
      remainingDebtGbp: 1015,
    });
  });
});

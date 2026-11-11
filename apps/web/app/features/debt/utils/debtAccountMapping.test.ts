import type { DebtItem } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { debtItemToAccountPayload } from "./debtAccountMapping";

const base: Omit<DebtItem, "id"> = {
  name: "Debt",
  balance: 1000,
  apr: 20,
  minimumPayment: 40,
  type: "credit_card",
};

describe("debtItemToAccountPayload", () => {
  it.each([
    ["credit_card", "Credit Card"],
    ["overdraft", "Overdraft"],
    ["loan", "Loan"],
    ["bnpl", "Loan"],
    ["car_finance", "Loan"],
  ] as const)("maps %s to %s", (type, expected) => {
    expect(debtItemToAccountPayload({ ...base, type }).type).toBe(expected);
  });

  it("stores the balance as minus the amount owed, whatever the input sign", () => {
    expect(debtItemToAccountPayload({ ...base, balance: 1000 }).balance).toBe(-1000);
    expect(debtItemToAccountPayload({ ...base, balance: -1000 }).balance).toBe(-1000);
  });

  it("keeps a 0% APR as 0 and sends null when the APR is unknown", () => {
    expect(debtItemToAccountPayload({ ...base, apr: 0 }).interestRate).toBe(0);
    expect(debtItemToAccountPayload({ ...base, apr: 0, aprKnown: false }).interestRate).toBeNull();
  });

  it("maps the minimum payment to monthlyContribution, or null when estimated or zero", () => {
    expect(debtItemToAccountPayload(base).monthlyContribution).toBe(40);
    expect(
      debtItemToAccountPayload({ ...base, minimumPaymentEstimated: true }).monthlyContribution,
    ).toBeNull();
    expect(debtItemToAccountPayload({ ...base, minimumPayment: 0 }).monthlyContribution).toBeNull();
  });
});

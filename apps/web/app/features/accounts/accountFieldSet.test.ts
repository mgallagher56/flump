// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accountFieldSet, changedFields } from "./accountFieldSet";

describe("accountFieldSet", () => {
  it("gives a credit card a rate, a minimum payment, the credit fields and joint ownership", () => {
    const set = accountFieldSet({ type: "Credit Card", name: "Card" });
    expect(set.interestRate?.label).toBe("Interest rate (APR) (optional)");
    expect(set.monthlyContribution?.label).toBe("Minimum payment each month (optional)");
    expect(set.creditFields).toBe(true);
    expect(set.mortgageFields).toBe(false);
    expect(set.kind).toBeNull();
    expect(set.joint).toBe(true);
  });

  it("gives a mortgage its kinds, rate, monthly payment and mortgage fields", () => {
    const set = accountFieldSet({ type: "Mortgage" });
    expect(set.kind?.options.map((o) => o.value)).toEqual(["residential_mortgage", "btl_mortgage"]);
    expect(set.mortgageFields).toBe(true);
    expect(set.monthlyContribution?.label).toBe("Monthly payment (optional)");
    expect(set.creditFields).toBe(false);
  });

  it("asks a property whether it is the home or a rental, with no rate or monthly amount", () => {
    const set = accountFieldSet({ type: "Property" });
    expect(set.kind?.label).toBe("Home or rental");
    expect(set.kind?.options.map((o) => o.value)).toEqual(["home", "rental"]);
    expect(set.interestRate).toBeNull();
    expect(set.monthlyContribution).toBeNull();
  });

  it("gives a loan its kinds", () => {
    expect(accountFieldSet({ type: "Loan" }).kind?.options.map((o) => o.value)).toEqual([
      "car_finance",
      "buy_now_pay_later",
      "other_loan",
    ]);
  });

  it("lets a saver be joint but never an ISA or a pension", () => {
    expect(accountFieldSet({ type: "Saving", accountSubtype: "easy_access" }).joint).toBe(true);
    expect(accountFieldSet({ type: "Saving", accountSubtype: "cash_isa" }).joint).toBe(false);
    expect(accountFieldSet({ type: "Pension" }).joint).toBe(false);
  });

  it("gives a student loan its plan and nothing else", () => {
    const set = accountFieldSet({ type: "Student Loan" });
    expect(set.studentLoanPlan).toBe(true);
    expect(set.interestRate).toBeNull();
    expect(set.monthlyContribution).toBeNull();
  });

  it("gives a current account no extra fields", () => {
    const set = accountFieldSet({ type: "Current" });
    expect([set.kind, set.interestRate, set.monthlyContribution]).toEqual([null, null, null]);
    expect(set.creditFields || set.mortgageFields || set.studentLoanPlan).toBe(false);
  });
});

describe("changedFields", () => {
  it("returns only the values that differ from what the form opened with", () => {
    expect(
      changedFields(
        { name: "Card", balance: "1200", interestRate: "", creditLimit: "3000" },
        { name: "Card", balance: "1200.00", interestRate: "19.9", creditLimit: "" },
      ),
    ).toEqual({ interestRate: "19.9", creditLimit: "" });
  });

  it("returns nothing when nothing changed", () => {
    expect(changedFields({ a: "x", b: "" }, { a: "x", b: "" })).toEqual({});
  });
});

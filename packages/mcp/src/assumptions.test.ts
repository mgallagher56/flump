import { getTaxYearVerification } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  accountLabels,
  derivedAssumption,
  TAX_NOTICE,
  taxVerificationFields,
} from "./assumptions.js";

describe("assumption helpers", () => {
  it("leaves the value out of an assumption derived from the user's data", () => {
    expect(derivedAssumption("monthlyIncome", "From the budget.")).toEqual({
      field: "monthlyIncome",
      reason: "From the budget.",
    });
  });

  it("pairs the engine's verification for a tax year with the tax notice", () => {
    // Plumbing only: the verification is passed through from the engine unchanged.
    const out = taxVerificationFields("2025/26");
    expect(out.verification).toEqual(getTaxYearVerification("2025/26"));
    expect(out.notice).toBe(TAX_NOTICE);
    // The notice states the calculation is not tax advice and where to check it.
    expect(TAX_NOTICE).toContain("not tax advice");
    expect(TAX_NOTICE).toContain("HMRC");
  });

  it("gives a provisional year as unverified, with rates announced but not yet law (ruling B)", () => {
    // 2027/28: the rates are not yet law, and 7 of its vectors are still unsigned.
    expect(taxVerificationFields("2027/28").verification).toEqual({
      status: "unverified",
      detail:
        "2027/28 figures use rates that are announced but not yet law. Treat them as an estimate and check them against HMRC.",
    });
  });
});

describe("accountLabels", () => {
  it("numbers generic labels per account type when anonymised", () => {
    const accounts = [
      { type: "Credit Card", name: "Test Card A" },
      { type: "Loan", name: "Test Loan" },
      { type: "Credit Card", name: "Test Card B" },
    ];
    const labels = accountLabels(accounts, true);
    // Two cards are numbered 1 and 2; the loan has its own count and is 1.
    expect(accounts.map((a) => labels.get(a))).toEqual([
      "Credit Card Account #1",
      "Loan Account #1",
      "Credit Card Account #2",
    ]);
  });

  it("uses the stored name, or a numbered fallback by position, when not anonymised", () => {
    const accounts = [
      { type: "Loan", name: "Test Loan" },
      { type: "Loan", name: "" },
      { type: "Credit Card", name: null },
    ];
    const labels = accountLabels(accounts, false);
    // Positions 2 and 3 have no name, so they fall back to "Debt Account #2" and "#3".
    expect(accounts.map((a) => labels.get(a))).toEqual([
      "Test Loan",
      "Debt Account #2",
      "Debt Account #3",
    ]);
  });
});

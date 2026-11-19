// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accountFieldsFromForm } from "./accountFormBody";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("accountFieldsFromForm", () => {
  it("sends nothing for fields the form left out", () => {
    expect(accountFieldsFromForm(form({ name: "Pot" }))).toEqual({});
  });

  it("clears an emptied subtype, credit limit and 0% date with null", () => {
    expect(
      accountFieldsFromForm(
        form({ accountSubtype: "", creditLimit: "", promoZeroPercentUntil: "", balance: "" }),
      ),
    ).toEqual({ accountSubtype: null, creditLimit: null, promoZeroPercentUntil: null });
  });

  it("reads joint ownership, the share and the new fields together", () => {
    expect(
      accountFieldsFromForm(
        form({
          ownership: "joint",
          sharePercent: "40",
          accountSubtype: "btl_mortgage",
          balance: "-150000.456",
          creditLimit: "2500.5",
          promoZeroPercentUntil: "2027-03-31",
        }),
      ),
    ).toEqual({
      ownership: "joint",
      sharePercent: 40,
      accountSubtype: "btl_mortgage",
      balance: -150000.46,
      creditLimit: 2500.5,
      promoZeroPercentUntil: "2027-03-31",
    });
  });

  it("reads the rate, monthly amount and mortgage fields", () => {
    expect(
      accountFieldsFromForm(
        form({
          interestRate: "4.555",
          monthlyContribution: "950",
          termMonths: "300",
          fixedRateEndDate: "2028-05-31",
          repaymentType: "interest-only",
          linkedAccountId: "11111111-2222-4333-8444-555555555555",
        }),
      ),
    ).toEqual({
      // 4.555 rounds to 2 decimal places: 4.56 (the money rule the rate field shares).
      interestRate: 4.56,
      monthlyContribution: 950,
      termMonths: 300,
      fixedRateEndDate: "2028-05-31",
      repaymentType: "interest-only",
      linkedAccountId: "11111111-2222-4333-8444-555555555555",
    });
  });

  it("clears an emptied rate, monthly amount, term, fixed-rate end, repayment type and link with null", () => {
    expect(
      accountFieldsFromForm(
        form({
          interestRate: "",
          monthlyContribution: "",
          termMonths: "",
          fixedRateEndDate: "",
          repaymentType: "",
          linkedAccountId: "",
        }),
      ),
    ).toEqual({
      interestRate: null,
      monthlyContribution: null,
      termMonths: null,
      fixedRateEndDate: null,
      repaymentType: null,
      linkedAccountId: null,
    });
  });

  it("leaves out a term outside 1 to 600 months and an unknown repayment type", () => {
    expect(accountFieldsFromForm(form({ termMonths: "601", repaymentType: "part" }))).toEqual({});
    expect(accountFieldsFromForm(form({ termMonths: "0" }))).toEqual({});
  });

  it("sends a null share for a sole account", () => {
    expect(accountFieldsFromForm(form({ ownership: "sole", sharePercent: "40" }))).toEqual({
      ownership: "sole",
      sharePercent: null,
    });
  });
});

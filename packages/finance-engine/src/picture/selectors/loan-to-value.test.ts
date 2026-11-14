import { describe, expect, it } from "vitest";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { selectLoanToValue } from "./loan-to-value.js";

const mortgage: RawAccount = { id: "m", name: "Mortgage", type: "Mortgage", balance: 186000 };
const home: RawAccount = { id: "h", name: "Home", type: "Property", balance: 310000 };
const snap = (...accounts: RawAccount[]) => new PortfolioSnapshot(accounts);
const owner = { homeValue: 310000, housingStatus: "mortgage" as const };

describe("selectLoanToValue", () => {
  it("is 60% from the profile home estimate when no Property account exists", () => {
    expect(selectLoanToValue(snap(mortgage), owner)).toEqual({
      status: "known",
      value: {
        percent: 60,
        homeValue: 310000,
        mortgageBalance: 186000,
        homeValueSource: "estimate",
      },
      provenance: "derived",
    });
  });

  it("uses the Property account over the profile estimate", () => {
    const fig = selectLoanToValue(snap(mortgage, { ...home, balance: 372000 }), owner);
    expect(fig.status === "known" && fig.value).toEqual({
      percent: 50,
      homeValue: 372000,
      mortgageBalance: 186000,
      homeValueSource: "account",
    });
  });

  it("rounds to one decimal place", () => {
    const fig = selectLoanToValue(snap({ ...mortgage, balance: 100000 }), {
      ...owner,
      homeValue: 300000,
    });
    expect(fig.status === "known" && fig.value.percent).toBe(33.3);
  });

  it("is unknown, never 0%, when the home value is missing or 0", () => {
    const unknown = { status: "unknown", missing: ["homeValue"], reason: "not-set" };
    expect(selectLoanToValue(snap(mortgage), null)).toEqual(unknown);
    expect(selectLoanToValue(snap(mortgage), { ...owner, homeValue: 0 })).toEqual(unknown);
    expect(selectLoanToValue(snap(mortgage, { ...home, balance: 0 }), owner)).toEqual(unknown);
  });

  it("is unknown when there is no mortgage balance", () => {
    expect(selectLoanToValue(snap(), owner)).toEqual({
      status: "unknown",
      missing: ["mortgageBalance"],
      reason: "not-set",
    });
    expect(selectLoanToValue(snap(), null)).toEqual({
      status: "unknown",
      missing: ["homeValue", "mortgageBalance"],
      reason: "not-set",
    });
  });
});

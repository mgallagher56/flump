// @vitest-environment node
import { PortfolioSnapshot, selectLoanToValue } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { isJointAccount, withWholeBalances } from "./jointMortgage";

const ltvOf = (accounts: Record<string, unknown>[]) => {
  const figure = selectLoanToValue(new PortfolioSnapshot(withWholeBalances(accounts), []));
  return figure.status === "known" ? figure.value : null;
};

describe("withWholeBalances (E34: the mortgage page works on the whole loan)", () => {
  it("a joint mortgage on a joint property: whole loan over whole property value", () => {
    const accounts = [
      { id: "m", name: "Mortgage", type: "Mortgage", balance: -200000, ownership: "joint" },
      {
        id: "h",
        name: "Home",
        type: "Property",
        balance: 400000,
        ownership: "joint",
        sharePercent: 50,
      },
    ];
    expect(ltvOf(accounts)).toEqual({ percent: 50, homeValue: 400000, mortgageBalance: 200000 });
    expect(new PortfolioSnapshot(withWholeBalances(accounts), []).getLatestBalance("m")).toBe(
      200000,
    );
  });

  it("a joint mortgage on a sole property: never a shared loan over a whole value", () => {
    const accounts = [
      {
        id: "m",
        name: "Mortgage",
        type: "Mortgage",
        balance: -200000,
        ownership: "joint",
        sharePercent: 50,
      },
      { id: "h", name: "Home", type: "Property", balance: 400000 },
    ];
    // The shared balance (100,000) over the whole value would read 25%.
    expect(ltvOf(accounts)?.percent).toBe(50);
  });

  it("keeps every other field and leaves the input rows untouched", () => {
    const row = { id: "m", type: "Mortgage", balance: -1, ownership: "joint", sharePercent: 40 };
    const [whole] = withWholeBalances([row]);
    expect(whole).toEqual({ id: "m", type: "Mortgage", balance: -1 });
    expect(row.ownership).toBe("joint");
  });
});

describe("isJointAccount", () => {
  it("is true only for an account counted as joint", () => {
    expect(isJointAccount({ type: "Mortgage", ownership: "joint" })).toBe(true);
    expect(isJointAccount({ type: "Mortgage", ownership: "sole" })).toBe(false);
    expect(isJointAccount({ type: "Mortgage" })).toBe(false);
    expect(isJointAccount(undefined)).toBe(false);
  });
});

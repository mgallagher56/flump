import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { categorizeAccountType, PortfolioSnapshot, type RawAccount } from "./portfolio.js";

const accounts: RawAccount[] = [
  { id: "c", name: "Current", type: "Current", balance: 2000 },
  { id: "p", name: "Home", type: "Property", balance: 260000 },
  { id: "m", name: "Mortgage", type: "Mortgage", balance: 180000 },
  { id: "s", name: "Plan 2", type: "Student Loan", balance: 45000 },
  { id: "o", name: "Overdraft", type: "Overdraft", balance: 1500 },
];

describe("E23 account types", () => {
  it("categorises the new types", () => {
    expect(categorizeAccountType("Property")).toBe("property");
    expect(categorizeAccountType("Student Loan")).toBe("studentLoans");
    expect(categorizeAccountType("student_loan")).toBe("studentLoans");
    expect(categorizeAccountType("Overdraft")).toBe("debt");
  });

  it("counts property as an asset in net worth but not as liquid cash", () => {
    const snap = new PortfolioSnapshot(accounts);
    expect(snap.getTotalProperty()).toBe(260000);
    expect(snap.getTotalLiquidCash()).toBe(2000);
    expect(snap.getTotalAssets(DEFAULT_NET_WORTH_BASIS)).toBe(262000);
  });

  it("excludes student loans from net worth, liabilities and debt items but reports them", () => {
    const snap = new PortfolioSnapshot(accounts);
    expect(snap.getTotalStudentLoans()).toBe(45000);
    expect(snap.getTotalLiabilities(DEFAULT_NET_WORTH_BASIS)).toBe(181500);
    expect(snap.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS)).toBe(262000 - 181500);
    expect(snap.toDebtItems().map((d) => d.id)).toEqual(["o"]);
  });

  it("treats an overdraft as consumer debt", () => {
    const snap = new PortfolioSnapshot(accounts);
    expect(snap.getTotalConsumerDebt()).toBe(1500);
    expect(snap.toDebtItems()[0]?.type).toBe("overdraft");
  });

  it("treats Owed (money owed to the user) as a non-liquid asset, never a debt", () => {
    const base = new PortfolioSnapshot(accounts);
    const withIou = new PortfolioSnapshot([
      ...accounts,
      { id: "w", name: "John Smith", type: "Owed", balance: 500 },
    ]);
    expect(categorizeAccountType("Owed")).toBe("other");
    expect(withIou.getTotalAssets(DEFAULT_NET_WORTH_BASIS)).toBe(
      base.getTotalAssets(DEFAULT_NET_WORTH_BASIS) + 500,
    );
    expect(withIou.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS)).toBe(
      base.getTotalNetWorth(DEFAULT_NET_WORTH_BASIS) + 500,
    );
    expect(withIou.getTotalLiabilities(DEFAULT_NET_WORTH_BASIS)).toBe(
      base.getTotalLiabilities(DEFAULT_NET_WORTH_BASIS),
    );
    expect(withIou.getTotalConsumerDebt()).toBe(base.getTotalConsumerDebt());
    expect(withIou.getTotalLiquidCash()).toBe(base.getTotalLiquidCash());
    expect(withIou.toDebtItems().map((d) => d.id)).not.toContain("w");
  });
});

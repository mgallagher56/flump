import { describe, expect, it } from "vitest";
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
    expect(snap.getTotalAssets()).toBe(262000);
  });

  it("excludes student loans from net worth, liabilities and debt items but reports them", () => {
    const snap = new PortfolioSnapshot(accounts);
    expect(snap.getTotalStudentLoans()).toBe(45000);
    expect(snap.getTotalLiabilities()).toBe(181500);
    expect(snap.getTotalNetWorth()).toBe(262000 - 181500);
    expect(snap.toDebtItems().map((d) => d.id)).toEqual(["o"]);
  });

  it("treats an overdraft as consumer debt", () => {
    const snap = new PortfolioSnapshot(accounts);
    expect(snap.getTotalConsumerDebt()).toBe(1500);
    expect(snap.toDebtItems()[0]?.type).toBe("overdraft");
  });
});

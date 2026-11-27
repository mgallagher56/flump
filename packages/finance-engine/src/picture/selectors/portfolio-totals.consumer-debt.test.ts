// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PortfolioSnapshot } from "../../portfolio.js";
import { selectConsumerDebtTotal } from "./portfolio-totals.js";

const snap = (accounts: Record<string, unknown>[]) => new PortfolioSnapshot(accounts as never, []);
const CARD = { id: "card", name: "Card", type: "Credit Card", balance: 1800 };

describe("selectConsumerDebtTotal", () => {
  it("no accounts: nothing owed to show", () => {
    expect(selectConsumerDebtTotal(snap([]))).toBeNull();
  });

  it("an overdrawn current account alone makes no debt account, so null", () => {
    expect(
      selectConsumerDebtTotal(
        snap([{ id: "cur", name: "Current", type: "Current", balance: -300 }]),
      ),
    ).toBeNull();
  });

  it("a card beside an overdrawn current account counts both", () => {
    // Card 1,800 plus the overdrawn 300: 2,100.
    expect(
      selectConsumerDebtTotal(
        snap([CARD, { id: "cur", name: "Current", type: "Current", balance: -300 }]),
      ),
    ).toBe(2100);
  });

  it("a card at £0 is nothing owed; a penny is owed", () => {
    expect(selectConsumerDebtTotal(snap([{ ...CARD, balance: 0 }]))).toBeNull();
    expect(selectConsumerDebtTotal(snap([{ ...CARD, balance: 0.01 }]))).toBe(0.01);
  });

  it("mortgages and student loans are not consumer debt", () => {
    // Card 1,800 and a loan of 3,250; the mortgage and student loan are left out: 5,050.
    expect(
      selectConsumerDebtTotal(
        snap([
          CARD,
          { id: "loan", name: "Car loan", type: "Loan", balance: 3250 },
          { id: "mort", name: "Mortgage", type: "Mortgage", balance: 180000 },
          { id: "sl", name: "Student loan", type: "Student Loan", balance: 38500 },
        ]),
      ),
    ).toBe(5050);
  });
});

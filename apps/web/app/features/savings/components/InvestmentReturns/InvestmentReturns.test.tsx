import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import customRender from "~/testUtils/customRender";
import InvestmentReturns from "./InvestmentReturns";

const HEADING = "Estimated return from your recorded balances";

describe("InvestmentReturns", () => {
  it("renders nothing without an investment account", () => {
    const { container } = customRender(
      <InvestmentReturns
        accountDetails={[]}
        accounts={[{ id: "a", name: "Easy access", type: "Saving" }]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows each investment account's own figures, from its own rows", () => {
    customRender(
      <InvestmentReturns
        accountDetails={[
          // ISA: 1,000 -> 1,010 -> 1,020.10, nothing paid in: +1% twice,
          // 1.01 * 1.01 - 1 = 0.0201 -> 2.0% over 2 months.
          { accountId: "isa", year: 2026, month: 1, value: 1000 },
          { accountId: "isa", year: 2026, month: 2, value: 1010 },
          { accountId: "isa", year: 2026, month: 3, value: 1020.1 },
          // GIA: two months only, below the minimum.
          { accountId: "gia", year: 2026, month: 2, value: 500 },
          { accountId: "gia", year: 2026, month: 3, value: 505 },
          // A savings account's rows are ignored.
          { accountId: "cash", year: 2026, month: 1, value: 10 },
        ]}
        accounts={[
          { id: "isa", name: "Stocks and Shares ISA", type: "Investment", interestRate: "5" },
          { id: "gia", name: "General account", type: "Investment", monthlyContribution: null },
          { id: "cash", name: "Easy access", type: "Saving" },
        ]}
      />,
    );
    const section = screen.getByRole("region", { name: HEADING });
    const isa = within(section).getByRole("region", { name: "Stocks and Shares ISA" });
    expect(within(isa).getByText("Overall, over 2 months")).toBeDefined();
    expect(within(isa).getAllByText("2.0%")).toHaveLength(2);
    expect(within(isa).getByText("Investment returns can go down as well as up.")).toBeDefined();
    // The ISA's own assumption is a separate line outside its recorded block.
    expect(within(isa).queryByText(/you set for this account/)).toBeNull();
    expect(
      within(section).getByText("The estimated annual return you set for this account is 5%."),
    ).toBeDefined();
    const gia = within(section).getByRole("region", { name: "General account" });
    expect(within(gia).getByText(/Not enough history yet/)).toBeDefined();
    expect(within(section).queryByRole("region", { name: "Easy access" })).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DebtWidget } from "./DebtWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe("DebtWidget", () => {
  it("renders default and custom debt metrics", () => {
    const noop = vi.fn();
    const { rerender } = render(
      <DebtWidget
        editMode={false}
        size="normal"
        onHide={noop}
        onMoveDown={noop}
        onMoveUp={noop}
        onToggleSize={noop}
      />,
    );

    expect(screen.getByText("Total Unsecured Debt")).toBeTruthy();
    expect(screen.getByText("August 2026")).toBeTruthy();

    rerender(
      <DebtWidget
        data={{
          totalDebt: 8200,
          debtFreeDate: "December 2027",
          interestSaved: 1450,
          highInterestCount: 3,
        }}
        editMode={true}
        size="wide"
        onHide={noop}
        onMoveDown={noop}
        onMoveUp={noop}
        onToggleSize={noop}
      />,
    );

    expect(screen.getByText("December 2027")).toBeTruthy();
    expect(screen.getByText(/3 High APR Accounts/i)).toBeTruthy();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DebtSummary } from "~/utils/debtSummary";
import { DebtWidget } from "./DebtWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

const noop = vi.fn();
const baseProps = {
  editMode: false,
  size: "normal" as const,
  onHide: noop,
  onMoveDown: noop,
  onMoveUp: noop,
  onToggleSize: noop,
};

const summary: DebtSummary = {
  totalDebt: 8200,
  debtCount: 3,
  highInterestCount: 3,
  monthlyMinimumTotal: 265,
  debtFreeDate: "December 2027",
  debts: [],
};

describe("DebtWidget", () => {
  it("shows no invented figures when there is no data", () => {
    render(<DebtWidget {...baseProps} />);

    expect(screen.queryByText("August 2026")).toBeNull();
    expect(screen.queryByText("£4,650")).toBeNull();
    expect(screen.queryByText(/Interest saved/i)).toBeNull();
    expect(screen.queryByText(/\+£50\/mo/)).toBeNull();
  });

  it("renders the summary figures", () => {
    render(<DebtWidget {...baseProps} data={summary} />);

    expect(screen.getByText("Total unsecured debt")).toBeTruthy();
    expect(screen.getByText("£8,200").className).toContain("tabular-nums");
    expect(screen.getByText("December 2027")).toBeTruthy();
    expect(screen.getByText(/3 high APR accounts/i)).toBeTruthy();
    expect(screen.queryByText(/Interest saved/i)).toBeNull();
  });

  it("shows 'Not calculated' when the debt-free date is null", () => {
    render(<DebtWidget {...baseProps} data={{ ...summary, debtFreeDate: null }} />);
    expect(screen.getByText("Not calculated")).toBeTruthy();
  });

  it("shows the empty state in edit mode with a null summary", () => {
    render(<DebtWidget {...baseProps} editMode data={null} />);
    expect(screen.getByText("No debts added")).toBeTruthy();
  });
});

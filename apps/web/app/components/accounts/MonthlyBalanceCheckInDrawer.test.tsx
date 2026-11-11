import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as accountStyles from "./AccountDetailsStyles";
import { MonthlyBalanceCheckInDrawer } from "./MonthlyBalanceCheckInDrawer";

const mockSubmit = vi.fn();

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
  }),
}));

describe("MonthlyBalanceCheckInDrawer & AccountDetailsStyles", () => {
  it("exports AccountDetailsStyles", () => {
    expect(accountStyles.accountDetailContainerStyles).toBeDefined();
    expect(accountStyles.accountDetailDisplayStyles).toBeDefined();
    expect(accountStyles.flexColumnStyles).toBeDefined();
  });

  it("opens drawer, updates balances, and submits changes", () => {
    const accounts = [
      { id: "acc-1", name: "Monzo Current", type: "Current", balance: 1200, userId: "u1" },
      { id: "acc-2", name: "Marcus Saver", type: "Savings", balance: 5000, userId: "u1" },
    ];

    render(<MonthlyBalanceCheckInDrawer accounts={accounts as any} />);

    fireEvent.click(screen.getByRole("button", { name: /60-Sec Balance Check-In/i }));

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(2);

    fireEvent.change(inputs[0], { target: { value: "1500" } });

    fireEvent.click(screen.getByRole("button", { name: /Save All Current Balances/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      {
        intent: "update",
        accountId: "acc-1",
        name: "Monzo Current",
        type: "Current",
        balance: "1500",
      },
      { method: "post" },
    );
    expect(screen.getByText(/Balances Updated Successfully!/i)).toBeTruthy();
  });

  it("renders empty state when no accounts are provided", () => {
    render(<MonthlyBalanceCheckInDrawer accounts={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /60-Sec Balance Check-In/i }));
    expect(screen.getByText(/No accounts found/i)).toBeTruthy();
  });
});

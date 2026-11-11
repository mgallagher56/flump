import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

const mockSubmit = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
  }),
}));

import PensionAccountsList from "./PensionAccountsList";

describe("PensionAccountsList", () => {
  it("renders empty state when no pots exist", () => {
    render(<PensionAccountsList accounts={[]} onOpenAddModal={vi.fn()} onOpenWizard={vi.fn()} />);

    expect(screen.getByText(/No individual pension pots tracked yet/i)).toBeDefined();
    expect(screen.getAllByText("Add Pension Pot").length).toBeGreaterThan(0);
  });

  it("renders table of pension pots, pot allocation breakdown, and consolidation tip when small pot exists", () => {
    const mockAccounts = [
      {
        id: "p1",
        name: "Nest Workplace Pension",
        type: "Pension",
        balance: 3000,
        interestRate: 5.0,
        monthlyContribution: 0,
        isCurrent: true,
      },
      {
        id: "p2",
        name: "Aviva Old Employer Pot",
        type: "Pension",
        balance: 27000,
        interestRate: 6.0,
        monthlyContribution: 0,
        isCurrent: false,
      },
    ];

    render(<PensionAccountsList accounts={mockAccounts as any} onOpenAddModal={vi.fn()} />);

    expect(screen.getAllByText("Nest Workplace Pension").length).toBeGreaterThan(0);
    expect(screen.getByText("£3,000")).toBeDefined();
    expect(screen.getAllByText("Aviva Old Employer Pot").length).toBeGreaterThan(0);
    expect(screen.getByText("£27,000")).toBeDefined();
    expect(screen.getByText("5.0% p.a.")).toBeDefined();
    expect(screen.getByText("6.0% p.a.")).toBeDefined();
    expect(screen.getByText("Pot Allocation Breakdown")).toBeDefined();
    expect(screen.getByText(/Consolidation Tip:/i)).toBeDefined();

    // Check badges and contributions
    expect(screen.getByText("Current Pot")).toBeDefined();
    expect(screen.getByText("Past Pot")).toBeDefined();
    expect(screen.getByText("None (Past Pot)")).toBeDefined();
  });

  describe("delete confirmation", () => {
    const pots = [
      {
        id: "p1",
        name: "Nest Workplace Pension",
        type: "Pension",
        balance: 3000,
        interestRate: 5.0,
        monthlyContribution: 0,
        isCurrent: true,
      },
    ];

    it("opens ConfirmDialog without deleting, and confirm deletes once", () => {
      mockSubmit.mockClear();
      const confirmSpy = vi.fn();
      vi.stubGlobal("confirm", confirmSpy);
      render(<PensionAccountsList accounts={pots as any} onOpenAddModal={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Nest Workplace Pension" })[0]);
      expect(
        screen.getByRole("alertdialog", { name: "Delete Nest Workplace Pension?" }),
      ).toBeDefined();
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Delete pot" }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "deletePensionAccount", accountId: "p1" },
        { method: "POST", action: "/app/pension" },
      );
    });

    it("cancel does nothing", () => {
      mockSubmit.mockClear();
      render(<PensionAccountsList accounts={pots as any} onOpenAddModal={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Nest Workplace Pension" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});

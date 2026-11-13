import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

const mockSubmit = vi.hoisted(() => vi.fn());
const fetcherData = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
    data: fetcherData.current,
  }),
}));

import { PensionAccountsList } from "./PensionAccountsList";

describe("PensionAccountsList", () => {
  it("renders the empty state when no pots exist", () => {
    render(<PensionAccountsList accounts={[]} onOpenAddModal={vi.fn()} variant="desktop" />);

    expect(screen.getByText(/No individual pension pots tracked yet/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Add your first pension pot" })).toBeDefined();
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

    render(
      <PensionAccountsList
        accounts={mockAccounts as any}
        onOpenAddModal={vi.fn()}
        variant="desktop"
      />,
    );

    expect(screen.getAllByText("Nest Workplace Pension").length).toBeGreaterThan(0);
    expect(screen.getByText("£3,000")).toBeDefined();
    expect(screen.getAllByText("Aviva Old Employer Pot").length).toBeGreaterThan(0);
    expect(screen.getByText("£27,000")).toBeDefined();
    expect(screen.getByText("5.0%")).toBeDefined();
    expect(screen.getByText("6.0%")).toBeDefined();
    expect(screen.getByText("Pot allocation")).toBeDefined();
    // A factual note, never a suggestion to consolidate.
    expect(screen.getByText("1 past pot and 1 pot under £5,000.")).toBeDefined();
    expect(screen.queryByText(/Consolidation Tip/i)).toBeNull();

    // Check badges and contributions
    expect(screen.getByText("Current pot")).toBeDefined();
    expect(screen.getByText("Past pot")).toBeDefined();
    expect(screen.getByText("None (past pot)")).toBeDefined();
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
      render(
        <PensionAccountsList accounts={pots as any} onOpenAddModal={vi.fn()} variant="desktop" />,
      );
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

    it("a failed delete shows the error inline and keeps the dialog open; success closes it", () => {
      mockSubmit.mockClear();
      fetcherData.current = null;
      const ui = () => (
        <PensionAccountsList accounts={pots as any} onOpenAddModal={vi.fn()} variant="desktop" />
      );
      const { rerender } = render(ui());
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Nest Workplace Pension" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete pot" }));

      fetcherData.current = {
        success: false,
        error: "We couldn't reach the server. Please try again.",
      };
      rerender(ui());
      expect(screen.getByRole("alert").textContent).toBe(
        "We couldn't reach the server. Please try again.",
      );
      expect(screen.getByRole("alertdialog")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Delete pot" }));
      fetcherData.current = { success: true };
      rerender(ui());
      expect(screen.queryByRole("alertdialog")).toBeNull();
      fetcherData.current = null;
    });

    it("cancel does nothing", () => {
      mockSubmit.mockClear();
      render(
        <PensionAccountsList accounts={pots as any} onOpenAddModal={vi.fn()} variant="desktop" />,
      );
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Nest Workplace Pension" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

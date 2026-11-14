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
  it("renders nothing when there are no pots", () => {
    const { container } = render(<PensionAccountsList accounts={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("lists each pot with one figure per row: the balance", () => {
    const mockAccounts = [
      {
        id: "p1",
        name: "Workplace pot",
        type: "Pension",
        balance: 3000,
        interestRate: 5.0,
        isCurrent: true,
      },
      {
        id: "p2",
        name: "Old employer pot",
        type: "Pension",
        balance: 27000,
        interestRate: 6.0,
        isCurrent: false,
      },
    ];
    const { container } = render(<PensionAccountsList accounts={mockAccounts as any} />);
    const rows = container.querySelectorAll("[data-list-row]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain("Workplace pot");
    expect(rows[0]?.textContent).toContain("Current pot");
    expect(rows[0]?.textContent).toContain("£3,000");
    expect(rows[1]?.textContent).toContain("Past pot");
    expect(rows[1]?.textContent).toContain("£27,000");
    // Rates and shares live in the pot's edit dialog, not the row.
    expect(container.textContent).not.toMatch(/%/);
  });

  it("keeps pots after the eighth behind a drawer", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `Pot ${i}`,
      type: "Pension",
      balance: 1000 + i,
      isCurrent: true,
    }));
    const { container } = render(<PensionAccountsList accounts={many as any} />);
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: /Show all pots/ }));
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(10);
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
      render(<PensionAccountsList accounts={pots as any} />);
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
      const ui = () => <PensionAccountsList accounts={pots as any} />;
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
      render(<PensionAccountsList accounts={pots as any} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Delete Nest Workplace Pension" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

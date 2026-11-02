import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
  }),
}));

import PensionAccountsList from "./PensionAccountsList";

describe("PensionAccountsList", () => {
  it("renders empty state when no pots exist", () => {
    render(<PensionAccountsList accounts={[]} onOpenAddModal={vi.fn()} onOpenWizard={vi.fn()} />);

    expect(screen.getByText("No pension pots tracked yet")).toBeDefined();
    expect(screen.getByText("Quick Start Wizard")).toBeDefined();
    expect(screen.getByText("Add Pot Manually")).toBeDefined();
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
});

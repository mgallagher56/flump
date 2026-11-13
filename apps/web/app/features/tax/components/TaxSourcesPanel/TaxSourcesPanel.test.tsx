import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxSourcesPanel } from "./TaxSourcesPanel";

const setup = (profileSalary = 52000) => {
  const handlers = {
    onOpenAddModal: vi.fn(),
    onOpenEditModal: vi.fn(),
    onOpenCopyModal: vi.fn(),
    onQuickAdd: vi.fn(),
    onViewReceipt: vi.fn(),
    onDeleteRecord: vi.fn(),
  };
  const view = render(
    <MemoryRouter>
      <TaxSourcesPanel
        records={taxRecordsFixture}
        taxYear="2026/27"
        previousTaxYear="2025/26"
        result={taxResultFixture}
        profileSalary={profileSalary}
        ownershipSharePct={50}
        {...handlers}
      />
    </MemoryRouter>,
  );
  return { ...handlers, ...view };
};

describe("TaxSourcesPanel", () => {
  it("renders one card per income source", () => {
    setup();
    for (const title of [
      "Employment (PAYE)",
      "Rental property",
      "Self-employed and freelance",
      "Savings and dividends",
    ]) {
      expect(screen.getByText(title)).toBeDefined();
    }
  });

  it("states the profile salary and opens a PAYE income record", () => {
    const { container, onOpenAddModal } = setup();
    expect(container.textContent).toMatch(/Salary in your profile:\s*£52,000\.00 a year/);
    fireEvent.click(screen.getByRole("button", { name: "Log a payslip or bonus" }));
    expect(onOpenAddModal).toHaveBeenCalledWith("paye", "income");
  });

  it("shows Not set for a missing salary", () => {
    const { container } = setup(0);
    expect(container.textContent).toMatch(/Salary in your profile:\s*Not set\s*Add salary/);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxReservePanel } from "./TaxReservePanel";

const setup = (totalIncome = 60_000) => {
  const props = {
    onPayeSalaryChange: vi.fn(),
    onOwnershipShareChange: vi.fn(),
    onSave: vi.fn(),
  };
  const view = render(
    <MemoryRouter>
      <TaxReservePanel
        taxYear="2026/27"
        result={taxResultFixture}
        totalIncome={totalIncome}
        payeSalary={52000}
        ownershipSharePct={50}
        saving={false}
        {...props}
      />
    </MemoryRouter>,
  );
  return { ...props, ...view };
};

describe("TaxReservePanel", () => {
  it("lists the workings ending in the estimated bill, in whole pounds", () => {
    const { container } = setup();
    expect(screen.getByRole("heading", { name: "Workings for 2026/27" })).toBeDefined();
    const terms = Array.from(document.querySelectorAll("dt")).map((d) => d.textContent);
    expect(terms.at(-1)).toBe("Estimated tax bill");
    expect(terms).toContain("Personal Allowance");
    expect(container.querySelector("dl")?.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  it("uses no number inputs and saves only on Save details", () => {
    const { onOwnershipShareChange, onSave, container } = setup();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Your share of the rental property/), {
      target: { value: "75" },
    });
    expect(onOwnershipShareChange).toHaveBeenCalledWith(75);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("shows the taper line only near the £100,000 band, never as a banner", () => {
    setup(110_000);
    expect(screen.getByText(/in the £100,000 to £125,140 band/)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says nothing about the taper well below it", () => {
    setup(40_000);
    expect(screen.queryByText(/Personal Allowance reduces/)).toBeNull();
  });
});

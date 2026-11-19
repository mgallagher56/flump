import { calculateUKTax } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { taxResultFixture } from "../../__fixtures__/taxRecords";
import { TaxReservePanel } from "./TaxReservePanel";

const setup = (
  totalIncome = 60_000,
  payeSalary: number | null = 52000,
  records = taxResultFixture,
) => {
  const props = {
    onPayeSalaryChange: vi.fn(),
    onOwnershipShareChange: vi.fn(),
    onSave: vi.fn(),
  };
  const view = render(
    <MemoryRouter>
      <TaxReservePanel
        taxYear="2026/27"
        result={records}
        totalIncome={totalIncome}
        payeSalary={payeSalary}
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

  it("passes an empty ownership share on as not set, never 0", () => {
    const { onOwnershipShareChange } = setup();
    const share = screen.getByLabelText(/Your share of the rental property/);
    fireEvent.change(share, { target: { value: "" } });
    expect(onOwnershipShareChange).toHaveBeenLastCalledWith(null);
  });

  it("shows the taper line only near the £100,000 band, never as a banner", () => {
    setup(110_000);
    expect(screen.getByText(/in the £100,000 to £125,140 band/)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says how much mortgage interest carries forward (ITTOIA 2005 s.274AA(4))", () => {
    // No salary; rent 18,000, costs 2,000, interest 5,000. Only 3,430 (income above the 12,570
    // allowance) can be used, so 5,000 - 3,430 = 1,570 carries forward.
    const year = "2026/27";
    const rec = (category: string, amount: number) => ({
      id: category,
      type: category === "rental_income" ? ("income" as const) : ("expense" as const),
      source: "rental" as const,
      category,
      name: category,
      amount,
      frequency: "annual" as const,
      date: "2026-06-06",
      endDate: null,
      notes: null,
    });
    const result = calculateUKTax(
      year,
      [
        rec("rental_income", 18000),
        rec("repairs_maintenance", 2000),
        rec("mortgage_interest", 5000),
      ],
      0,
      100,
    );
    setup(16_000, 0, result);
    expect(
      screen.getByText(
        "£1,570 of mortgage interest could not be used this year. It carries forward to next year.",
      ),
    ).toBeDefined();
  });

  it("says the property allowance leaves finance costs brought forward unused", () => {
    // Salary 30,000; rent 900; costs 100; 500 brought forward. The allowance route (tax 0)
    // beats the costs route (160 - 100 = 60), so the 500 is not used and carries forward.
    const rec = (category: string, amount: number) => ({
      id: category,
      type: category === "rental_income" ? ("income" as const) : ("expense" as const),
      source: "rental" as const,
      category,
      name: category,
      amount,
      frequency: "annual" as const,
      date: "2026-06-06",
      endDate: null,
      notes: null,
    });
    const result = calculateUKTax(
      "2026/27",
      [
        rec("rental_income", 900),
        rec("repairs_maintenance", 100),
        rec("finance_costs_brought_forward", 500),
      ],
      30000,
      100,
    );
    setup(30_900, 30000, result);
    expect(
      screen.getByText(
        "This estimate uses the £1,000 property allowance, so finance costs brought forward are not used this year.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "£500 of mortgage interest could not be used this year. It carries forward to next year.",
      ),
    ).toBeDefined();
  });

  it("says nothing about carrying interest forward when it is all used", () => {
    setup();
    expect(screen.queryByText(/carries forward/)).toBeNull();
  });

  it("says nothing about the taper well below it", () => {
    setup(40_000);
    expect(screen.queryByText(/Personal Allowance reduces/)).toBeNull();
  });

  it("shows the add salary prompt, not £0, when the salary is not known", () => {
    // No records and no salary: the calculation counts the salary as 0, but the page shows the
    // prompt and an empty salary field.
    setup(0, null, calculateUKTax("2026/27", [], 0, 100));
    expect(screen.getByText("Add salary")).toBeDefined();
    expect((screen.getByLabelText(/Yearly salary before tax/) as HTMLInputElement).value).toBe("");
  });

  it("shows a saved salary of 0 as £0, not the prompt", () => {
    setup(0, 0, calculateUKTax("2026/27", [], 0, 100));
    expect(screen.queryByText("Add salary")).toBeNull();
    expect((screen.getByLabelText(/Yearly salary before tax/) as HTMLInputElement).value).toBe("0");
  });

  it("passes an emptied salary on as not known (null)", () => {
    const { onPayeSalaryChange } = setup();
    fireEvent.change(screen.getByLabelText(/Yearly salary before tax/), { target: { value: "" } });
    expect(onPayeSalaryChange).toHaveBeenLastCalledWith(null);
  });
});

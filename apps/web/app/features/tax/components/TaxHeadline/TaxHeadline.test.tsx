import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { billDueDate, nonPayeCosts, nonPayeIncome, TaxHeadline } from "./TaxHeadline";

describe("TaxHeadline", () => {
  it("puts what the user added in the hero and the estimate in the first KPI", () => {
    const { container } = render(
      <TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />,
    );
    const heroes = container.querySelectorAll('[data-tone="hero"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0].textContent).toContain("Income outside PAYE");
    // The year is in the year control, not repeated in the hero.
    expect(heroes[0].textContent).not.toContain("2026/27");
    expect(heroes[0].textContent).not.toMatch(/estimate/i);
    expect(screen.getByText("Estimated bill")).toBeDefined();
    expect(screen.getByText("Bill due")).toBeDefined();
    expect(screen.getByText("Income after costs")).toBeDefined();
    expect(container.querySelectorAll("[data-kpi-value]").length).toBe(3);
    expect(screen.getByText("31 January 2028")).toBeDefined();
    expect(container.textContent).not.toMatch(/£[\d,]+\.\d{2}/);
  });

  it("asks for income and shows no £0 when the year has none", () => {
    const { container } = render(
      <TaxHeadline
        emptyAction={<button type="button">Add income</button>}
        records={[]}
        result={taxResultFixture}
        taxYear="2026/27"
      />,
    );
    expect(container.textContent).not.toContain("£0");
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Add income" })).toBeDefined();
  });

  it("reconciles: income before costs in the hero, income less costs beside the bill", () => {
    const { container } = render(
      <TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />,
    );
    const hero = container.querySelector('[data-tone="hero"]')?.textContent ?? "";
    const before = Number(/£([\d,]+)/.exec(hero)?.[1]?.replace(/,/g, ""));
    const after =
      nonPayeIncome(taxRecordsFixture, "2026/27") - nonPayeCosts(taxRecordsFixture, "2026/27");
    expect(before).toBe(nonPayeIncome(taxRecordsFixture, "2026/27"));
    expect(screen.getByText("Your income less the costs you recorded")).toBeDefined();
    expect(container.textContent).toContain(`£${Math.round(after).toLocaleString("en-GB")}`);
  });

  it("says when no costs are recorded and offers to add one", () => {
    const incomeOnly = taxRecordsFixture.filter((r) => r.type === "income");
    const onAddCost = vi.fn();
    render(
      <TaxHeadline
        onAddCost={onAddCost}
        records={incomeOnly}
        result={taxResultFixture}
        taxYear="2026/27"
      />,
    );
    expect(screen.getByText("No costs recorded")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Add a cost" }));
    expect(onAddCost).toHaveBeenCalledTimes(1);
  });

  it("says when the January payment includes a first payment on account", () => {
    const withPayments = {
      ...taxResultFixture,
      payments: { ...taxResultFixture.payments, paymentsOnAccountDue: true },
    };
    const { rerender } = render(
      <TaxHeadline records={taxRecordsFixture} result={withPayments} taxYear="2026/27" />,
    );
    expect(screen.getByText("This year's bill and a first payment on account")).toBeDefined();
    const without = {
      ...taxResultFixture,
      payments: { ...taxResultFixture.payments, paymentsOnAccountDue: false },
    };
    rerender(<TaxHeadline records={taxRecordsFixture} result={without} taxYear="2026/27" />);
    expect(screen.getByText("Balancing payment")).toBeDefined();
  });

  it("dates the bill to 31 January after the tax year ends", () => {
    expect(billDueDate("2025/26").toISOString().slice(0, 10)).toBe("2027-01-31");
  });
});

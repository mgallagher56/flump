import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { billDueDate, TaxHeadline } from "./TaxHeadline";

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
    expect(screen.getByText("Costs")).toBeDefined();
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

  it("offers to add a cost instead of showing £0 when none are recorded", () => {
    const incomeOnly = taxRecordsFixture.filter((r) => r.type === "income");
    const onAddCost = vi.fn();
    const { container } = render(
      <TaxHeadline
        onAddCost={onAddCost}
        records={incomeOnly}
        result={taxResultFixture}
        taxYear="2026/27"
      />,
    );
    expect(screen.getByText("None recorded")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Add a cost" }));
    expect(onAddCost).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toMatch(/Costs£0/);
  });

  it("dates the bill to 31 January after the tax year ends", () => {
    expect(billDueDate("2025/26").toISOString().slice(0, 10)).toBe("2027-01-31");
  });
});

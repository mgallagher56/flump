import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { taxRecordsFixture, taxResultFixture } from "../../__fixtures__/taxRecords";
import { billDueDate, TaxHeadline } from "./TaxHeadline";

describe("TaxHeadline", () => {
  it("puts what the user added in the hero and the estimate in the first KPI", () => {
    const { container } = render(
      <TaxHeadline records={taxRecordsFixture} result={taxResultFixture} taxYear="2026/27" />,
    );
    const heroes = container.querySelectorAll('[data-tone="hero"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0].textContent).toContain("Income for 2026/27");
    expect(heroes[0].textContent).not.toMatch(/estimate/i);
    expect(screen.getByText("Estimated bill")).toBeDefined();
    expect(screen.getByText("Next payment date")).toBeDefined();
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

  it("dates the bill to 31 January after the tax year ends", () => {
    expect(billDueDate("2025/26").toISOString().slice(0, 10)).toBe("2027-01-31");
  });
});

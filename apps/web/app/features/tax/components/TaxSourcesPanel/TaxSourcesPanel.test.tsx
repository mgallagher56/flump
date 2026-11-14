import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { taxRecordsFixture } from "../../__fixtures__/taxRecords";
import { TaxSourcesPanel } from "./TaxSourcesPanel";

describe("TaxSourcesPanel", () => {
  it("lists only the sources with records, one list row each", () => {
    render(
      <TaxSourcesPanel
        action={<button type="button">Add income</button>}
        records={taxRecordsFixture}
        taxYear="2026/27"
      />,
    );
    expect(screen.getByRole("heading", { name: "Income sources" })).toBeDefined();
    const rows = screen.getAllByRole("listitem");
    const sources = new Set(taxRecordsFixture.map((r) => r.source));
    expect(rows).toHaveLength(sources.size);
    for (const row of rows) expect(row.hasAttribute("data-list-row")).toBe(true);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("shows each row's income less costs when there are several sources outside PAYE", () => {
    render(<TaxSourcesPanel records={taxRecordsFixture} taxYear="2026/27" />);
    expect(screen.getAllByText("a year, after costs").length).toBeGreaterThan(1);
  });

  it("leaves the figure to the strip when there is one source outside PAYE", () => {
    const one = taxRecordsFixture.filter((r) => r.source === "self-employed");
    render(<TaxSourcesPanel records={one} taxYear="2026/27" />);
    expect(screen.getByTestId("tax-source-self-employed")).toBeDefined();
    expect(screen.queryByText("a year, after costs")).toBeNull();
  });

  it("draws nothing when the year has no records", () => {
    const { container } = render(<TaxSourcesPanel records={[]} taxYear="2026/27" />);
    expect(container.innerHTML).toBe("");
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TAX_DUE_LABEL, TaxWidget, taxCardShowsEstimate } from "./TaxWidget";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const renderWidget = (estimatedTaxDue: number | null, recordsCount = 3) =>
  render(
    <MemoryRouter>
      <TaxWidget data={{ estimatedTaxDue, recordsCount }} />
    </MemoryRouter>,
  );

describe("TaxWidget", () => {
  it("labels the tax figure as an unverified estimate", () => {
    renderWidget(4400);
    expect(TAX_DUE_LABEL).toBe("Tax due this tax year (unverified estimate)");
    expect(screen.getByText(TAX_DUE_LABEL)).toBeTruthy();
    expect(screen.getByText("£4,400")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(taxCardShowsEstimate({ estimatedTaxDue: 4400, recordsCount: 3 })).toBe(true);
  });

  it('reads "Not set" with nothing to estimate, and offers to add income', () => {
    renderWidget(null, 0);
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add income/ })).toBeTruthy();
    expect(taxCardShowsEstimate({ estimatedTaxDue: null, recordsCount: 0 })).toBe(false);
  });
});

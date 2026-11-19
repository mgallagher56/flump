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
  it('puts the "Unverified estimate" badge beside the tax figure', () => {
    renderWidget(4400);
    expect(TAX_DUE_LABEL).toBe("Tax due this tax year");
    expect(screen.getByText(TAX_DUE_LABEL)).toBeTruthy();
    expect(screen.getByText("Self Assessment")).toBeTruthy();
    const badge = screen.getByTestId("tax-unverified-badge");
    expect(badge.textContent).toBe("Unverified estimate");
    expect(badge.parentElement?.querySelector('[data-figure="tax.estimatedDue"]')).toBeTruthy();
    expect(screen.getByText("£4,400")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(taxCardShowsEstimate({ estimatedTaxDue: 4400, recordsCount: 3 })).toBe(true);
  });

  it('reads "Not set" with nothing to estimate, and offers to add income', () => {
    renderWidget(null, 0);
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(screen.queryByTestId("tax-unverified-badge")).toBeNull();
    expect(screen.getByRole("link", { name: /Add income/ })).toBeTruthy();
    expect(taxCardShowsEstimate({ estimatedTaxDue: null, recordsCount: 0 })).toBe(false);
  });

  it("names the self-employed income to add when that is what the estimate needs (PR 785)", () => {
    // Self-employed, salary kept, rent but no self-employed record: the selector says unknown
    // (selfEmploymentRecords). Before, the card asked for income outside PAYE, which they have.
    render(
      <MemoryRouter>
        <TaxWidget
          data={{
            estimatedTaxDue: null,
            estimatedTaxDueMissing: ["selfEmploymentRecords"],
            recordsCount: 1,
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(
      screen.getByText(
        "Add your self-employed income for this tax year to see an estimated tax bill.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Add self-employed income/ }).getAttribute("href"),
    ).toBe("/app/self-assessment/self-employed");
  });

  it("says which bands the estimate uses for a Scottish taxpayer, in the card's one line", () => {
    render(
      <MemoryRouter>
        <TaxWidget
          data={{
            estimatedTaxDue: 2000,
            estimatedTaxDueNotes: ["Uses England, Wales and Northern Ireland Income Tax bands."],
            recordsCount: 1,
          }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        "Tax on income not taxed through PAYE. Uses England, Wales and Northern Ireland Income Tax bands.",
      ),
    ).toBeTruthy();
  });
});

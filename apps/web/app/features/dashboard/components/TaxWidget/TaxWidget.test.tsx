import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TAX_PLANNER_HREF, TAX_WIDGET_COPY, TaxWidget, type TaxWidgetProps } from "./TaxWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const data: TaxWidgetProps["data"] = {
  taxYear: "2026/27",
  totalIncome: 12000,
  totalExpenses: 2000,
  netProfit: 10000,
  estimatedTaxDue: null,
  recordsCount: 5,
};

const renderWidget = (next: TaxWidgetProps["data"] = data) =>
  render(
    <MemoryRouter>
      <TaxWidget data={next} />
    </MemoryRouter>,
  );

describe("<TaxWidget />", () => {
  it("shows Not set with the verification note when tax due is unknown", () => {
    renderWidget();
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.getByText("Shown once you add income not taxed through PAYE")).toBeDefined();
    expect(screen.getByRole("link", { name: "Review tax records" }).getAttribute("href")).toBe(
      "/app/self-assessment",
    );
    // The only £0-like figures would be an invented tax due.
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("offers to add income when there are no records", () => {
    renderWidget({ ...data, recordsCount: 0, totalIncome: 0, totalExpenses: 0, netProfit: 0 });
    expect(screen.getByRole("link", { name: "Add income" }).getAttribute("href")).toBe(
      "/app/self-assessment",
    );
  });

  it("always shows net profit as a plain row, with no metric toggle", () => {
    renderWidget();
    expect(screen.getByText("Net profit")).toBeDefined();
    expect(screen.getByText("£10,000")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("formats a known tax due figure with en-GB grouping", () => {
    renderWidget({ ...data, estimatedTaxDue: 2900 });
    expect(screen.getByText("£2,900")).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.queryByText("Shown once you add income not taxed through PAYE")).toBeNull();
    expect(screen.getByText("Estimate of tax on income not taxed through PAYE")).toBeDefined();
    expect(screen.getByText(/Estimated tax due/)).toBeDefined();
  });

  it("keeps the title as the only heading", () => {
    renderWidget();
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Self Assessment");
  });

  describe("next £1,000 facts (E25-T14)", () => {
    const marginal: NonNullable<TaxWidgetProps["data"]["marginal"]> = {
      nextThousandDeductedPct: 42,
      takeHomeFromNextThousand: 580,
      ratesYear: "2026/27",
      isUnverifiedEstimate: true,
      nextThreshold: {
        kind: "higherRate",
        band: { name: "Higher", rate: 0.4 },
        grossAt: 50270,
        distance: 2270,
      },
    };

    it("shows the engine's facts with the as-at year, and links to the pay planner", () => {
      renderWidget({ ...data, marginal });
      const block = document.querySelector("[data-testid=tax-widget-marginal]") as HTMLElement;
      expect(block.textContent).toContain("As at tax year 2026/27");
      expect(block.textContent).toContain("Unverified estimate");
      expect(block.textContent).toContain("£580");
      expect(block.textContent).toContain("42%");
      expect(block.textContent).toContain(
        "Higher rate (40%) at £50,270 gross pay, £2,270 above your pay",
      );
      expect(
        screen.getByRole("link", { name: TAX_WIDGET_COPY.plannerLink }).getAttribute("href"),
      ).toBe(TAX_PLANNER_HREF);
    });

    it("says Estimate once the figures are signed off", () => {
      renderWidget({ ...data, marginal: { ...marginal, isUnverifiedEstimate: false } });
      const block = document.querySelector("[data-testid=tax-widget-marginal]") as HTMLElement;
      expect(block.textContent).toContain("Estimate");
      expect(block.textContent).not.toContain("Unverified estimate");
    });

    it("leaves the threshold row out when none lies above", () => {
      renderWidget({ ...data, marginal: { ...marginal, nextThreshold: null } });
      expect(screen.queryByText(TAX_WIDGET_COPY.nextThreshold)).toBeNull();
    });

    it("shows nothing about the next £1,000 when the facts are unknown", () => {
      renderWidget({ ...data, marginal: null });
      expect(document.querySelector("[data-testid=tax-widget-marginal]")).toBeNull();
    });
  });
});

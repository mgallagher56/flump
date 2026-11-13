import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TaxWidget, type TaxWidgetProps } from "./TaxWidget";

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
    expect(screen.getByText("Calculated once tax estimates are verified")).toBeDefined();
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
    expect(screen.queryByText("Calculated once tax estimates are verified")).toBeNull();
  });

  it("keeps the title as the only heading", () => {
    renderWidget();
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Self Assessment");
  });
});

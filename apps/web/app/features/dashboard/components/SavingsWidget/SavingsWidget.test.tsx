import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SavingsWidget, type SavingsWidgetData } from "./SavingsWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const data: SavingsWidgetData = {
  totalSavingsBalance: 10000,
  totalMonthlyContributions: 100,
  weightedInterestRate: 12,
  accountsCount: 2,
};

const renderWidget = (props: Parameters<typeof SavingsWidget>[0]) =>
  render(
    <MemoryRouter>
      <SavingsWidget {...props} />
    </MemoryRouter>,
  );

describe("SavingsWidget", () => {
  it("shows the balance, the real rate and the contribution in en-GB", () => {
    renderWidget({ data });
    expect(screen.getByText("£10,000")).toBeDefined();
    expect(screen.getByText("12.00%")).toBeDefined();
    expect(screen.getByText("£100")).toBeDefined();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Savings"]);
  });

  it("forecasts one year of compound growth using only the real weighted rate", () => {
    renderWidget({ data });
    expect(screen.getByText("1-year forecast")).toBeDefined();
    // 10000 * 1.01^12 + 100 * (1.01^12 - 1) / 0.01 = 12536.50
    expect(screen.getByText("£12,537")).toBeDefined();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("honours a saved horizon and can hide the forecast", () => {
    const { unmount } = renderWidget({ data, config: { horizonYears: 3 } });
    expect(screen.getByText("3-year forecast")).toBeDefined();
    unmount();
    renderWidget({ data, config: { showCompoundReturn: false } });
    expect(screen.queryByText(/forecast/)).toBeNull();
  });

  it("does not invent a rate: a null rate shows Not set linking to Savings and no forecast figure", () => {
    renderWidget({ data: { ...data, weightedInterestRate: null } });
    expect(screen.getAllByText("Not set").length).toBeGreaterThanOrEqual(2);
    const links = screen.getAllByRole("link", { name: "Add interest rate" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute("href")).toBe("/app/savings");
    expect(screen.queryByText("£12,537")).toBeNull();
    expect(screen.queryByText("£11,200")).toBeNull();
    expect(screen.queryByText("0.00%")).toBeNull();
  });

  it("treats a 0% real rate as a rate, not as unknown", () => {
    renderWidget({ data: { ...data, weightedInterestRate: 0 } });
    expect(screen.getByText("0.00%")).toBeDefined();
    // 10000 + 100 * 12
    expect(screen.getByText("£11,200")).toBeDefined();
  });

  it("shows Not set rather than £0 for contributions that were never entered", () => {
    renderWidget({ data: { ...data, totalMonthlyContributions: 0 } });
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByRole("link", { name: "Add monthly savings" })).toBeDefined();
  });

  it("shows Not set with an action when there are no savings accounts", () => {
    renderWidget({
      data: {
        totalSavingsBalance: 0,
        totalMonthlyContributions: 0,
        weightedInterestRate: null,
        accountsCount: 0,
      },
    });
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add a savings account" }).getAttribute("href")).toBe(
      "/app/savings",
    );
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.queryByText(/forecast/)).toBeNull();
  });
});

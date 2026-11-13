import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DashboardKpiStrip, type DashboardKpiStripProps } from "./DashboardKpiStrip";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const known: DashboardKpiStripProps = {
  netWorth: 50000,
  totalAssets: 60000,
  totalLiabilities: 10000,
  monthlySurplus: 1500,
  weeklySafeToSpend: 320,
  liquidCash: 12500,
};

const unknown: DashboardKpiStripProps = {
  netWorth: null,
  totalAssets: null,
  totalLiabilities: null,
  monthlySurplus: null,
  weeklySafeToSpend: null,
  liquidCash: null,
};

const renderStrip = (props: DashboardKpiStripProps) =>
  render(
    <MemoryRouter>
      <DashboardKpiStrip {...props} />
    </MemoryRouter>,
  );

describe("<DashboardKpiStrip />", () => {
  it("shows exactly the four KPIs with en-GB formatted figures", () => {
    renderStrip(known);
    for (const label of ["Monthly surplus", "Weekly safe to spend", "Liquid cash"]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    // Net worth is both the hero headline and the first figure in the row.
    expect(screen.getAllByText("Net worth")).toHaveLength(2);
    expect(screen.getAllByText("£50,000")).toHaveLength(2);
    expect(screen.getByText("£1,500")).toBeDefined();
    expect(screen.getByText("£12,500")).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("renders Not set with an action for every unknown value, never £0", () => {
    renderStrip(unknown);
    expect(screen.getAllByText("Not set")).toHaveLength(4);
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    expect(screen.getAllByRole("link", { name: "Add your budget" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Add a savings account" })).toBeDefined();
  });

  it("shows a real zero as £0 rather than Not set", () => {
    renderStrip({ ...known, liquidCash: 0, monthlySurplus: 0 });
    expect(screen.getAllByText("£0")).toHaveLength(2);
    expect(screen.queryByText("Not set")).toBeNull();
  });
  it("makes net worth the single hero block and leaves the other cards plain", () => {
    const { container } = renderStrip(known);
    const heroes = container.querySelectorAll('[data-tone="hero"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0]?.textContent).toContain("Net worth");
    expect(heroes[0]?.textContent).toContain("£50,000");
  });

  it("does not paint the hero block when net worth is unknown", () => {
    const { container } = renderStrip(unknown);
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
  });
});

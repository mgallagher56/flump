import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AccountsWidget, type AccountsWidgetData, buildSegments } from "./AccountsWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const data: AccountsWidgetData = {
  netWorth: 50000,
  totalAssets: 60000,
  totalLiabilities: 10000,
  accountsCount: 4,
  typeTotals: { Current: 12000, Saving: 36000, Pension: 12000, "Credit Card": 10000 },
};

const renderWidget = (props: { data?: AccountsWidgetData | null }) =>
  render(
    <MemoryRouter>
      <AccountsWidget {...props} />
    </MemoryRouter>,
  );

describe("AccountsWidget", () => {
  it("shows net worth, assets and liabilities in en-GB with a status region", () => {
    renderWidget({ data });
    expect(screen.getByText("£50,000")).toBeDefined();
    expect(screen.getByText("£60,000")).toBeDefined();
    expect(screen.getByText("Liabilities")).toBeDefined();
    expect(screen.getByText("4 accounts")).toBeDefined();
    const status = screen.getByRole("status");
    expect(within(status).getByText("£50,000")).toBeDefined();
  });

  it("does not render the headline figure as a heading", () => {
    renderWidget({ data });
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["Accounts"]);
  });

  it("uses a singular label for one account", () => {
    renderWidget({ data: { ...data, accountsCount: 1 } });
    expect(screen.getByText("1 account")).toBeDefined();
  });

  it("shows Not set with an action, never £0, when there are no accounts", () => {
    renderWidget({
      data: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, accountsCount: 0, typeTotals: {} },
    });
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows Not set when there is no data at all", () => {
    renderWidget({ data: null });
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it("shows a negative net worth as minus with the danger tone, not a bare dash", () => {
    renderWidget({ data: { ...data, netWorth: -2500 } });
    expect(screen.getByText("minus £2,500")).toBeDefined();
  });

  it("renders the allocation bar with a text alternative and only asset types", () => {
    renderWidget({ data });
    const bar = screen.getByRole("img");
    expect(bar.getAttribute("aria-label")).toBe(
      "Asset allocation by account type: Saving 60%, Current 20%, Pension 20%",
    );
    const legend = screen.getByRole("list", { name: "Asset allocation by account type" });
    expect(within(legend).getByText("Saving")).toBeDefined();
    expect(within(legend).queryByText("Credit Card")).toBeNull();
    expect(within(legend).getByText("60%")).toBeDefined();
  });
});

describe("buildSegments", () => {
  it("sorts by value, ignores liabilities and non-positive values, and sums to 100", () => {
    const segments = buildSegments({
      Current: 25,
      Saving: 75,
      Pension: 0,
      Loan: 999,
      Investment: Number.NaN,
    });
    expect(segments.map((s) => s.type)).toEqual(["Saving", "Current"]);
    expect(segments.map((s) => s.series)).toEqual([1, 2]);
    expect(segments.reduce((sum, s) => sum + s.pct, 0)).toBeCloseTo(100);
    expect(segments[1]?.start).toBeCloseTo(75);
  });

  it("returns nothing when there are no asset balances", () => {
    expect(buildSegments({})).toEqual([]);
    expect(buildSegments(undefined)).toEqual([]);
  });
});

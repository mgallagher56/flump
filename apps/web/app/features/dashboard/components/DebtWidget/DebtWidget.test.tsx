import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DebtSummary } from "~/utils/debtSummary";
import { DebtWidget } from "./DebtWidget";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const summary: DebtSummary = {
  totalDebt: 8200,
  debtCount: 3,
  highInterestCount: 3,
  monthlyMinimumTotal: 265,
  monthlyMinimumEstimated: false,
  debtFreeDate: "December 2027",
  debts: [],
};

const renderWidget = (data?: DebtSummary | null) =>
  render(
    <MemoryRouter>
      <DebtWidget data={data} />
    </MemoryRouter>,
  );

describe("DebtWidget", () => {
  it("shows no invented figures when there is no data", () => {
    renderWidget();

    expect(screen.queryByText("August 2026")).toBeNull();
    expect(screen.queryByText("£4,650")).toBeNull();
    expect(screen.queryByText(/Interest saved/i)).toBeNull();
    expect(screen.queryByText(/\+£50\/mo/)).toBeNull();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("shows an empty state with an action to add a debt", () => {
    renderWidget(null);
    expect(screen.getByText("No debts added")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add a debt" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });

  it("renders the summary figures with tabular numbers and no heading for the total", () => {
    renderWidget(summary);

    expect(screen.getByText("Total unsecured debt")).toBeDefined();
    expect(screen.getByText("£8,200").className).toContain("tabular-nums");
    expect(screen.getByText("December 2027").className).toContain("tabular-nums");
    expect(screen.getByText(/3 high APR accounts/i)).toBeDefined();
    expect(screen.queryByText(/Interest saved/i)).toBeNull();
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Debt"]);
    expect(screen.getByRole("status").textContent).toContain("£8,200");
  });

  it("uses the singular for one high APR account", () => {
    renderWidget({ ...summary, highInterestCount: 1 });
    expect(screen.getByText(/1 high APR account$/i)).toBeDefined();
  });

  it("labels minimums as estimated only when the summary flag is set", () => {
    const { unmount } = renderWidget(summary);
    expect(screen.queryByText("Monthly minimums (estimated)")).toBeNull();
    expect(screen.getByText("Monthly minimums")).toBeDefined();
    unmount();
    renderWidget({ ...summary, monthlyMinimumEstimated: true });
    expect(screen.getByText("Monthly minimums (estimated)")).toBeDefined();
  });

  it("shows 'Not calculated' when the debt-free date is null and every APR is known", () => {
    renderWidget({ ...summary, debtFreeDate: null });
    expect(screen.getByText("Not calculated")).toBeDefined();
  });

  it("shows Not set linking to Accounts when any APR is unknown", () => {
    renderWidget({
      ...summary,
      debtFreeDate: null,
      debts: [
        { id: "a", name: "Card", aprKnown: false },
        { id: "b", name: "Loan", aprKnown: true },
      ],
    });
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByText("Not calculated")).toBeNull();
    expect(screen.getByRole("link", { name: "Add APR" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });
});

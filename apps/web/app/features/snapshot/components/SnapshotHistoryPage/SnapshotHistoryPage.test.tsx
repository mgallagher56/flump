import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SnapshotHistoryPage, type SnapshotHistoryPageProps } from "./SnapshotHistoryPage";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const CURRENT = "a0000000-0000-4000-8000-000000000001";
const MORTGAGE = "a0000000-0000-4000-8000-000000000003";
const accounts = [
  { id: CURRENT, name: "Current account", type: "Current", balance: 1500 },
  { id: MORTGAGE, name: "Mortgage", type: "Mortgage", balance: -180000 },
];
const row = (accountId: string, year: number, month: number, value: number) => ({
  accountId,
  year,
  month,
  value,
});

const renderPage = (props: Partial<SnapshotHistoryPageProps> = {}) =>
  render(
    <MemoryRouter>
      <SnapshotHistoryPage
        accountDetails={[]}
        accounts={accounts}
        currentMonth="2026-11"
        monthlySurplus={400}
        monthsOfCover={3.25}
        onSave={vi.fn(async () => true)}
        {...props}
      />
    </MemoryRouter>,
  );

describe("SnapshotHistoryPage", () => {
  it("with no history, prompts for the first check-in", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Net worth history" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "No monthly balances yet" })).toBeDefined();
    expect(screen.queryByText(/months? of history/)).toBeNull();
    await userEvent.click(
      within(screen.getByTestId("snapshot-empty")).getByRole("button", { name: "Update balances" }),
    );
    expect(screen.getByRole("dialog", { name: "Monthly check-in: November 2026" })).toBeDefined();
  });

  it("with no accounts, points to adding one", () => {
    renderPage({ accounts: [] });
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
    expect(
      (screen.getByRole("button", { name: "Update balances" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("with one month, shows the point, a projection, the next check-in and months of cover", () => {
    renderPage({
      accountDetails: [row(CURRENT, 2026, 10, 2000), row(MORTGAGE, 2026, 10, -150000)],
    });
    expect(screen.getAllByText("1 month of history").length).toBeGreaterThan(0);
    expect(screen.getByText("Net worth, October 2026")).toBeDefined();
    expect(screen.getAllByText("1 December 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3.3 months").length).toBeGreaterThan(0);
    // The label states the selector's real formula: essentials plus debt minimums, not budget only.
    expect(
      screen.getByText(/current and savings accounts ÷ essential spending and debt minimums/),
    ).toBeDefined();
    expect(screen.getByRole("complementary", { name: "Guidance, not advice" }).textContent).toMatch(
      /Projection, not a forecast: it assumes your budget surplus of £400 a month/,
    );
    expect(screen.getByText("Last recorded month: October 2026")).toBeDefined();
    // No deltas yet.
    expect(screen.queryByText(/Net worth changed by/)).toBeNull();
  });

  it("with one month and no budget, shows the point without a projection", () => {
    renderPage({
      accountDetails: [row(CURRENT, 2026, 10, 2000)],
      monthlySurplus: null,
      monthsOfCover: null,
    });
    expect(screen.queryByRole("complementary", { name: "Guidance, not advice" })).toBeNull();
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  });

  it("with two months, shows changes only, with no trend chart", () => {
    renderPage({
      accountDetails: [
        row(CURRENT, 2026, 9, 2000),
        row(MORTGAGE, 2026, 9, -150000),
        row(CURRENT, 2026, 10, 2300),
        row(MORTGAGE, 2026, 10, -149500),
      ],
    });
    expect(screen.getByText("Net worth changed by +£800 since September 2026.")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Change by account" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Change by month" })).toBeNull();
    expect(screen.queryByTestId("net-worth-history-legend")).toBeNull();
    const mortgage = screen.getByRole("rowheader", { name: "Mortgage (owed)" }).closest("tr");
    expect(mortgage?.textContent).toContain("−£500");
  });

  it("with three or more months, shows the trend, the account changes and the month table", () => {
    renderPage({
      accountDetails: [
        row(CURRENT, 2026, 7, 2000),
        row(CURRENT, 2026, 8, 2100),
        row(CURRENT, 2026, 10, 1900),
      ],
    });
    expect(screen.getAllByText("3 months of history").length).toBeGreaterThan(0);
    expect(screen.getByText("Net worth changed by −£200 since August 2026.")).toBeDefined();
    expect(screen.getByTestId("net-worth-history-legend").textContent).toContain("Carried forward");
    expect(screen.getByRole("heading", { name: "Change by month" })).toBeDefined();
  });

  it("opens the check-in on arrival from the dashboard link", () => {
    renderPage({ initialSheet: "checkIn" });
    expect(screen.getByRole("dialog", { name: "Monthly check-in: November 2026" })).toBeDefined();
  });

  it("opens back-fill from Add earlier months", async () => {
    renderPage({ accountDetails: [row(CURRENT, 2026, 10, 2000)] });
    await userEvent.click(screen.getByRole("button", { name: "Add earlier months" }));
    expect(screen.getByRole("dialog", { name: "Add an earlier month" })).toBeDefined();
  });
});

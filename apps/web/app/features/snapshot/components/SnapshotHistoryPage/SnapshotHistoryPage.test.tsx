import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  chartSummary,
  fewMonthsPrompt,
  heroSubline,
  SnapshotHistoryPage,
  type SnapshotHistoryPageProps,
} from "./SnapshotHistoryPage";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const CURRENT = "a0000000-0000-4000-8000-000000000001";
const MORTGAGE = "a0000000-0000-4000-8000-000000000003";
// No saved balances: these tests are about recorded months. The current month's saved-balance
// end point is covered in snapshotModel.test.ts and the consistency harness.
const accounts = [
  { id: CURRENT, name: "Current account", type: "Current" },
  { id: MORTGAGE, name: "Mortgage", type: "Mortgage" },
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
        basis={DEFAULT_NET_WORTH_BASIS}
        currentMonth="2026-11"
        onSave={vi.fn(async () => true)}
        {...props}
      />
    </MemoryRouter>,
  );

/** The first view (P13): the header, the hero and the chart figure, in page order. */
const firstView = (): HTMLElement => {
  const root = document.createElement("div");
  const header = screen.getByRole("heading", { level: 1 }).closest("header");
  for (const el of [
    header ?? screen.getByRole("heading", { level: 1 }),
    screen.getByTestId("hero-figure"),
    screen.getByRole("figure", { name: "Net worth over time" }),
  ]) {
    root.appendChild(el.cloneNode(true));
  }
  return root;
};

const TREND = [
  row(CURRENT, 2026, 7, 2000),
  row(CURRENT, 2026, 8, 2100),
  row(CURRENT, 2026, 10, 1900),
];

describe("heroSubline", () => {
  it("names the month compared with, and the current month only when it is not recorded", () => {
    expect(
      heroSubline({ month: "2026-10" }, { month: "2026-11", allCarried: false }, "2026-11"),
    ).toBe("Against October 2026");
    expect(
      heroSubline({ month: "2026-10" }, { month: "2026-11", allCarried: true }, "2026-11"),
    ).toBe("Against October 2026. This month is not recorded yet.");
  });
});

describe("chartSummary", () => {
  const point = (month: string, allCarried = false) => ({ month, allCarried });

  it("names the first month, and the dashed months only when one has no check-in", () => {
    expect(chartSummary([point("2026-09"), point("2026-10")], "2026-11")).toBe(
      "Net worth each month since September 2026.",
    );
    expect(
      chartSummary([point("2026-09"), point("2026-10"), point("2026-11", true)], "2026-11"),
    ).toBe(
      // The hero subline already says this month is not recorded: no second notice (P4).
      "Net worth each month since September 2026.",
    );
    expect(
      chartSummary([point("2026-08"), point("2026-09", true), point("2026-10")], "2026-11"),
    ).toBe(
      "Net worth each month since August 2026. Months with no check-in show as a dashed line.",
    );
  });
});

describe("SnapshotHistoryPage", () => {
  it("with no history, prompts for the first check-in", async () => {
    const { container } = renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Net worth history" })).toBeDefined();
    expect(screen.getByText("Your net worth, recorded once a month.")).toBeDefined();
    expect(screen.getByRole("heading", { name: "No monthly balances yet" })).toBeDefined();
    expect(screen.queryByTestId("hero-figure")).toBeNull();
    expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
    await userEvent.click(
      within(screen.getByTestId("snapshot-empty")).getByRole("button", { name: "Update balances" }),
    );
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
  });

  it("with no accounts, points to adding one", () => {
    renderPage({ accounts: [] });
    expect(screen.getByRole("link", { name: "Add an account" }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });

  it("words the prompt by month count", () => {
    expect(fewMonthsPrompt(1)).toBe(
      "You have one month of history. The chart appears after your third check-in.",
    );
    expect(fewMonthsPrompt(2)).toBe(
      "You have two months of history. The chart appears after your third check-in.",
    );
  });

  it("with one month, shows no chart and no change, only the prompt and the check-in button", async () => {
    const { container } = renderPage({
      accountDetails: [row(CURRENT, 2026, 10, 2000), row(MORTGAGE, 2026, 10, -150000)],
    });
    const hero = screen.getByTestId("hero-figure");
    expect(hero.getAttribute("data-tone")).toBeNull();
    expect(hero.textContent).toContain("Monthly change");
    expect(hero.textContent).toContain("No earlier month");
    expect(hero.textContent).not.toMatch(/£/);
    expect(screen.getByText("Net worth recorded for October 2026: -£148,000.")).toBeDefined();
    expect(screen.getByText(fewMonthsPrompt(1))).toBeDefined();
    expect(screen.queryByTestId("net-worth-history-chart")).toBeNull();
    // November is not recorded yet, so no next check-in date beside "not recorded yet".
    expect(screen.queryByText(/Next check-in/)).toBeNull();
    // Months of cover moved to Budget; no projection, so no notice.
    expect(screen.queryByText(/Months of cover/)).toBeNull();
    expect(screen.queryByText(/Projection|Estimate/)).toBeNull();
    expectPageRules(container, { maxFigures: 4, maxNotSet: 0, projectionNotices: 0 });
    expectPageRules(firstView(), { maxFigures: 4 });
    await userEvent.click(screen.getByRole("button", { name: "Update balances" }));
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
  });

  it("shows the next check-in date once this month is recorded", () => {
    renderPage({
      accountDetails: [row(CURRENT, 2026, 10, 2000), row(CURRENT, 2026, 11, 2100)],
    });
    expect(screen.getByText("Next check-in: 1 December 2026")).toBeDefined();
    expect(screen.queryByText(/not recorded yet/)).toBeNull();
  });

  it("with two months, shows the change as the hero and the account table, still no chart", async () => {
    const { container } = renderPage({
      accountDetails: [
        row(CURRENT, 2026, 9, 2000),
        row(MORTGAGE, 2026, 9, -150000),
        row(CURRENT, 2026, 10, 2300),
        row(MORTGAGE, 2026, 10, -149500),
      ],
    });
    const hero = screen.getByTestId("hero-figure");
    expect(hero.getAttribute("data-tone")).toBe("hero");
    expect(hero.textContent).toContain("+£800");
    // The change is October against September; November has no check-in yet.
    expect(hero.textContent).toContain("Change in October 2026");
    expect(hero.textContent).not.toContain("since last month");
    expect(hero.textContent).toContain("Against September 2026. This month is not recorded yet.");
    expect(screen.getByText(fewMonthsPrompt(2))).toBeDefined();
    expect(screen.queryByTestId("net-worth-history-chart")).toBeNull();
    expect(screen.queryByText(/Next check-in/)).toBeNull();
    expectPageRules(container, { maxFigures: 6, projectionNotices: 0 });
    // Only the account table exists, so the drawer holds it without tabs.
    await userEvent.click(screen.getByRole("button", { name: "Show changes by account" }));
    expect(screen.queryByRole("tab")).toBeNull();
    const mortgage = screen.getByRole("rowheader", { name: "Mortgage (owed)" }).closest("tr");
    expect(mortgage?.textContent).toContain("−£500");
    expectPageRules(firstView(), { maxFigures: 4 });
  });

  it("with three or more months, shows the hero change, the chart with its summary and the tables", async () => {
    const { container } = renderPage({ accountDetails: TREND });
    expect(screen.getByTestId("hero-figure").textContent).toContain("-£200");
    expect(screen.getByTestId("hero-figure").textContent).toContain("Against August 2026");
    expect(screen.getByTestId("net-worth-history-chart")).toBeDefined();
    // September and November have no check-in, so the summary names the dashed line (no legend).
    expect(
      screen.getByText(
        "Net worth each month since July 2026. Months with no check-in show as a dashed line.",
      ),
    ).toBeDefined();
    expect(screen.queryByText(/The chart appears after/)).toBeNull();
    expect(screen.queryByTestId("net-worth-history-legend")).toBeNull();
    // The header holds the one primary button; back-fill is a quiet link by the check-in line.
    const header = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(within(header).getAllByRole("button")).toHaveLength(1);
    expect(within(header).getByRole("button", { name: "Update balances" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Update balances" })).toHaveLength(1);
    expect(screen.getByTestId("snapshot-open-backfill").getAttribute("data-variant")).toBe("link");
    // The whole page view, drawer closed (P1.3 target for history: 6).
    expectPageRules(container, { maxFigures: 6, projectionNotices: 0 });
    expectPageRules(firstView(), { maxFigures: 4 });

    // Both tables sit behind one quiet drawer, as two tabs.
    const toggle = screen.getByRole("button", { name: "Show changes by account and by month" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("tab")).toBeNull();
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("tab", { name: "By account" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByTestId("snapshot-change-accounts")).toBeDefined();
    await userEvent.click(screen.getByRole("tab", { name: "By month" }));
    expect(screen.getByRole("tab", { name: "By month" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("table", { name: "Net worth change by month" })).toBeDefined();
  });

  it("opens the check-in on arrival from the dashboard link", () => {
    renderPage({ initialSheet: "checkIn" });
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
  });

  it("opens back-fill from Add earlier months", async () => {
    renderPage({ accountDetails: [row(CURRENT, 2026, 10, 2000)] });
    await userEvent.click(screen.getByRole("button", { name: "Add earlier months" }));
    expect(screen.getByRole("dialog", { name: "Add an earlier month" })).toBeDefined();
  });

  describe("net worth choices", () => {
    const twoMonths = [row(CURRENT, 2026, 9, 2000), row(CURRENT, 2026, 10, 2100)];

    it("under the default choices with no student loan, no line shows", () => {
      renderPage({ accountDetails: twoMonths });
      expect(screen.queryByTestId("snapshot-net-worth-basis")).toBeNull();
    });

    it("with property switched off, the hero says what it leaves out and links to the choice", () => {
      renderPage({
        accountDetails: twoMonths,
        basis: { countProperty: false, countStudentLoan: false },
      });
      const line = screen.getByTestId("snapshot-net-worth-basis");
      expect(line.textContent).toContain("Not counting your mortgage.");
      expect(
        within(line).getByRole("link", { name: "Change what counts" }).getAttribute("href"),
      ).toBe("/app/profile?tab=profile#net-worth");
    });
  });
});

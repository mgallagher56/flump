import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { expectPageRules } from "@repo/ui/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  chartSummary,
  comparedMonthsText,
  fewMonthsPrompt,
  notRecordedPrompt,
  SnapshotHistoryPage,
  type SnapshotHistoryPageProps,
  sentences,
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

describe("comparedMonthsText", () => {
  const month = (key: string, name: string, year: number) => ({ key, name, year });
  const compare = (from: ReturnType<typeof month>, to: ReturnType<typeof month>) => ({
    month: to,
    previousMonth: from,
    netWorth: 0,
    previousNetWorth: 0,
    netWorthChange: 0,
    consecutive: false,
  });

  it("names both months, with the year once when they share it", () => {
    expect(
      comparedMonthsText(
        compare(month("2026-09", "September", 2026), month("2026-10", "October", 2026)),
      ),
    ).toBe("September to October 2026");
  });

  it("gives each year across a year boundary", () => {
    expect(
      comparedMonthsText(
        compare(month("2025-12", "December", 2025), month("2026-01", "January", 2026)),
      ),
    ).toBe("December 2025 to January 2026");
  });

  it("words the prompt with the month alone", () => {
    expect(notRecordedPrompt("November")).toBe("November not recorded yet");
  });
});

describe("chartSummary", () => {
  const gbp = (v: number) => `£${v.toLocaleString("en-GB")}`;
  const point = (month: string, netWorth: number, allCarried = false) => ({
    month,
    netWorth,
    allCarried,
  });

  it("leads with the change since the first month, worded the same up or down", () => {
    expect(chartSummary([point("2026-05", 200000), point("2026-10", 215000)], "2026-11", gbp)).toBe(
      "Up £15,000 since May 2026.",
    );
    expect(chartSummary([point("2026-05", 215000), point("2026-10", 200000)], "2026-11", gbp)).toBe(
      "Down £15,000 since May 2026.",
    );
  });

  it("says the dashed end is this month's saved balances only when this month is not recorded", () => {
    expect(
      chartSummary(
        [point("2026-09", 1000), point("2026-10", 1000), point("2026-11", 1500, true)],
        "2026-11",
        gbp,
      ),
    ).toBe(
      "Up £500 since September 2026. The dashed end is this month's saved balances, not yet recorded.",
    );
    expect(
      chartSummary(
        [point("2026-08", 1000), point("2026-09", 1000, true), point("2026-10", 1000)],
        "2026-11",
        gbp,
      ),
    ).toBe("No change since August 2026. Months with no check-in show as a dashed line.");
  });
});

describe("sentences", () => {
  it("adds a full stop between sentences and skips empty ones", () => {
    expect(sentences("Against October 2026", "Not counting your student loan.")).toBe(
      "Against October 2026. Not counting your student loan.",
    );
    expect(sentences("Against October 2026", "")).toBe("Against October 2026");
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
      within(screen.getByTestId("snapshot-empty")).getByRole("button", {
        name: "Start monthly check-in",
      }),
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
    // Breathing room moved to Budget; no projection, so no notice.
    expect(screen.queryByText(/Months of cover/)).toBeNull();
    expect(screen.queryByText(/Projection|Estimate/)).toBeNull();
    expectPageRules(container, { maxFigures: 4, maxNotSet: 0, projectionNotices: 0 });
    expectPageRules(firstView(), { maxFigures: 4 });
    await userEvent.click(screen.getByRole("button", { name: "Start monthly check-in" }));
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
  });

  it("shows the next check-in date once this month is recorded", () => {
    renderPage({
      accountDetails: [row(CURRENT, 2026, 10, 2000), row(CURRENT, 2026, 11, 2100)],
    });
    expect(screen.getByText("Next check-in: 1 December 2026")).toBeDefined();
    expect(screen.queryByText(/not recorded yet/)).toBeNull();
    // This month is recorded: compared with the month before, named, and no prompt or link.
    const hero = screen.getByTestId("hero-figure");
    expect(hero.textContent).toContain("+£100");
    expect(hero.textContent).toContain("October to November 2026.");
    expect(screen.queryByTestId("snapshot-hero-check-in")).toBeNull();
  });

  it("with this month recorded after a gap, still names the months compared", () => {
    renderPage({
      accountDetails: [
        row(CURRENT, 2026, 7, 2000),
        row(CURRENT, 2026, 8, 2400),
        row(CURRENT, 2026, 11, 2100),
      ],
    });
    const hero = screen.getByTestId("hero-figure");
    // August to November: the carried September and October are skipped, never a change of zero.
    expect(hero.textContent).toContain("-£300");
    expect(hero.textContent).toContain("August to November 2026.");
    expect(screen.queryByTestId("snapshot-hero-check-in")).toBeNull();
  });

  it("with one month recorded and this month not recorded, shows no change and no prompt", () => {
    renderPage({ accountDetails: [row(CURRENT, 2026, 11, 2000)] });
    expect(screen.getByTestId("hero-figure").textContent).not.toMatch(/£| to /);
    expect(screen.queryByTestId("snapshot-hero-check-in")).toBeNull();
  });

  it("the not recorded prompt opens the monthly check-in", async () => {
    renderPage({ accountDetails: [row(CURRENT, 2026, 9, 2000), row(CURRENT, 2026, 10, 2100)] });
    const link = screen.getByRole("link", { name: "November not recorded yet" });
    // A real link to the check-in before hydration, the same as the dashboard's check-in row.
    expect(link.getAttribute("href")).toBe("/app/accounts/history?checkIn=1");
    expect(within(screen.getByTestId("hero-figure")).getByRole("link")).toBe(link);
    await userEvent.click(link);
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
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
    expect(hero.textContent).toContain("Net worth change");
    expect(hero.textContent).not.toContain("since last month");
    expect(hero.textContent).toContain("September to October 2026. November not recorded yet.");
    expect(screen.getByText(fewMonthsPrompt(2))).toBeDefined();
    expect(screen.queryByTestId("net-worth-history-chart")).toBeNull();
    expect(screen.queryByText(/Next check-in/)).toBeNull();
    expectPageRules(container, { maxFigures: 6, projectionNotices: 0 });
    // One quiet drawer, no tabs, holding each account's effect on net worth.
    await userEvent.click(screen.getByRole("button", { name: "Show changes by account" }));
    expect(screen.queryByRole("tab")).toBeNull();
    const mortgage = screen.getByRole("rowheader", { name: "Mortgage (owed)" }).closest("tr");
    // The mortgage fell by £500, which raised net worth by £500.
    expect(mortgage?.textContent).toContain("+£500");
    expectPageRules(firstView(), { maxFigures: 4 });
  });

  it("with three or more months, shows the hero change, the chart with its summary and the tables", async () => {
    const { container } = renderPage({ accountDetails: TREND });
    expect(screen.getByTestId("hero-figure").textContent).toContain("-£200");
    // October against August: the carried September is skipped.
    expect(screen.getByTestId("hero-figure").textContent).toContain(
      "August to October 2026. November not recorded yet.",
    );
    expect(screen.getByTestId("net-worth-history-chart")).toBeDefined();
    // The takeaway, then the dashed months in words (no legend): September has no check-in, and
    // November is this month's saved balances.
    expect(
      screen.getByText(
        "Down £100 since July 2026. Months with no check-in show as a dashed line. The dashed end is this month's saved balances, not yet recorded.",
      ),
    ).toBeDefined();
    expect(screen.queryByText(/The chart appears after/)).toBeNull();
    expect(screen.queryByTestId("net-worth-history-legend")).toBeNull();
    // The header holds the one primary button; back-fill is a quiet link beside "Show data".
    const header = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(within(header).getAllByRole("button")).toHaveLength(1);
    expect(within(header).getByRole("button", { name: "Start monthly check-in" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Start monthly check-in" })).toHaveLength(1);
    const backfill = screen.getByTestId("snapshot-open-backfill");
    const showData = screen.getByRole("button", { name: "Show data" });
    // One row, one style: the link and "Show data" share a parent row.
    expect(backfill.parentElement?.parentElement).toBe(showData.parentElement?.parentElement);
    // The whole page view, drawer closed (P1.3 target for history: 6).
    expectPageRules(container, { maxFigures: 6, projectionNotices: 0 });
    expectPageRules(firstView(), { maxFigures: 4 });

    // The change by account sits behind one quiet drawer; no "By month" tab (the chart's "Show
    // data" table already lists every month).
    const toggle = screen.getByRole("button", { name: "Show changes by account" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByTestId("snapshot-change-accounts")).toBeDefined();
    expect(screen.queryByRole("table", { name: "Net worth change by month" })).toBeNull();
  });

  it("opens the check-in on arrival from the dashboard link", () => {
    renderPage({ initialSheet: "checkIn" });
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
  });

  it("opened from the URL, Escape returns focus to Start monthly check-in, not the page body", async () => {
    renderPage({ accountDetails: TREND, initialSheet: "checkIn" });
    expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Start monthly check-in" }),
      ),
    );
  });

  it("opens back-fill from Add earlier months", async () => {
    renderPage({ accountDetails: [row(CURRENT, 2026, 10, 2000)] });
    await userEvent.click(screen.getByRole("button", { name: "Add earlier months" }));
    expect(screen.getByRole("dialog", { name: "Add an earlier month" })).toBeDefined();
  });

  describe("net worth choices", () => {
    const twoMonths = [row(CURRENT, 2026, 9, 2000), row(CURRENT, 2026, 10, 2100)];

    it("under the default choices with no student loan, the hero subline adds nothing", () => {
      renderPage({ accountDetails: twoMonths });
      expect(screen.queryByText(/Not counting/)).toBeNull();
    });

    it("with property switched off, the hero subline says what it leaves out, with no line below", () => {
      renderPage({
        accountDetails: twoMonths,
        basis: { countProperty: false, countStudentLoan: false },
      });
      expect(screen.getByTestId("hero-figure").textContent).toContain(
        "September to October 2026. November not recorded yet. Not counting your mortgage.",
      );
      expect(screen.queryByTestId("snapshot-net-worth-basis")).toBeNull();
      expect(screen.queryByRole("link", { name: "Change what counts" })).toBeNull();
    });

    it("a renter's student loan folds into the subline with one month recorded too", () => {
      renderPage({
        accounts: [
          ...accounts.slice(0, 1),
          { id: MORTGAGE, name: "Student loan", type: "Student Loan" },
        ],
        accountDetails: [row(CURRENT, 2026, 10, 2000)],
      });
      expect(screen.getByTestId("hero-figure").textContent).toContain(
        "Not counting your student loan.",
      );
    });
  });
});

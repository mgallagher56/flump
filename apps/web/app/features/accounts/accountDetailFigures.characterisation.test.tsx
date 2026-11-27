import { within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import customRender from "~/testUtils/customRender";

/**
 * Characterisation of the account page's figures today (E12 S6), written against the code before
 * the figures moved into `@flump/finance-engine`: the hero, the goal section's earliest month, the
 * balance history chart's months and its change line. They render the account page with its loader
 * data mocked, so this file stays byte for byte the same across the move. Every expected value is
 * worked by hand in a comment (law 14).
 */

const mocks = vi.hoisted(() => ({ mockUseLoaderData: vi.fn() }));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRouteLoaderData: () => undefined,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString("en-GB")}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

const GOAL = {
  id: "g1",
  accountId: "a1",
  targetAmount: 100000,
  targetDate: null,
  label: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const renderAccount = (
  account: Record<string, unknown>,
  accountDetails: unknown[],
  goal = null,
) => {
  mocks.mockUseLoaderData.mockReturnValue({
    account: { id: "a1", ...account },
    accountDetails,
    goal,
  });
  return customRender(<AccountDetailContainer />);
};

/** The hero's figure as shown, "£1,500". */
const heroAmount = (getByTestId: (id: string) => HTMLElement): string =>
  getByTestId("hero-figure").textContent?.match(/£[\d,]+/)?.[0] ?? "";

/** The "Show data" table's rows: month, balance and source, oldest first. */
const chartRows = async (view: ReturnType<typeof renderAccount>): Promise<string[][]> => {
  await view.user.click(view.getByRole("button", { name: "Show data" }));
  const table = view.getByRole("table", { name: /balance history by month$/ });
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent ?? ""));
};

describe("account page figures", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 14 November 2026: the current London month is November 2026.
    vi.setSystemTime(new Date(2026, 10, 14, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("the hero", () => {
    test("shows the saved balance", () => {
      // Saved 1,500 (October's recorded 1,000 is history).
      const { getByTestId } = renderAccount({ name: "Easy saver", type: "Saving", balance: 1500 }, [
        { month: 10, year: 2026, value: 1000 },
      ]);
      expect(heroAmount(getByTestId)).toBe("£1,500");
    });

    test("shows a debt as the positive amount owed", () => {
      // Stored -186,000, shown as 186,000 owed.
      const { getByTestId } = renderAccount(
        { name: "Home loan", type: "Mortgage", balance: -186000 },
        [{ month: 10, year: 2026, value: -186500 }],
      );
      expect(getByTestId("hero-figure").textContent).toContain("Amount owed");
      expect(heroAmount(getByTestId)).toBe("£186,000");
    });

    test("with no history shows the saved balance", () => {
      const { getByTestId } = renderAccount(
        { name: "Easy saver", type: "Saving", balance: 1500 },
        [],
      );
      expect(heroAmount(getByTestId)).toBe("£1,500");
    });

    test("with no history and no saved balance shows nothing as £0", () => {
      const { getByTestId } = renderAccount(
        { name: "Easy saver", type: "Saving", balance: null },
        [],
      );
      expect(heroAmount(getByTestId)).toBe("£0");
    });

    test("shows a joint account's share", () => {
      // Saved 1,000 x 50% = 500.
      const { getByTestId } = renderAccount(
        {
          name: "Joint saver",
          type: "Saving",
          balance: 1000,
          ownership: "joint",
          sharePercent: 50,
        },
        [{ month: 10, year: 2026, value: 1000 }],
      );
      expect(heroAmount(getByTestId)).toBe("£500");
    });

    test("after a future-month row a debt shows the latest month up to now as the amount owed", () => {
      // December 2026 is after November, so the hero takes October's -2,400 as 2,400 owed, not the
      // saved -2,600.
      const { getByTestId } = renderAccount({ name: "Card", type: "Credit Card", balance: -2600 }, [
        { month: 10, year: 2026, value: -2400 },
        { month: 12, year: 2026, value: -2600 },
      ]);
      expect(heroAmount(getByTestId)).toBe("£2,400");
    });

    test("after a future-month row a joint account shows the whole balance (condition 2a)", () => {
      // The latest month up to now is October's 1,000. The share: 1,000 x 50% = 500. Pinned at
      // today's whole £1,000, fixed in a later commit.
      const { getByTestId } = renderAccount(
        {
          name: "Joint saver",
          type: "Saving",
          balance: 1200,
          ownership: "joint",
          sharePercent: 50,
        },
        [
          { month: 10, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 1200 },
        ],
      );
      expect(heroAmount(getByTestId)).toBe("£1,000");
    });
  });

  describe("the goal section's earliest month", () => {
    test("measures the change from the earliest month up to now against the hero", () => {
      // December 2026 is a future month, so the hero is March's 1,200, not the saved 1,500.
      // Earliest month up to now: January 2026, 1,000. 1,200 - 1,000 = +200 since January.
      const { getByTestId } = renderAccount(
        { name: "Easy saver", type: "Saving", balance: 1500 },
        [
          { month: 3, year: 2026, value: 1200 },
          { month: 1, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 3000 },
        ],
        GOAL as never,
      );
      expect(getByTestId("account-goal-progress").textContent).toBe(
        "Balance changed by +£200 since January.",
      );
    });

    test("a debt's earliest month is the amount owed then", () => {
      // Hero 9,000 owed (saved -9,000). Earliest: January 2026, -10,000 shown as 10,000 owed.
      // 9,000 - 10,000 = -1,000: £1,000 paid off.
      const { getByTestId } = renderAccount(
        { name: "Car loan", type: "Loan", balance: -9000 },
        [
          { month: 1, year: 2026, value: -10000 },
          { month: 10, year: 2026, value: -9500 },
        ],
        GOAL as never,
      );
      expect(getByTestId("account-goal-progress").textContent).toBe(
        "£1,000 paid off since January.",
      );
    });

    test("with one month only there is no earliest month to measure from", () => {
      const { queryByTestId } = renderAccount(
        { name: "Easy saver", type: "Saving", balance: 1500 },
        [{ month: 10, year: 2026, value: 1000 }],
        GOAL as never,
      );
      expect(queryByTestId("account-goal-progress")).toBeNull();
    });
  });

  describe("the balance history chart", () => {
    test("ends on this month's saved balance when this month is not recorded", async () => {
      // September 1,000, October 1,200 (calculated), then November's saved 1,300 as the dashed
      // end. December's 9,999 is future and left out. 1,300 - 1,000 = up 300 since September.
      const view = renderAccount({ name: "Easy saver", type: "Saving", balance: 1300 }, [
        { month: 10, year: 2026, value: 1200, source: "calculated" },
        { month: 9, year: 2026, value: 1000 },
        { month: 12, year: 2026, value: 9999 },
      ]);
      expect(
        view.getByText(
          "Up £300 since September 2026. The dashed end is this month's saved balance, not yet recorded.",
        ),
      ).toBeDefined();
      expect(await chartRows(view)).toEqual([
        ["September 2026", "£1,000", "Recorded"],
        ["October 2026", "£1,200", "Calculated"],
        ["November 2026", "£1,300", "Saved balance"],
      ]);
    });

    test("a debt's months are the amounts owed, and owing less reads as down", async () => {
      // 181,000 then 180,500 owed, then the saved 180,000 for November.
      // 180,000 - 181,000 = down 1,000 since September.
      const view = renderAccount({ name: "Home loan", type: "Mortgage", balance: -180000 }, [
        { month: 9, year: 2026, value: -181000 },
        { month: 10, year: 2026, value: -180500 },
      ]);
      expect(
        view.getByText(
          "Down £1,000 since September 2026. The dashed end is this month's saved balance, not yet recorded.",
        ),
      ).toBeDefined();
      expect(await chartRows(view)).toEqual([
        ["September 2026", "£181,000", "Recorded"],
        ["October 2026", "£180,500", "Recorded"],
        ["November 2026", "£180,000", "Saved balance"],
      ]);
    });

    test("adds no saved point when this month is recorded", async () => {
      // October 100, November 120 recorded; the saved 150 is not added. 120 - 100 = up 20.
      const view = renderAccount({ name: "Easy saver", type: "Saving", balance: 150 }, [
        { month: 10, year: 2026, value: 100 },
        { month: 11, year: 2026, value: 120 },
      ]);
      expect(view.getByText("Up £20 since October 2026.")).toBeDefined();
      expect(await chartRows(view)).toEqual([
        ["October 2026", "£100", "Recorded"],
        ["November 2026", "£120", "Recorded"],
      ]);
    });

    test("says no change when the first and last months are the same", () => {
      const view = renderAccount({ name: "Easy saver", type: "Saving", balance: 500 }, [
        { month: 10, year: 2026, value: 500 },
        { month: 11, year: 2026, value: 500 },
      ]);
      expect(view.getByText("No change since October 2026.")).toBeDefined();
    });

    test("a joint account's months are whole balances, not the share the hero shows", async () => {
      // Pinned as today: the chart applies no joint share. September 800, October 900 and the saved
      // 1,000 are the whole balances, while the hero shows 1,000 x 50% = 500.
      const view = renderAccount(
        {
          name: "Joint current",
          type: "Current",
          balance: 1000,
          ownership: "joint",
          sharePercent: 50,
        },
        [
          { month: 9, year: 2026, value: 800 },
          { month: 10, year: 2026, value: 900 },
        ],
      );
      expect(heroAmount(view.getByTestId)).toBe("£500");
      expect(await chartRows(view)).toEqual([
        ["September 2026", "£800", "Recorded"],
        ["October 2026", "£900", "Recorded"],
        ["November 2026", "£1,000", "Saved balance"],
      ]);
    });
  });
});

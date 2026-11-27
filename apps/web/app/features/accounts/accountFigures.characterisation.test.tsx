import { within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { chartSummary } from "~/features/snapshot/components/SnapshotHistoryPage/SnapshotHistoryPage";
import customRender from "~/testUtils/customRender";
import { buildWorkspacePicture } from "~/utils/financialPicture";

/**
 * Characterisation of the account figures web works out today (E12 S6), written against the code
 * before the figures moved into `@flump/finance-engine`. They read the figures through surfaces
 * that the move leaves alone (the list rows' builder, the rendered accounts list and the history
 * chart summary), so this file stays byte for byte the same across the move. Every expected value
 * is worked by hand in a comment (law 14).
 */

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useRouteLoaderData: () => undefined,
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ search: "", pathname: "/app/accounts" }),
    useSearchParams: () => [mocks.searchParams, () => {}],
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString("en-GB")}`,
  }),
}));

// 14 November 2026: the current London month is November 2026.
const NOW = new Date(2026, 10, 14, 12);

describe("account list rows (balance, change and favourable)", () => {
  const rows = buildAccountRows(
    [
      { id: "a1", name: "Everyday", type: "Current", balance: 1500 },
      { id: "a2", name: "Rainy day", type: "Saving" },
      { id: "a3", name: "Stray only", type: "Saving" },
      { id: "d1", name: "Card", type: "Credit Card", balance: -1200 },
      { id: "d2", name: "Car loan", type: "Loan", balance: -3300 },
      { id: "d3", name: "Flat loan", type: "Loan", balance: -500 },
      { id: "s1", name: "Bonus saver", type: "Saving", balance: 900 },
      { id: "s2", name: "New saver", type: "Saving", balance: 100 },
      {
        id: "j1",
        name: "Joint current",
        type: "Current",
        balance: 2000,
        ownership: "joint",
        sharePercent: 50,
      },
      {
        id: "j2",
        name: "Joint mortgage",
        type: "Mortgage",
        balance: -200000,
        ownership: "joint",
        sharePercent: 40,
      },
    ],
    [
      { account_id: "a1", month: 9, year: 2026, value: 1000 },
      { account_id: "a1", month: 10, year: 2026, value: 1200 },
      // A future month (December 2026) never counts.
      { account_id: "a1", month: 12, year: 2026, value: 9999 },
      { account_id: "a2", month: 10, year: 2026, value: 800 },
      { account_id: "a2", month: 11, year: 2026, value: 900 },
      { account_id: "a2", month: 12, year: 2026, value: 5000 },
      // A stray row with no account id belongs to no account in the list.
      { month: 10, year: 2026, value: 5 },
      { account_id: "d1", month: 10, year: 2026, value: -1500 },
      { account_id: "d2", month: 10, year: 2026, value: -3000 },
      { account_id: "d3", month: 10, year: 2026, value: -500 },
      { account_id: "s1", month: 10, year: 2026, value: 1000 },
      { account_id: "s2", month: 10, year: 2026, value: 0 },
      { accountId: "j1", month: 10, year: 2026, value: 1500 },
      { account_id: "j2", month: 10, year: 2026, value: -205000 },
    ],
    NOW,
  );
  const byId = (id: string) => rows.find((row) => row.id === id);

  test("an asset shows its saved balance and the change against the latest earlier month", () => {
    // Saved 1,500 (not October's 1,200, and not December's future 9,999). Against October:
    // (1,500 - 1,200) / 1,200 = 25%. An asset going up is good news.
    expect(byId("a1")).toMatchObject({ balance: 1500, changePercent: 25, favourable: true });
  });

  test("with no saved balance the latest month up to now is shown, not a future one", () => {
    // November's 900 (December's 5,000 is future). Against October's 800:
    // (900 - 800) / 800 = 12.5%, rounded half up to 13.
    expect(byId("a2")).toMatchObject({ balance: 900, changePercent: 13, favourable: true });
  });

  test("a stray row with no account id counts for no account", () => {
    // a3's only row has no account id, so it has no balance and no change.
    expect(byId("a3")).toMatchObject({ balance: undefined, changePercent: null, favourable: true });
  });

  test("a debt shows the amount owed, and a falling debt is good news", () => {
    // Owed 1,200, was 1,500: (1,200 - 1,500) / 1,500 = -20%. Owing less is good news.
    expect(byId("d1")).toMatchObject({ balance: 1200, changePercent: -20, favourable: true });
  });

  test("a rising debt is not good news", () => {
    // Owed 3,300, was 3,000: (3,300 - 3,000) / 3,000 = +10%. Owing more is not good news.
    expect(byId("d2")).toMatchObject({ balance: 3300, changePercent: 10, favourable: false });
  });

  test("an unchanged debt reads as no change, which counts as favourable", () => {
    // Owed 500, was 500: 0%, and no change is never shown as bad news.
    expect(byId("d3")).toMatchObject({ balance: 500, changePercent: 0, favourable: true });
  });

  test("a falling asset is not good news", () => {
    // 900 against 1,000: (900 - 1,000) / 1,000 = -10%.
    expect(byId("s1")).toMatchObject({ balance: 900, changePercent: -10, favourable: false });
  });

  test("an earlier month of zero gives no percentage", () => {
    // October was 0, so there is no percentage change to show.
    expect(byId("s2")).toMatchObject({ balance: 100, changePercent: null, favourable: true });
  });

  test("a joint account at 50% shows half, and compares half with half", () => {
    // 2,000 x 50% = 1,000; October 1,500 x 50% = 750. (1,000 - 750) / 750 = 33.3%, rounded 33.
    expect(byId("j1")).toMatchObject({
      balance: 1000,
      changePercent: 33,
      favourable: true,
      ownership: "joint",
      sharePercent: 50,
    });
  });

  test("a joint debt at 40% shows the user's share of the amount owed", () => {
    // 200,000 owed x 40% = 80,000; October 205,000 x 40% = 82,000.
    // (80,000 - 82,000) / 82,000 = -2.44%, rounded -2. Owing less is good news.
    expect(byId("j2")).toMatchObject({
      balance: 80000,
      changePercent: -2,
      favourable: true,
      ownership: "joint",
      sharePercent: 40,
    });
  });

  test("every account gets one row, in the order given", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "a1",
      "a2",
      "a3",
      "d1",
      "d2",
      "d3",
      "s1",
      "s2",
      "j1",
      "j2",
    ]);
  });
});

describe("the accounts list groups (own, owe and not counted)", () => {
  const accounts = [
    { id: "c1", name: "Monzo", type: "Current", balance: 5000 },
    { id: "c2", name: "Starling", type: "Current", balance: -400 },
    { id: "h1", name: "Home (your estimate)", type: "Property", balance: 250000 },
    { id: "k1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
    { id: "m1", name: "Nationwide", type: "Mortgage", balance: -180000 },
    { id: "s1", name: "Plan 2", type: "Student Loan", balance: -20000 },
  ];

  const renderList = () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts,
      accountDetails: [],
      netWorth: buildWorkspacePicture({ accounts } as Parameters<typeof buildWorkspacePicture>[0])
        .netWorth,
    });
    return customRender(<AccountsContainer />);
  };

  /** Each row's text in a group's list, in the order shown. */
  const listRows = (getByRole: (role: string, o: { name: string }) => HTMLElement, name: string) =>
    within(getByRole("list", { name }))
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");

  test("an overdrawn current account sits under what you owe as the positive amount owed", () => {
    const { getByRole } = renderList();
    // Owned: Monzo 5,000 and the home 250,000, current accounts first.
    const own = listRows(getByRole, "What you own");
    expect(own).toHaveLength(2);
    expect(own[0]).toContain("Monzo");
    expect(own[0]).toContain("5,000");
    expect(own[1]).toContain("Home (your estimate)");
    expect(own[1]).toContain("250,000");
    // Owed, by type: Starling (a current account, -400 overdrawn, shown as 400 owed) first, then
    // the mortgage 180,000, then the card 1,200.
    const owe = listRows(getByRole, "What you owe");
    expect(owe).toHaveLength(3);
    expect(owe[0]).toContain("Starling");
    expect(owe[0]).toContain("400");
    expect(owe[0]).not.toContain("-");
    expect(owe[0]).not.toContain("−");
    expect(owe[1]).toContain("Nationwide");
    expect(owe[1]).toContain("180,000");
    expect(owe[2]).toContain("Barclaycard");
    expect(owe[2]).toContain("1,200");
    // The student loan is left out under the default choices, in its own group.
    const notCounted = listRows(getByRole, "Not counted in net worth");
    expect(notCounted).toHaveLength(1);
    expect(notCounted[0]).toContain("Plan 2");
    expect(notCounted[0]).toContain("20,000");
  });

  test("each total adds up to the rows above it", () => {
    const { getByText, getByTestId } = renderList();
    // Own: 5,000 + 250,000 = 255,000. Owe: 400 + 180,000 + 1,200 = 181,600.
    // Net worth: 255,000 - 181,600 = 73,400 (the student loan is not counted).
    const ownTotal = getByText("Total you own").parentElement?.textContent ?? "";
    const oweTotal = getByText("Total you owe").parentElement?.textContent ?? "";
    expect(ownTotal).toContain("255,000");
    expect(oweTotal).toContain("181,600");
    expect(getByTestId("accounts-net-worth").textContent).toContain("73,400");
  });
});

describe("the change line under the net worth history chart", () => {
  const gbp = (v: number) => `£${v.toLocaleString("en-GB")}`;
  const point = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });

  test.each([
    // 1,250.60 - 1,000.40 = 250.20, whole pounds 250.
    { first: 1000.4, last: 1250.6, line: "Up £250 since May 2026." },
    // 1,000.40 - 1,250.60 = -250.20, whole pounds -250.
    { first: 1250.6, last: 1000.4, line: "Down £250 since May 2026." },
    // 1,000.40 - 1,000 = 0.40, rounds to 0.
    { first: 1000, last: 1000.4, line: "No change since May 2026." },
    // 1,000.50 - 1,000 = 0.50, rounds up to 1.
    { first: 1000, last: 1000.5, line: "Up £1 since May 2026." },
    // 999.50 - 1,000 = -0.50, rounds to 0 (half rounds towards plus infinity).
    { first: 1000, last: 999.5, line: "No change since May 2026." },
    // 998.40 - 1,000 = -1.60, rounds to -2.
    { first: 1000, last: 998.4, line: "Down £2 since May 2026." },
  ])("first $first, last $last: $line", ({ first, last, line }) => {
    expect(
      chartSummary(
        [point("2026-05", first), point("2026-08", 7), point("2026-10", last)],
        "2026-12",
        gbp,
      ),
    ).toBe(line);
  });

  test("one month alone has no change line", () => {
    expect(chartSummary([point("2026-05", 1000)], "2026-12", gbp)).toBe("");
  });
});

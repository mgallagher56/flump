import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import type { AccountRow } from "../../accountRows";
import { AccountsGroupList } from "./AccountsGroupList";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-router");
  return {
    ...actual,
    useLoaderData: () => ({ accounts: [], bankConnectionsEnabled: false }),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useFetcher: () => ({ submit: vi.fn(), state: "idle", data: null, Form: "form" }),
  };
});

const row = (over: Partial<AccountRow>): AccountRow => ({
  id: "a1",
  name: "Monzo current",
  type: "Current",
  balance: 1200,
  changePercent: 4,
  favourable: true,
  ...over,
});

const props = { totalOwn: 0, totalOwe: 0, netWorth: 0, leftOut: [] };

describe("<AccountsGroupList />", () => {
  test("splits rows into what you own and what you owe, each a list with a total", () => {
    const { getByRole, getByText, getByTestId, queryByRole, queryByText } = customRender(
      <AccountsGroupList
        leftOut={[]}
        netWorth={12000}
        rows={[
          row({ id: "a1", name: "Monzo current", type: "Current", balance: 2000 }),
          row({ id: "h1", name: "Home (your estimate)", type: "Property", balance: 250000 }),
          row({ id: "m1", name: "Nationwide", type: "Mortgage", balance: 240000 }),
        ]}
        totalOwe={240000}
        totalOwn={252000}
      />,
    );
    const own = getByRole("list", { name: "What you own" });
    const owe = getByRole("list", { name: "What you owe" });
    expect(own.textContent).toContain("Home (your estimate)");
    expect(own.textContent).toContain("Property");
    expect(queryByRole("table")).toBeNull();
    expect(queryByRole("columnheader")).toBeNull();
    expect(owe.textContent).toContain("Nationwide");
    // A total shows only for a group with more than one row.
    expect(getByText("Total you own").nextElementSibling?.textContent).toBe("£252,000");
    expect(queryByText("Total you owe")).toBeNull();
    expect(getByTestId("accounts-net-worth").textContent).toContain("£12,000");
  });

  test("shows no change column: change on last month lives on the account page", () => {
    const { queryByText } = customRender(<AccountsGroupList {...props} rows={[row({})]} />);
    expect(queryByText(/on last month/i)).toBeNull();
    expect(queryByText("No earlier month")).toBeNull();
  });

  test("shows whole pounds, never pence", () => {
    const { container } = customRender(
      <AccountsGroupList {...props} rows={[row({ balance: 2450.5 })]} />,
    );
    expect(container.textContent).toContain("£2,451");
    expect(container.textContent).not.toContain(".50");
  });

  test("links an ISA row to its allowance on the savings page", () => {
    const { getByRole } = customRender(
      <AccountsGroupList
        {...props}
        rows={[row({ id: "i1", name: "Vanguard stocks and shares ISA", type: "Investment" })]}
      />,
    );
    expect(getByRole("link", { name: "See your ISA allowance" }).getAttribute("href")).toBe(
      "/app/savings",
    );
  });

  test("shows the type under the name only when it differs from the name", () => {
    const { getByRole } = customRender(
      <AccountsGroupList
        {...props}
        rows={[
          row({ id: "a1", name: "Monzo current", type: "Current" }),
          row({ id: "a2", name: "Savings", type: "Savings" }),
        ]}
      />,
    );
    const own = getByRole("list", { name: "What you own" });
    const items = own.querySelectorAll("li");
    expect(items[0]?.textContent).toContain("Current account");
    expect(items[1]?.textContent).not.toContain("SavingsSavings");
    expect(items[1]?.textContent?.match(/Savings/g)?.length).toBe(1);
  });

  test("keeps rows beyond the first eight behind Show all", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row({ id: `a${i}`, name: `Account ${i}` }));
    const { getByRole } = customRender(<AccountsGroupList {...props} rows={rows} />);
    expect(getByRole("button", { name: /Show all 10 accounts/ })).toBeDefined();
    expect(getByRole("list", { name: "What you own" }).querySelectorAll("li").length).toBe(8);
  });

  test("puts a left-out student loan in its own group with a footnote and no total", () => {
    const { getByText, getByTestId, getByRole, queryByText } = customRender(
      <AccountsGroupList
        {...props}
        leftOut={["studentLoan"]}
        rows={[row({ id: "s1", name: "SLC", type: "Student Loan" })]}
      />,
    );
    expect(getByRole("list", { name: "Not counted in net worth" }).textContent).toContain("SLC");
    expect(queryByText("What you owe")).toBeNull();
    expect(queryByText("Total you owe")).toBeNull();
    expect(
      getByText(
        "Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.",
      ),
    ).toBeDefined();
    expect(getByTestId("accounts-net-worth-basis").textContent).toBe(
      "Not counting your student loan. Change what counts",
    );
  });

  test("puts left-out property and mortgage in the not counted group", () => {
    const { getByRole } = customRender(
      <AccountsGroupList
        {...props}
        leftOut={["property", "mortgage"]}
        rows={[
          row({ id: "a1", name: "Monzo current", type: "Current" }),
          row({ id: "h1", name: "Home", type: "Property", balance: 250000 }),
          row({ id: "m1", name: "Nationwide", type: "Mortgage", balance: 240000 }),
        ]}
      />,
    );
    const notCounted = getByRole("list", { name: "Not counted in net worth" });
    expect(notCounted.textContent).toContain("Home");
    expect(notCounted.textContent).toContain("Nationwide");
    expect(getByRole("list", { name: "What you own" }).textContent).not.toContain("Home");
  });

  test("links to the net worth history and renders the afterNetWorth slot", () => {
    const { getByRole, getByTestId } = customRender(
      <AccountsGroupList
        {...props}
        afterNetWorth={
          <button id="slot" type="button">
            Slot
          </button>
        }
        rows={[row({})]}
      />,
    );
    expect(getByRole("link", { name: "See how it has changed" }).getAttribute("href")).toBe(
      "/app/accounts/history",
    );
    expect(getByTestId("slot")).toBeDefined();
  });

  test("the footnote follows the choice when the student loan counts", () => {
    const { getByText, getByRole } = customRender(
      <AccountsGroupList
        {...props}
        rows={[row({ id: "s1", name: "SLC", type: "Student Loan" })]}
      />,
    );
    expect(getByText(/Student loans are in this total and your net worth/)).toBeDefined();
    // The student loan row stays in the list with its balance.
    expect(getByRole("link", { name: "SLC" })).toBeDefined();
  });

  test("with nothing left out, net worth still links to what counts", () => {
    const { getByTestId } = customRender(<AccountsGroupList {...props} rows={[row({})]} />);
    const line = getByTestId("accounts-net-worth-basis");
    expect(line.textContent).toBe("Change what counts");
    expect(line.querySelector("a")?.getAttribute("href")).toBe(
      "/app/profile?tab=profile#net-worth",
    );
  });

  test("puts an overdrawn current account under what you owe, as the amount owed", () => {
    const { getByRole } = customRender(
      <AccountsGroupList
        {...props}
        rows={[
          row({ id: "c1", name: "Everyday", type: "Current", balance: -200 }),
          row({ id: "v1", name: "Saver", type: "Saving", balance: 500 }),
        ]}
      />,
    );
    const owe = getByRole("list", { name: "What you owe" });
    const own = getByRole("list", { name: "What you own" });
    expect(owe.textContent).toContain("Everyday");
    expect(owe.textContent).toContain("£200");
    expect(owe.textContent).not.toContain("-");
    expect(own.textContent).not.toContain("Everyday");
  });
});

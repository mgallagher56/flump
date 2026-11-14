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
  test("splits rows into what you own and what you owe, each with a type column and total", () => {
    const { getByRole, getByText } = customRender(
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
    const own = getByRole("table", { name: "What you own" });
    const owe = getByRole("table", { name: "What you owe" });
    expect(own.textContent).toContain("Home (your estimate)");
    expect(own.textContent).toContain("Property");
    expect(owe.textContent).toContain("Nationwide");
    expect(getByRole("columnheader", { name: "Amount owed" })).toBeDefined();
    expect(getByText("Total you own").nextElementSibling?.textContent).toBe("£252,000");
    expect(getByText("Total you owe").nextElementSibling?.textContent).toBe("£240,000");
    expect(getByText("Net worth").nextElementSibling?.textContent).toBe("£12,000");
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

  test("keeps rows beyond the first eight behind a quiet drawer", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row({ id: `a${i}`, name: `Account ${i}` }));
    const { getByRole } = customRender(<AccountsGroupList {...props} rows={rows} />);
    const trigger = getByRole("button", { name: /Show 2 more accounts/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("notes that a student loan is not in the total or net worth when it is left out", () => {
    const { getByText, getByTestId } = customRender(
      <AccountsGroupList
        {...props}
        leftOut={["studentLoan"]}
        rows={[row({ id: "s1", name: "SLC", type: "Student Loan" })]}
      />,
    );
    expect(getByText(/Student loans are not in this total or your net worth/)).toBeDefined();
    expect(getByTestId("accounts-net-worth-basis").textContent).toBe(
      "Not counting your student loan. Change what counts",
    );
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
});

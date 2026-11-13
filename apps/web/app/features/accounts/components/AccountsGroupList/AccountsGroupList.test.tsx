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

describe("<AccountsGroupList />", () => {
  test("groups accounts by type with a heading and a link to each account", () => {
    const { getByRole } = customRender(
      <AccountsGroupList
        rows={[
          row({}),
          row({
            id: "d1",
            name: "Barclaycard",
            type: "Credit Card",
            balance: 300,
            changePercent: -10,
          }),
        ]}
      />,
    );
    expect(getByRole("heading", { name: "Current" })).toBeDefined();
    expect(getByRole("heading", { name: "Credit Card" })).toBeDefined();
    expect(getByRole("link", { name: "Monzo current" }).getAttribute("href")).toBe(
      "/app/accounts/a1",
    );
  });

  test("states the change in words, not colour alone", () => {
    const { getByText } = customRender(
      <AccountsGroupList
        rows={[
          row({}),
          row({
            id: "a2",
            name: "Savings pot",
            type: "Current",
            changePercent: -3,
            favourable: false,
          }),
        ]}
      />,
    );
    expect(getByText("Up", { exact: false })).toBeDefined();
    expect(getByText("Down", { exact: false })).toBeDefined();
  });

  test("keeps rows past the eighth behind a drawer", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row({ id: `a${i}`, name: `Account ${i}` }));
    const { getByText } = customRender(<AccountsGroupList rows={rows} />);
    expect(getByText("2 more accounts")).toBeDefined();
  });

  test("shows Not set when there is no balance", () => {
    const { getByText } = customRender(
      <AccountsGroupList rows={[row({ balance: undefined, changePercent: null })]} />,
    );
    expect(getByText("Not set")).toBeDefined();
  });
});

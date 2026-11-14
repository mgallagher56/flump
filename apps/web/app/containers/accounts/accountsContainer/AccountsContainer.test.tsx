import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, waitFor } from "@testing-library/react";
import mockAccounts from "__mocks__/accounts";
import type { ReactNode } from "react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import AccountsContainer from "./AccountsContainer";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,

    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ search: "", pathname: "/app/accounts" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() }),
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: null,
      Form: "form",
    }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountsContainer />", () => {
  test("shows an empty state with one primary add button when no accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { getByText, container } = customRender(<AccountsContainer />);
    expect(getByText("No accounts yet")).toBeDefined();
    expectPageRules(container, { maxFigures: 0 });
    expect(container.querySelectorAll('[data-variant="primary"]').length).toBe(1);
  });

  test("first view: h1, one primary button, two groups and net worth once, no hero", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Monzo", type: "Current", balance: 5000 },
        { id: "i1", name: "Stocks and shares ISA", type: "Investment", balance: 12000 },
        { id: "h1", name: "Home (your estimate)", type: "Property", balance: 250000 },
        { id: "m1", name: "Nationwide", type: "Mortgage", balance: -180000 },
      ],
      accountDetails: [],
    });
    const { container, getByRole, getAllByText, queryByText } = customRender(<AccountsContainer />);
    expect(getByRole("heading", { level: 1, name: "Your accounts" })).toBeDefined();
    expect(getByRole("heading", { level: 2, name: "What you own" })).toBeDefined();
    expect(getByRole("heading", { level: 2, name: "What you owe" })).toBeDefined();
    expect(getByRole("list", { name: "What you own" }).textContent).toContain(
      "Home (your estimate)",
    );
    expect(getAllByText("Net worth")).toHaveLength(1);
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    // Two totals and net worth, plus one balance per account row (four here).
    expectPageRules(container, { maxFigures: 7, maxNotSet: 0, projectionNotices: 0 });
    for (const gone of [
      "Where you stand",
      "Where your assets sit",
      "ISA allowance",
      "Assets",
      "Liabilities",
    ]) {
      expect(queryByText(gone)).toBeNull();
    }
    expect(getByRole("link", { name: "See your ISA allowance" })).toBeDefined();
  });

  test("should open modal to add an account", async () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: mockAccounts });
    const { getAllByText } = customRender(<AccountsContainer />);
    const addAccountModalBtn = getAllByText("addAccount")[0];
    expect(addAccountModalBtn).toBeDefined();
    fireEvent.click(addAccountModalBtn);
    await waitFor(() => {
      expect(getAllByText("addAccount")[0]).toBeDefined();
    });
  });

  const netWorthText = (container: HTMLElement) =>
    container.querySelector("#accounts-net-worth dd")?.textContent;

  test("counts a negative stored liability as money owed, reducing net worth", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "d1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
        { id: "d2", name: "Arranged overdraft", type: "Overdraft", balance: -300 },
      ],
      accountDetails: [],
    });
    const { container } = customRender(<AccountsContainer />);
    const text = container.textContent ?? "";
    expect(text).toContain("£1,500");
    expect(netWorthText(container)).toBe("£3,500");
    expect(text).not.toContain("£-");
  });

  test("counts Property as an asset, not a liability", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "p1", name: "House", type: "Property", balance: 250000 },
        { id: "m1", name: "Mortgage", type: "Mortgage", balance: -100000 },
      ],
      accountDetails: [],
    });
    const { container } = customRender(<AccountsContainer />);
    expect(container.textContent).toContain("£255,000");
    expect(netWorthText(container)).toBe("£155,000");
  });

  test("counts Owed (money owed to the user) as something you own", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "w1", name: "John Smith", type: "Owed", balance: 500 },
        { id: "m1", name: "Card", type: "Credit Card", balance: -1000 },
      ],
      accountDetails: [],
    });
    const { container, getByRole } = customRender(<AccountsContainer />);
    expect(getByRole("list", { name: "What you own" }).textContent).toContain("John Smith");
    expect(container.textContent).toContain("£5,500");
    expect(netWorthText(container)).toBe("£4,500");
  });

  test("excludes a Student Loan from net worth and says so", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "s1", name: "SLC", type: "Student Loan", balance: -40000 },
      ],
      accountDetails: [],
    });
    const { container, getByText, getByRole } = customRender(<AccountsContainer />);
    expect(
      getByText(/Student loans are not in your net worth\. Repayments come out/),
    ).toBeDefined();
    expect(netWorthText(container)).toBe("£5,000");
    expect(getByRole("list", { name: "Not counted in net worth" }).textContent).toContain("SLC");
  });

  test("never shows bank connections, even when bank sync is enabled (deferred)", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
      bankConnections: [
        {
          id: "c1",
          institutionName: "Monzo Bank",
          status: "connected",
          lastSyncedAt: "2026-11-04T12:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      bankConnectionsEnabled: true,
    });
    const { queryByText } = customRender(<AccountsContainer />);
    expect(queryByText("Connected banks")).toBeNull();
    expect(queryByText("Monzo Bank")).toBeNull();
  });

  test("header has Update balances and Add account, with no View history", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
      accountDetails: [],
    });
    const { getByTestId, queryByText, container } = customRender(<AccountsContainer />);
    expect(getByTestId("accounts-open-check-in").textContent).toBe("Update balances");
    expect(queryByText("View history")).toBeNull();
    expect(container.querySelectorAll('[data-variant="primary"]').length).toBe(1);
  });

  test("a phone-only Update balances button sits under net worth", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
      accountDetails: [],
    });
    const { getByTestId } = customRender(<AccountsContainer />);
    expect(getByTestId("accounts-open-check-in-phone").textContent).toBe("Update balances");
  });
});

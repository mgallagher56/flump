import { fireEvent, waitFor } from "@testing-library/react";
import mockAccounts from "__mocks__/accounts";
import type { ReactNode } from "react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { currentMonth, currentYear } from "~/utils/utils";

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
  test("shows an empty state with an add button when no accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { getByText, queryByText } = customRender(<AccountsContainer />);
    expect(getByText("No accounts yet")).toBeDefined();
    expect(queryByText("Where you stand")).toBeNull();
  });

  test("renders one hero, a four-figure strip and accounts grouped by type", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: mockAccounts,
      accountDetails: [
        {
          id: 1,
          account_id: mockAccounts[0].id,
          month: currentMonth,
          year: currentYear,
          value: 1000,
        },
      ],
    });
    const { getByRole, getAllByRole } = customRender(<AccountsContainer />);
    expect(getByRole("heading", { level: 1, name: "Your accounts" })).toBeDefined();
    expect(getByRole("heading", { name: "Where you stand" })).toBeDefined();
    // Each type present in the data gets its own heading.
    const groupHeadings = getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(groupHeadings).toContain("Current");
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
    expect(text).toContain("£3,500");
    expect(text).not.toContain("£-");
  });

  const openOverview = () => customRender(<AccountsContainer />);

  test("counts Property as an asset, not a liability", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "p1", name: "House", type: "Property", balance: 250000 },
        { id: "m1", name: "Mortgage", type: "Mortgage", balance: -100000 },
      ],
      accountDetails: [],
    });
    const { container } = openOverview();
    const text = container.textContent ?? "";
    // assets 255,000, liabilities 100,000, net worth 155,000
    expect(text).toContain("£255,000");
    expect(text).toContain("£155,000");
    expect(text).toContain("Property");
  });

  test("counts Owed (money owed to the user) as an asset, not a liability", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "w1", name: "John Smith", type: "Owed", balance: 500 },
        { id: "m1", name: "Card", type: "Credit Card", balance: -1000 },
      ],
      accountDetails: [],
    });
    const text = openOverview().container.textContent ?? "";
    // assets 5,500, liabilities 1,000, net worth 4,500
    expect(text).toContain("£5,500");
    expect(text).toContain("£4,500");
  });

  test("excludes a Student Loan from net worth and shows it on its own line", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [
        { id: "a1", name: "Current", type: "Current", balance: 5000 },
        { id: "s1", name: "SLC", type: "Student Loan", balance: -40000 },
      ],
      accountDetails: [],
    });
    const { container, getByTestId } = openOverview();
    const line = getByTestId("student-loans-line");
    expect(line.textContent).toContain("Student loans (not in net worth): £40,000");
    expect(line.textContent).toContain("written off");
    const text = container.textContent ?? "";
    expect(text).toContain("Net worth");
    expect(text).toContain("£5,000");
    expect(text).not.toContain("£-35,000");
    expect(text).not.toContain("£35,000");
  });

  test("hides the student loan line when there is no student loan", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "a1", name: "Current", type: "Current", balance: 5000 }],
      accountDetails: [],
    });
    const { queryByTestId } = openOverview();
    expect(queryByTestId("student-loans-line")).toBeNull();
  });
});

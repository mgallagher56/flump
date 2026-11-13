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

vi.mock("app/components/core/cards/AccountsCard", () => ({ default: () => "AccountsCard" }));
vi.mock("app/components/core/input/FLPInput", () => ({ default: () => "FLPInput" }));
vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountsContainer />", () => {
  test("should render as expected when no accounts exist", () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  test("should render as expected when accounts exist", () => {
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
        {
          id: 2,
          account_id: mockAccounts[6].id,
          month: currentMonth,
          year: currentYear,
          value: 500,
        },
        {
          id: 3,
          account_id: mockAccounts[1].id,
          month: currentMonth - 1 || 12,
          year: currentMonth - 1 === 0 ? currentYear - 1 : currentYear,
          value: 800,
        },
      ],
    });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
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
    const { container, getByText } = customRender(<AccountsContainer />);
    fireEvent.mouseDown(getByText("Overview"));
    fireEvent.click(getByText("Overview"));
    const text = container.textContent ?? "";
    expect(text).toContain("£1,500");
    expect(text).toContain("£3,500");
    expect(text).not.toContain("£-");
  });

  const openOverview = () => {
    const view = customRender(<AccountsContainer />);
    fireEvent.mouseDown(view.getByText("Overview"));
    fireEvent.click(view.getByText("Overview"));
    return view;
  };

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
    expect(text).toContain("Total net worth");
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

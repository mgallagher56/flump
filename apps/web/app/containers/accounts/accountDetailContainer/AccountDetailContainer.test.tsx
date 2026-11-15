import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetailContainer, {
  accountCounts,
  balanceDateLine,
  ownerPageFor,
  typeSubtitle,
} from "./AccountDetailContainer";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
  mockUseLoaderData: vi.fn(() => ({
    account: {
      id: "123456",
      name: "My current account",
      type: "CURRENT",
      balance: 1000,
    },
    accountDetails: [
      {
        month: 1,
        year: 2021,
        value: 1000,
      },
      {
        month: 2,
        year: 2021,
        value: 1000,
      },
      {
        month: 3,
        year: 2021,
        value: 1000,
      },
      {
        month: 4,
        year: 2021,
        value: 1000,
      },
      {
        month: 5,
        year: 2021,
        value: 1000,
      },
      {
        month: 6,
        year: 2021,
        value: 1000,
      },
      {
        month: 7,
        year: 2021,
        value: 1000,
      },
      {
        month: 8,
        year: 2021,
        value: 1000,
      },
      {
        month: 9,
        year: 2021,
        value: 1000,
      },
      {
        month: 10,
        year: 2021,
        value: 1000,
      },
      {
        month: 11,
        year: 2021,
        value: 1000,
      },
      {
        month: 12,
        year: 2021,
        value: 1000,
      },
      {
        month: 1,
        year: 2023,
        value: 1000,
      },
      {
        month: 2,
        year: 2023,
        value: 1000,
      },
      {
        month: 3,
        year: 2023,
        value: 1000,
      },
      {
        month: 4,
        year: 2023,
        value: 1000,
      },
      {
        month: 5,
        year: 2023,
        value: 1000,
      },
      {
        month: 6,
        year: 2023,
        value: 1000,
      },
      {
        month: 7,
        year: 2023,
        value: 1000,
      },
      {
        month: 8,
        year: 2023,
        value: 1000,
      },
      {
        month: 9,
        year: 2023,
        value: 1000,
      },
      {
        month: 10,
        year: 2023,
        value: 1000,
      },
      {
        month: 11,
        year: 2023,
        value: 1000,
      },
      {
        month: 12,
        year: 2023,
        value: 1000,
      },
    ],
  })),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: null,
      Form: "form",
    }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountDetailContainer />", () => {
  test("shows the account name, one hero balance and the type label, with Edit in the header", () => {
    const { getByRole, getByText, queryByRole } = customRender(<AccountDetailContainer />);
    expect(getByRole("heading", { level: 1, name: "My current account" })).toBeDefined();
    expect(getByText("Current balance")).toBeDefined();
    expect(queryByRole("heading", { name: "Your account" })).toBeNull();
    expect(getByRole("button", { name: /edit/i })).toBeDefined();
  });

  test("shows the chart with no tabs, and no owner link for a current account", () => {
    const { getByRole, queryByRole, queryByTestId } = customRender(<AccountDetailContainer />);
    expect(queryByRole("tab")).toBeNull();
    expect(getByRole("figure", { name: "My current account balance history" })).toBeDefined();
    expect(queryByTestId("account-owner-link")).toBeNull();
  });

  test("hides the type line when the name already says it", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "m1", name: "Residential mortgage", type: "Mortgage", balance: -180000 },
      accountDetails: [],
    } as never);
    const { queryByText, getByRole, getByTestId } = customRender(<AccountDetailContainer />);
    expect(queryByText("Mortgage", { exact: true })).toBeNull();
    expect(getByRole("link", { name: "See your mortgage" }).getAttribute("href")).toBe(
      "/app/mortgage",
    );
    // The test id resolves (by id), so the current account's null query above proves absence.
    expect(getByTestId("account-owner-link").textContent).toBe("See your mortgage");
  });

  test("says a student loan is not counted under the default choices, and links to debts", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
    } as never);
    const { getByTestId, getByRole } = customRender(<AccountDetailContainer />);
    expect(getByTestId("hero-figure").textContent).toContain(
      "No monthly balances recorded yet. Not counted in your net worth.",
    );
    expect(getByRole("link", { name: "See your debts" }).getAttribute("href")).toBe("/app/debt");
  });

  test("says nothing about net worth when the account counts", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
      basis: { countProperty: true, countStudentLoan: true },
    } as never);
    const { queryByText } = customRender(<AccountDetailContainer />);
    expect(queryByText(/Not counted/)).toBeNull();
  });

  test("says nothing about net worth when the choices could not be read", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
      accountDetails: [],
      basis: null,
    } as never);
    const { getByTestId, queryByText } = customRender(<AccountDetailContainer />);
    expect(queryByText(/Not counted/)).toBeNull();
    expect(getByTestId("hero-figure").textContent).toContain("No monthly balances recorded yet");
  });

  test("back to accounts is a real link", () => {
    const { getByRole } = customRender(<AccountDetailContainer />);
    expect(getByRole("link", { name: /back to accounts/i }).getAttribute("href")).toBe(
      "/app/accounts",
    );
  });
  test("history is read-only: no edit, save or add-year controls", () => {
    const { queryByText } = customRender(<AccountDetailContainer />);
    for (const label of ["save", "addPrevYear", "addNextYear", "addCurrentYear"]) {
      expect(queryByText(label)).toBeNull();
    }
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });

  test("shows a negative stored liability balance as a positive amount owed", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: { id: "d1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
      accountDetails: [],
    } as never);
    const { queryAllByText } = customRender(<AccountDetailContainer />);
    expect(queryAllByText("£1,200").length).toBeGreaterThan(0);
    expect(queryAllByText("£-1,200").length).toBe(0);
  });

  describe("hero balance", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 14));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("shows the saved balance and names the month when the figure is not from this month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
        accountDetails: [{ month: 10, year: 2026, value: 1000 }],
      } as never);
      const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,500");
      expect(getByTestId("hero-figure").textContent).not.toContain("£1,000");
      expect(getByText("As of October")).toBeDefined();
    });

    test("shows the balance alone when it was recorded this month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1100 },
        accountDetails: [
          { month: 9, year: 2026, value: 1000 },
          { month: 11, year: 2026, value: 1100 },
        ],
      } as never);
      const { getByTestId } = customRender(<AccountDetailContainer />);
      const hero = getByTestId("hero-figure").textContent ?? "";
      expect(hero).toBe("Current balance£1,100");
      expect(hero).not.toMatch(/November|September|Up|%/);
    });

    test("says a calculated balance is calculated, naming its month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "m1", name: "Home loan", type: "Mortgage", balance: -186000 },
        accountDetails: [
          { month: 10, year: 2026, value: -186500 },
          { month: 11, year: 2026, value: -186000, source: "calculated" },
        ],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("Calculated for November")).toBeDefined();
    });

    test("adds the year when the last recorded month is in an earlier year", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 900 },
        accountDetails: [{ month: 12, year: 2025, value: 900 }],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("As of December 2025")).toBeDefined();
    });

    test("says no balances are recorded when there are none", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
        accountDetails: [],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("No monthly balances recorded yet")).toBeDefined();
    });

    test("keeps the not-counted sentence when the balance is otherwise alone", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "s1", name: "Plan 2", type: "Student Loan", balance: -25000 },
        accountDetails: [{ month: 11, year: 2026, value: -25000 }],
      } as never);
      const { getByTestId } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("Not counted in your net worth.");
      expect(getByTestId("hero-figure").textContent).not.toMatch(/November|As of/);
    });

    test("defect C(e): after a future-dated import the hero figure and date line come from the same month", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 2000 },
        accountDetails: [
          { month: 10, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 2000 },
        ],
      } as never);
      const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,000");
      expect(getByTestId("hero-figure").textContent).not.toContain("£2,000");
      expect(getByText("As of October")).toBeDefined();
    });
  });

  test("says what happened when the account cannot be found, with a way back", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({ account: null, accountDetails: [] } as never);
    const { getByText, getByRole } = customRender(<AccountDetailContainer />);
    expect(getByText("We cannot find that account.")).toBeDefined();
    expect(getByRole("link", { name: /back to accounts/i })).toBeDefined();
  });
});

describe("balanceDateLine", () => {
  const current = { month: 11, year: 2026 };
  test("names the month only when the figure is not from the current month", () => {
    expect(balanceDateLine({ current, latest: { month: 11, year: 2026 } })).toBeNull();
    expect(balanceDateLine({ current, latest: { month: 10, year: 2026 } })).toBe("As of October");
    expect(balanceDateLine({ current, latest: { month: 12, year: 2025 } })).toBe(
      "As of December 2025",
    );
  });
  test("says a calculated balance is calculated", () => {
    expect(
      balanceDateLine({ current, latest: { month: 11, year: 2026, source: "calculated" } }),
    ).toBe("Calculated for November");
    expect(
      balanceDateLine({ current, latest: { month: 10, year: 2026, source: "calculated" } }),
    ).toBe("Calculated for October");
  });
  test("says so when no monthly balance is recorded", () => {
    expect(balanceDateLine({ current, latest: null })).toBe("No monthly balances recorded yet");
  });
});

describe("typeSubtitle", () => {
  test("hides the type when the name contains it", () => {
    expect(typeSubtitle("Residential mortgage", "Mortgage")).toBeUndefined();
    expect(typeSubtitle("Student loan", "Student loan")).toBeUndefined();
    expect(typeSubtitle("Halifax", "Mortgage")).toBe("Mortgage");
  });
});

describe("accountCounts", () => {
  test("follows the net worth choices", () => {
    expect(accountCounts("Student Loan", undefined)).toBe(false);
    expect(accountCounts("Student Loan", { countProperty: true, countStudentLoan: true })).toBe(
      true,
    );
    expect(accountCounts("Mortgage", { countProperty: false, countStudentLoan: false })).toBe(
      false,
    );
    expect(accountCounts("Property", { countProperty: false, countStudentLoan: false })).toBe(
      false,
    );
    expect(accountCounts("Current", undefined)).toBe(true);
    expect(accountCounts("Student Loan", null)).toBeNull();
  });
});

describe("ownerPageFor", () => {
  test("links mortgages to the mortgage page and debts to the debts page", () => {
    expect(ownerPageFor("Mortgage")).toEqual({ to: "/app/mortgage", label: "See your mortgage" });
    for (const type of ["Loan", "Credit Card", "Overdraft", "Student Loan"]) {
      expect(ownerPageFor(type)).toEqual({ to: "/app/debt", label: "See your debts" });
    }
    expect(ownerPageFor("Saving")).toBeNull();
  });
});

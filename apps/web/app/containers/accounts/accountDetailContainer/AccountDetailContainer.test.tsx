import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetailContainer, { changeLine } from "./AccountDetailContainer";

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
  test("shows the account name, one hero balance and the Your account zone", () => {
    const { getByRole, getByText } = customRender(<AccountDetailContainer />);
    expect(getByRole("heading", { level: 1, name: "My current account" })).toBeDefined();
    expect(getByText("Current balance")).toBeDefined();
    expect(getByRole("heading", { name: "Your account" })).toBeDefined();
    expect(getByText("Saved")).toBeDefined();
  });

  test("keeps the ledger on its own tab, with the chart first", () => {
    const { getByRole } = customRender(<AccountDetailContainer />);
    expect(getByRole("tab", { name: "Balance over time" })).toBeDefined();
    expect(getByRole("tab", { name: "Month by month" })).toBeDefined();
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

    test("shows the saved balance, not the latest recorded month, and says the month is not recorded", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1500 },
        accountDetails: [{ month: 10, year: 2026, value: 1000 }],
      } as never);
      const { getByTestId, getByText } = customRender(<AccountDetailContainer />);
      expect(getByTestId("hero-figure").textContent).toContain("£1,500");
      expect(getByTestId("hero-figure").textContent).not.toContain("£1,000");
      expect(getByText("November 2026 not recorded yet")).toBeDefined();
    });

    test("names the month it compares with when the current month is recorded", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "a1", name: "Easy saver", type: "Savings", balance: 1100 },
        accountDetails: [
          { month: 9, year: 2026, value: 1000 },
          { month: 11, year: 2026, value: 1100 },
        ],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("Up 10% on September 2026")).toBeDefined();
    });

    test("says there is no earlier month when only the current month is recorded", () => {
      mocks.mockUseLoaderData.mockReturnValueOnce({
        account: { id: "d1", name: "Barclaycard", type: "Credit Card", balance: -1200 },
        accountDetails: [{ month: 11, year: 2026, value: -1200 }],
      } as never);
      const { getByText } = customRender(<AccountDetailContainer />);
      expect(getByText("No earlier month")).toBeDefined();
    });
  });

  test("says what happened when the account cannot be found, with a way back", () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({ account: null, accountDetails: [] } as never);
    const { getByText, getByRole } = customRender(<AccountDetailContainer />);
    expect(getByText("We cannot find that account.")).toBeDefined();
    expect(getByRole("link", { name: /back to accounts/i })).toBeDefined();
  });
});

describe("changeLine", () => {
  test("puts the direction in words", () => {
    expect(changeLine(4)).toBe("Up 4% on last month");
    expect(changeLine(-12)).toBe("Down 12% on last month");
    expect(changeLine(0)).toBe("No change on last month");
    expect(changeLine(null)).toBe("No earlier month");
    expect(changeLine(4, "October 2026")).toBe("Up 4% on October 2026");
  });
});

import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetails from "./AccountDetails";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
  fetcherData: { current: null as unknown },
  account: { current: { id: "123456", name: "Monzo Current" } as Record<string, unknown> },
  mockAccountDetails: [
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
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      accountDetails: mocks.mockAccountDetails,
      account: mocks.account.current,
    }),
    useRevalidator: () => ({ revalidate: vi.fn() }),
    useFetcher: () => ({
      submit: mocks.mockFetcherSubmit,
      state: "idle",
      data: mocks.fetcherData.current,
      Form: "form",
    }),
  };
});

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${val?.toLocaleString()}`,
  }),
}));

describe("<AccountDetails />", () => {
  test("shows one chart with its data table, and no tabs or year table", async () => {
    const { getByRole, queryByRole, user } = customRender(<AccountDetails />);
    expect(queryByRole("tab")).toBeNull();
    expect(queryByRole("table", { name: "Balance by year" })).toBeNull();
    expect(getByRole("figure", { name: "Monzo Current balance history" })).toBeDefined();
    await user.click(getByRole("button", { name: "Show data" }));
    expect(getByRole("table", { name: "Monzo Current balance history by month" })).toBeDefined();
  });

  test("is read-only: no inputs, delete-year buttons or edit controls", () => {
    const { container, queryByTitle } = customRender(<AccountDetails />);
    expect(container.querySelector("input")).toBeNull();
    expect(queryByTitle("Delete 2023")).toBeNull();
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });
});

describe("estimated return from recorded balances", () => {
  test("shows for an investment account, with its assumed return as a separate line", () => {
    mocks.account.current = {
      id: "123456",
      name: "Stocks and Shares ISA",
      type: "Investment",
      interestRate: 5,
      monthlyContribution: null,
    };
    try {
      const { getByRole, getByText } = customRender(<AccountDetails />);
      const region = getByRole("region", {
        name: "Estimated return from your recorded balances",
      });
      // Every recorded month is £1,000 with nothing paid in: 0% each month, 0.0% overall.
      expect(region.textContent).toContain("Overall, a year on average");
      expect(region.textContent).toContain("0.0%");
      expect(region.textContent).toContain("Investment returns can go down as well as up.");
      // The assumption is outside the recorded block, never in its list.
      expect(region.textContent).not.toContain("you set for this account");
      expect(
        getByText("The estimated annual return you set for this account is 5%."),
      ).toBeDefined();
    } finally {
      mocks.account.current = { id: "123456", name: "Monzo Current" };
    }
  });

  test("does not show for other accounts", () => {
    const { queryByRole } = customRender(<AccountDetails />);
    expect(
      queryByRole("region", { name: "Estimated return from your recorded balances" }),
    ).toBeNull();
  });
});

describe("accountChartRows", () => {
  test("ends on this month's saved balance, carried, when this month is not recorded", async () => {
    const { accountChartRows } = await import("./AccountDetails");
    const rows = accountChartRows(
      [
        { month: 10, year: 2026, value: -180500, source: "calculated" },
        { month: 9, year: 2026, value: -181000 },
      ],
      "Mortgage",
      -180000,
      "2026-11",
    );
    expect(rows.map((r) => [r.month, r.value, r.carried ?? false])).toEqual([
      [9, 181000, false],
      [10, 180500, false],
      [11, 180000, true],
    ]);
  });

  test("adds no saved point when this month is recorded", async () => {
    const { accountChartRows } = await import("./AccountDetails");
    const rows = accountChartRows(
      [
        { month: 10, year: 2026, value: 100 },
        { month: 11, year: 2026, value: 120 },
      ],
      "Saving",
      150,
      "2026-11",
    );
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.carried)).toBe(false);
  });
});

describe("sourceLabel (check-in sources, R2-5)", () => {
  test("names calculated and confirmed months, and leaves typed figures unlabelled", async () => {
    const { sourceLabel } = await import("./AccountDetails");
    expect(sourceLabel("calculated")).toBe("Calculated");
    expect(sourceLabel("confirmed")).toBe("Confirmed");
    expect(sourceLabel("manual")).toBeNull();
    expect(sourceLabel(undefined)).toBeNull();
  });
});

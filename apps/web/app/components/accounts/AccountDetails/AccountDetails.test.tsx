import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import AccountDetails from "./AccountDetails";

const mocks = vi.hoisted(() => ({
  mockFetcherSubmit: vi.fn(),
  fetcherData: { current: null as unknown },
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
      account: { id: "123456", name: "Monzo Current" },
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
  test("shows the chart first and the ledger on its own tab, newest month first", async () => {
    const { getByRole, getAllByRole, user } = customRender(<AccountDetails />);
    expect(getByRole("tab", { name: "Balance over time" })).toBeDefined();
    await user.click(getByRole("tab", { name: "Monthly ledger" }));
    const ledger = getByRole("table", { name: "Monthly balances, newest first" });
    const firstMonth = getAllByRole("row", { hidden: true }).find((row) => ledger.contains(row));
    expect(firstMonth).toBeDefined();
    expect(getByRole("table", { name: "Balance by year", hidden: true })).toBeDefined();
  });

  test("keeps months beyond the first eight behind a drawer", () => {
    const { getByText } = customRender(<AccountDetails />);
    expect(getByText("Earlier months")).toBeDefined();
  });

  test("is read-only: no inputs, delete-year buttons or edit controls", () => {
    const { container, queryByTitle } = customRender(<AccountDetails />);
    expect(container.querySelector("input")).toBeNull();
    expect(queryByTitle("Delete 2023")).toBeNull();
    expect(mocks.mockFetcherSubmit).not.toHaveBeenCalled();
  });
});

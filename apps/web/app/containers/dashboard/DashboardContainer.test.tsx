import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import DashboardContainer from "./DashboardContainer";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseNavigate: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useNavigate: () => mocks.mockUseNavigate,
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: null,
      Form: "form",
    }),
  };
});

// Mock Recharts ResponsiveContainer to render children
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: 400, height: 400 }}>{children}</div>
    ),
  };
});

describe("<DashboardContainer />", () => {
  test("renders empty state when no data", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [],
      accountDetails: [],
      transactions: [],
    });
    const { container } = customRender(<DashboardContainer />);
    expect(container).toBeDefined();
  });

  test("renders correct data when populated", () => {
    mocks.mockUseLoaderData.mockReturnValue({
      accounts: [{ id: "1", name: "Checking", type: "Current", balance: 1000 }],
      accountDetails: [{ account_id: "1", month: 12, year: 2023, value: 1000 }],
      transactions: [
        {
          id: "t1",
          amount: -50,
          description: "Groceries",
          category: "Food",
          timestamp: "2023-12-15T10:00:00Z",
        },
      ],
    });
    const { getByText } = customRender(<DashboardContainer />);
    expect(getByText("Checking")).toBeDefined();
    expect(getByText("Groceries")).toBeDefined();
  });
});

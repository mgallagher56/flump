import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import MortgageContainer from "./MortgageContainer";

// Mock sub-components to keep container unit test focused
vi.mock("app/components/mortgage/MortgageTracker", () => ({
  default: () => <div id="mock-tracker">Mock Mortgage Tracker</div>,
}));

vi.mock("app/components/mortgage/OverpaymentSimulator", () => ({
  default: () => <div id="mock-simulator">Mock Overpayment Simulator</div>,
}));

vi.mock("app/components/mortgage/OverpayVsSaveCompare", () => ({
  default: () => <div id="mock-compare">Mock Overpay vs Save Compare</div>,
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(() => ({
      accounts: [{ id: "m1", name: "HSBC Fixed Mortgage", type: "Mortgage", balance: -135400 }],
      accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
    })),
    useNavigate: () => mockNavigate,
  };
});

describe("<MortgageContainer />", () => {
  test("renders correctly and allows tab switching", () => {
    const { container, getByText } = customRender(<MortgageContainer />);
    expect(container).toBeDefined();

    // Verify title and initial active tab (Mortgage tracker)
    expect(getByText("Mortgage tools and calculator")).toBeDefined();
    expect(container.querySelector("#mock-tracker")).toBeDefined();
    expect(container.querySelector("#mock-simulator")).toBeNull();
    expect(container.querySelector("#mock-compare")).toBeNull();

    // Switch to Overpayment simulator tab
    const simulatorTabBtn = getByText("Overpayment simulator");
    fireEvent.click(simulatorTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-simulator")).toBeDefined();
    expect(container.querySelector("#mock-tracker")).toBeNull();

    // Switch to Overpay vs save tab
    const compareTabBtn = getByText("Overpay vs save");
    fireEvent.click(compareTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-compare")).toBeDefined();
    expect(container.querySelector("#mock-simulator")).toBeNull();
  });

  test("allows switching to Buy to let category and displays BTL overview", () => {
    const { getByText, queryByText } = customRender(<MortgageContainer />);

    expect(queryByText("Buy to let portfolio overview")).toBeNull();

    // Click Buy to let (BTL)
    const btlCategoryBtn = getByText("Buy to let (BTL)");
    fireEvent.click(btlCategoryBtn);

    expect(getByText("Buy to let portfolio overview")).toBeDefined();
    expect(getByText(/Section 24 rule:/)).toBeDefined();
    expect(getByText("Gross monthly rent")).toBeDefined();
    expect(getByText("Estimated net cash flow")).toBeDefined();
  });
});

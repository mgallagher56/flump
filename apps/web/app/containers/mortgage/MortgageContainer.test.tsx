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

    // Verify title and initial active tab (Mortgage Tracker)
    expect(getByText("Mortgage Tools & Calculator")).toBeDefined();
    expect(container.querySelector("#mock-tracker")).toBeDefined();
    expect(container.querySelector("#mock-simulator")).toBeNull();
    expect(container.querySelector("#mock-compare")).toBeNull();

    // Switch to Overpayment Simulator tab
    const simulatorTabBtn = getByText("Overpayment Simulator");
    fireEvent.click(simulatorTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-simulator")).toBeDefined();
    expect(container.querySelector("#mock-tracker")).toBeNull();

    // Switch to Overpay vs. Save tab
    const compareTabBtn = getByText("Overpay vs. Save");
    fireEvent.click(compareTabBtn);

    // Verify view switch
    expect(container.querySelector("#mock-compare")).toBeDefined();
    expect(container.querySelector("#mock-simulator")).toBeNull();
  });
});

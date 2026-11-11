import { fireEvent } from "@testing-library/react";
import { useLoaderData } from "react-router";
import { afterEach, vi } from "vitest";
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

  test("allows editing My Mortgage Information and switching to LTV milestones tab", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const { getByText, getByLabelText, getByRole } = customRender(<MortgageContainer />);

    // Open Edit mode on My Mortgage Information card
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));

    const balanceInput = getByLabelText("Remaining Balance (£)");
    fireEvent.change(balanceInput, { target: { value: "130000" } });

    const rateInput = getByLabelText("Interest Rate (%)");
    fireEvent.change(rateInput, { target: { value: "4.5" } });

    const termInput = getByLabelText("Remaining Term (Years)");
    fireEvent.change(termInput, { target: { value: "18" } });

    // Toggle Interest-Only and back to Repayment
    fireEvent.click(getByRole("button", { name: "Interest-Only" }));
    fireEvent.click(getByRole("button", { name: "Repayment" }));

    // Save changes
    fireEvent.click(getByRole("button", { name: /^Save$/i }));

    // Switch to LTV milestones tab
    fireEvent.click(getByText("LTV milestones"));
  });

  describe("with no stored rate or term", () => {
    const loaderWith = (accountOverrides: Record<string, unknown> = {}) => ({
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          ...accountOverrides,
        },
      ],
      accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
    });

    afterEach(() => {
      vi.mocked(useLoaderData).mockReset();
    });

    test("prompts for rate and term instead of assuming 4.5% over 25 years", () => {
      vi.mocked(useLoaderData).mockReturnValue(loaderWith() as any);
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      expect(getByText("Add your mortgage rate and term to see your figures.")).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
    });

    test("starts empty with no mortgage account instead of assuming £150,000", () => {
      vi.mocked(useLoaderData).mockReturnValue({ accounts: [], accountDetails: [] } as any);
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      expect(
        getByText("Add your mortgage balance, rate and term to see your figures."),
      ).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
    });

    test("LTV milestones prompt instead of reading achieved when there is no property value", () => {
      vi.mocked(useLoaderData).mockReturnValue(loaderWith({ interestRate: 3.9 }) as any);
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByText("LTV milestones"));
      expect(
        getByText("Add your mortgage balance and property value to see LTV milestones."),
      ).toBeDefined();
      expect(queryByText(/Achieved/i)).toBeNull();
      expect(queryByText(/Current LTV/)).toBeNull();
    });

    test("buy to let starts empty rather than prefilling 180,000", () => {
      vi.mocked(useLoaderData).mockReturnValue({ accounts: [], accountDetails: [] } as any);
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByText("Buy to let (BTL)"));
      expect(queryByText(/180,000/)).toBeNull();
      expect(queryByText(/250,000/)).toBeNull();
    });

    test("uses the stored account rate and only asks for the term", () => {
      vi.mocked(useLoaderData).mockReturnValue(loaderWith({ interestRate: 3.9 }) as any);
      const { getByText } = customRender(<MortgageContainer />);
      expect(getByText("Add your mortgage term to see your figures.")).toBeDefined();
    });
  });
});

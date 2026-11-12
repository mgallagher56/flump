import { act, fireEvent } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import MortgageContainer from "./MortgageContainer";

// Mock sub-components to keep container unit test focused
vi.mock("~/features/mortgage/components/MortgageTracker", () => ({
  MortgageTracker: () => <div id="mock-tracker">Mock Mortgage Tracker</div>,
}));

vi.mock("~/features/mortgage/components/OverpaymentSimulator", () => ({
  OverpaymentSimulator: () => <div id="mock-simulator">Mock Overpayment Simulator</div>,
}));

vi.mock("~/features/mortgage/components/OverpayVsSaveCompare", () => ({
  OverpayVsSaveCompare: () => <div id="mock-compare">Mock Overpay vs Save Compare</div>,
}));

const defaultLoaderData = () => ({
  accounts: [{ id: "m1", name: "HSBC Fixed Mortgage", type: "Mortgage", balance: -135400 }],
  accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
});
// Per-test loader data; a plain variable keeps it stable across re-renders and is reset below.
let loaderData: Record<string, unknown> = defaultLoaderData();
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(() => loaderData),
    useNavigate: () => mockNavigate,
    useRouteLoaderData: () => ({ accessToken: "test-token" }),
  };
});

const originalEnv = (window as unknown as { ENV?: unknown }).ENV;

describe("<MortgageContainer />", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (window as unknown as { ENV?: unknown }).ENV = originalEnv;
    loaderData = defaultLoaderData();
  });

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
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    );
    const { getByText, getByLabelText, getByRole } = customRender(<MortgageContainer />);

    // Open Edit mode on My Mortgage Information card
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));

    const balanceInput = getByLabelText(/^Remaining balance/);
    fireEvent.change(balanceInput, { target: { value: "130000" } });

    const rateInput = getByLabelText(/^Interest rate/);
    fireEvent.change(rateInput, { target: { value: "4.5" } });

    const termInput = getByLabelText(/^Remaining term/);
    fireEvent.change(termInput, { target: { value: "18" } });

    // Toggle Interest-Only and back to Repayment
    fireEvent.click(getByRole("button", { name: "Interest-only" }));
    fireEvent.click(getByRole("button", { name: "Repayment" }));

    // Save changes
    fireEvent.click(getByRole("button", { name: /^Save$/i }));

    // Switch to LTV milestones tab
    fireEvent.click(getByText("LTV milestones"));
  });

  const setApiEnv = () => {
    (window as unknown as { ENV: { VITE_API_URL: string } }).ENV = {
      VITE_API_URL: "http://api.test",
    };
  };
  const patches = (fetchSpy: ReturnType<typeof vi.spyOn>) =>
    fetchSpy.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "PATCH");

  test("saving stores the rate on the mortgage account and never sends unsupported profile fields", async () => {
    setApiEnv();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
    const { getByLabelText, getByRole, findByText, queryByText } = customRender(
      <MortgageContainer />,
    );
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(getByLabelText(/^Interest rate/), { target: { value: "4.5" } });
    fireEvent.change(getByLabelText(/^Remaining term/), { target: { value: "18" } });
    fireEvent.click(getByRole("button", { name: /^Save$/i }));
    await findByText(/Saved/);

    const calls = patches(fetchSpy);
    const accountPatch = calls.find(([url]) => String(url).endsWith("/accounts/m1"));
    if (!accountPatch) throw new Error("expected an account PATCH");
    expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
      interestRate: 4.5,
    });
    const profilePatch = calls.find(([url]) => String(url).endsWith("/user-profile"));
    if (!profilePatch) throw new Error("expected a profile PATCH");
    const profileBody = JSON.parse(String((profilePatch[1] as RequestInit).body));
    for (const key of ["mortgageRate", "mortgageTermYears", "mortgageBalance", "homeValue"]) {
      expect(profileBody).not.toHaveProperty(key);
    }
    expect(queryByText(/term/i, { selector: "[role='status']" })).toBeNull();
  });

  test("the term field is labelled as not saved", () => {
    const { getByText, getByRole } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    expect(getByText(/Not saved – enter each visit/)).toBeDefined();
  });

  test("shows an error and no success message when the account PATCH fails", async () => {
    setApiEnv();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("/accounts/")
        ? new Response(JSON.stringify({ message: "nope" }), { status: 500 })
        : new Response(JSON.stringify({}), { status: 200 }),
    );
    const { getByLabelText, getByRole, findByRole, queryByText } = customRender(
      <MortgageContainer />,
    );
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(getByLabelText(/^Interest rate/), { target: { value: "4.5" } });
    fireEvent.click(getByRole("button", { name: /^Save$/i }));
    expect((await findByRole("alert")).textContent).toMatch(/could not save/i);
    expect(queryByText(/Saved/)).toBeNull();
  });

  test("blanking the rate and term fields leaves them empty rather than 0 or 1", () => {
    const { getByLabelText, getByRole } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    const term = getByLabelText(/^Remaining term/) as HTMLInputElement;
    const rate = getByLabelText(/^Interest rate/) as HTMLInputElement;
    expect(rate.value).toBe("");
    fireEvent.change(term, { target: { value: "18" } });
    fireEvent.change(rate, { target: { value: "4.5" } });
    expect(term.value).toBe("18");
    fireEvent.change(term, { target: { value: "" } });
    fireEvent.change(rate, { target: { value: "" } });
    expect(term.value).toBe("");
    expect(rate.value).toBe("");
  });

  test("empty prompt offers a call to action that opens the edit form", () => {
    loaderData = { accounts: [], accountDetails: [] };
    const { getByRole, getByLabelText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
    expect(getByLabelText(/^Interest rate/)).toBeDefined();
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

    test("prompts for rate and term instead of assuming 4.5% over 25 years", () => {
      loaderData = loaderWith();
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      expect(getByText("Add your mortgage rate and term to see your figures.")).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
    });

    test("starts empty with no mortgage account instead of assuming £150,000", () => {
      loaderData = { accounts: [], accountDetails: [] };
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      expect(
        getByText("Add your mortgage balance, rate and term to see your figures."),
      ).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
    });

    test("LTV milestones prompt instead of reading achieved when there is no property value", () => {
      loaderData = loaderWith({ interestRate: 3.9 });
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByText("LTV milestones"));
      expect(
        getByText("Add your mortgage balance and property value to see LTV milestones."),
      ).toBeDefined();
      expect(queryByText(/Achieved/i)).toBeNull();
      expect(queryByText(/Current LTV/)).toBeNull();
    });

    test("buy to let starts empty rather than prefilling 180,000", () => {
      loaderData = { accounts: [], accountDetails: [] };
      const { getByText, queryByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByText("Buy to let (BTL)"));
      expect(queryByText(/180,000/)).toBeNull();
      expect(queryByText(/250,000/)).toBeNull();
    });

    test("uses the stored account rate and only asks for the term", () => {
      loaderData = loaderWith({ interestRate: 3.9 });
      const { getByText } = customRender(<MortgageContainer />);
      expect(getByText("Add your mortgage term to see your figures.")).toBeDefined();
    });
  });

  describe("live region", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("does not announce a headline on load", () => {
      vi.useFakeTimers();
      loaderData = {
        accounts: [
          {
            id: "m1",
            name: "HSBC Fixed Mortgage",
            type: "Mortgage",
            balance: -135400,
            interestRate: 4.5,
          },
        ],
        accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
      };
      const { getByRole } = customRender(<MortgageContainer />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(getByRole("status", { hidden: true }).textContent).toBe("");
    });
  });
});

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
let searchParams = new URLSearchParams();
vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(() => loaderData),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [searchParams, vi.fn()],
  };
});

const originalEnv = (window as unknown as { ENV?: unknown }).ENV;

describe("<MortgageContainer />", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (window as unknown as { ENV?: unknown }).ENV = originalEnv;
    loaderData = defaultLoaderData();
    searchParams = new URLSearchParams();
  });

  test("shows saved sections always and switches between the what-if tools", () => {
    const { container, getByText, getByRole } = customRender(<MortgageContainer />);

    expect(getByText("Your mortgage")).toBeDefined();
    // The tracker is a saved section, so it is outside the tool tabs.
    expect(container.querySelector("#mock-tracker")).not.toBeNull();
    expect(getByRole("region", { name: "Model a change to your mortgage" })).toBeDefined();
    expect(getByText("Illustration, not saved")).toBeDefined();
    expect(container.querySelector("#mock-simulator")).not.toBeNull();
    expect(container.querySelector("#mock-compare")).toBeNull();

    fireEvent.click(getByText("Overpay vs save"));
    expect(container.querySelector("#mock-compare")).not.toBeNull();
    expect(container.querySelector("#mock-simulator")).toBeNull();
    // Switching a tool never hides the saved tracker.
    expect(container.querySelector("#mock-tracker")).not.toBeNull();
  });

  test("?tool= selects a what-if tool and scrolls to the zone", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    searchParams = new URLSearchParams("tool=overpay-vs-save");
    const { container, getByRole } = customRender(<MortgageContainer />);
    expect(container.querySelector("#mock-compare")).not.toBeNull();
    expect(getByRole("tab", { name: /Overpay vs save/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(scrollIntoView).toHaveBeenCalled();
  });

  test("an unknown ?tool= value is ignored", () => {
    searchParams = new URLSearchParams("tool=nonsense");
    const { container } = customRender(<MortgageContainer />);
    expect(container.querySelector("#mock-simulator")).not.toBeNull();
  });

  test("tools expose tab semantics and respond to arrow keys", () => {
    const { getByRole } = customRender(<MortgageContainer />);
    expect(getByRole("tablist", { name: "Mortgage what-if tools" })).toBeDefined();
    const overpayment = getByRole("tab", { name: /Overpayment simulator/ });
    expect(overpayment.getAttribute("aria-selected")).toBe("true");
    const panel = getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(overpayment.id);
    expect(overpayment.getAttribute("aria-controls")).toBe(panel.id);
    fireEvent.keyDown(overpayment, { key: "ArrowRight" });
    const rate = getByRole("tab", { name: /Rate change/ });
    expect(rate.getAttribute("aria-selected")).toBe("true");
    expect(overpayment.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(rate, { key: "End" });
    expect(getByRole("tab", { name: /Overpay vs save/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  test("tab keys move focus and wrap, are ignored with modifiers, and the panel is focusable", () => {
    const { getByRole } = customRender(<MortgageContainer />);
    const first = getByRole("tab", { name: /Overpayment simulator/ });
    const second = getByRole("tab", { name: /Rate change/ });
    const last = getByRole("tab", { name: /Overpay vs save/ });
    expect(getByRole("tabpanel").getAttribute("tabindex")).toBe("0");

    first.focus();
    for (const modifier of ["ctrlKey", "altKey", "metaKey", "shiftKey"] as const) {
      fireEvent.keyDown(first, { key: "ArrowRight", [modifier]: true });
      expect(first.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(first);
    }

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Home" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(last);
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

  test("allows editing the saved mortgage details", async () => {
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
    expect(getByText("Your mortgage")).toBeDefined();
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
    await findByText(/Saved repayment type/);

    const calls = patches(fetchSpy);
    const accountPatch = calls.find(([url]) => String(url).endsWith("/accounts/m1"));
    if (!accountPatch) throw new Error("expected an account PATCH");
    // E20-N9: the browser calls the same-origin proxy and never sends a bearer token.
    expect(String(accountPatch[0])).toBe("/api/accounts/m1");
    expect(JSON.stringify(accountPatch[1])).not.toMatch(/authorization|bearer/i);
    expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
      interestRate: 4.5,
      termMonths: 216,
    });
    const profilePatch = calls.find(([url]) => String(url).endsWith("/user-profile"));
    if (!profilePatch) throw new Error("expected a profile PATCH");
    const profileBody = JSON.parse(String((profilePatch[1] as RequestInit).body));
    for (const key of ["mortgageRate", "mortgageTermYears", "mortgageBalance", "homeValue"]) {
      expect(profileBody).not.toHaveProperty(key);
    }
  });

  test("a term over the 50-year limit is clamped to what is stored", async () => {
    setApiEnv();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
    const { getByLabelText, getByRole, findByText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(getByLabelText(/^Remaining term/), { target: { value: "60" } });
    fireEvent.click(getByRole("button", { name: /^Save$/i }));
    await findByText(/Saved repayment type/);
    const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
    if (!accountPatch) throw new Error("expected an account PATCH");
    expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
      termMonths: 600,
    });
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    expect((getByLabelText(/^Remaining term/) as HTMLInputElement).value).toBe("50");
  });

  test("saves the fixed rate end date on the account, and an emptied date clears it (E32)", async () => {
    setApiEnv();
    loaderData = {
      ...defaultLoaderData(),
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          fixedRateEndDate: "2099-10-01",
        },
      ],
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
    const { getByLabelText, getByRole, findByText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    const date = getByLabelText(/Fixed rate end date \(optional\)/) as HTMLInputElement;
    expect(date.value).toBe("2099-10-01");
    fireEvent.change(date, { target: { value: "2099-12-31" } });
    fireEvent.click(getByRole("button", { name: /^Save$/i }));
    await findByText(/fixed rate end date/);
    const bodyOf = () => {
      const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!call) throw new Error("expected an account PATCH");
      return JSON.parse(String((call[1] as RequestInit).body));
    };
    expect(bodyOf()).toEqual({ fixedRateEndDate: "2099-12-31" });

    fetchSpy.mockClear();
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    const again = getByLabelText(/Fixed rate end date/) as HTMLInputElement;
    expect(again.value).toBe("2099-12-31");
    fireEvent.change(again, { target: { value: "" } });
    fireEvent.click(getByRole("button", { name: /^Save$/i }));
    await findByText(/fixed rate end date/);
    expect(bodyOf()).toEqual({ fixedRateEndDate: null });
  });

  test("the fix-end notice reads the account's stored date, as an info fact", () => {
    const soon = new Date();
    soon.setUTCMonth(soon.getUTCMonth() + 3);
    loaderData = {
      ...defaultLoaderData(),
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          fixedRateEndDate: soon.toISOString().slice(0, 10),
        },
      ],
    };
    const { getByText, container } = customRender(<MortgageContainer />);
    expect(getByText(/Your fixed-rate deal ends in [23] months/)).toBeDefined();
    const banner = container.querySelector("#mortgage-refinance-warning");
    expect(banner?.textContent).not.toMatch(/worth comparing|usually raises/i);
  });

  test("owners with a mortgage see their housing cost from the picture below the summary", () => {
    loaderData = {
      ...defaultLoaderData(),
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          interestRate: 4.5,
          termMonths: 300,
        },
      ],
      userProfile: {
        housingStatus: "mortgage",
        annualSalary: 50000,
        employmentType: "employed",
        pensionPercent: 5,
        isSalarySacrifice: false,
      },
    };
    const { getByText, getByTestId } = customRender(<MortgageContainer />);
    expect(getByTestId("housing-cost-card")).toBeDefined();
    expect(getByText("Monthly mortgage payment (estimate)")).toBeDefined();
    expect(getByTestId("housing-cost-card-share").textContent).toMatch(
      /^\d+(\.\d)?% of your estimated take-home pay$/,
    );
  });

  test("no housing cost card unless the profile says the home has a mortgage", () => {
    const { queryByTestId } = customRender(<MortgageContainer />);
    expect(queryByTestId("housing-cost-card")).toBeNull();
  });

  test("the term field says it is saved when a mortgage account is linked", () => {
    const { getByText, getByRole, getByLabelText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    const hint = getByText(/Stored on your mortgage account/);
    expect(hint).toBeDefined();
    // The hint is tied to the term field, not just nearby text.
    const term = getByLabelText(/^Remaining term/);
    expect(term.getAttribute("aria-describedby")).toContain(hint.id);
  });

  test("the remortgage simulator uses the user's real property value and fix date", () => {
    loaderData = {
      ...defaultLoaderData(),
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          fixedRateEndDate: "2099-10-01",
        },
        { id: "home", name: "Home", type: "Property", balance: 350000 },
      ],
      userProfile: {},
    };
    const { getByText, getAllByText, queryByText } = customRender(<MortgageContainer />);
    fireEvent.click(getByText("Rate change"));
    expect(queryByText("LTV not set")).toBeNull();
    expect(getAllByText(/current LTV:/i).length).toBeGreaterThan(1);
    expect(queryByText(/fix end date not set/i)).toBeNull();
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
    expect(queryByText(/Saved repayment type/)).toBeNull();
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

  test("with a linked account, the empty prompt opens the edit form", () => {
    const { getByRole, getByLabelText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
    expect(getByLabelText(/^Interest rate/)).toBeDefined();
  });

  test("with no mortgage account, balance, rate and term are not offered because they cannot be saved", () => {
    loaderData = { accounts: [], accountDetails: [] };
    const { getByRole, queryByLabelText } = customRender(<MortgageContainer />);
    fireEvent.click(getByRole("button", { name: /^Edit$/i }));
    expect(queryByLabelText(/^Remaining balance/)).toBeNull();
    expect(queryByLabelText(/^Interest rate/)).toBeNull();
    expect(queryByLabelText(/^Remaining term/)).toBeNull();
    fireEvent.click(getByRole("button", { name: "Add mortgage account" }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
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

    test("uses the stored account term (months) as years", () => {
      loaderData = loaderWith({ interestRate: 3.9, termMonths: 240 });
      const { queryByText, getByRole, getByLabelText } = customRender(<MortgageContainer />);
      expect(queryByText(/to see your figures/)).toBeNull();
      fireEvent.click(getByRole("button", { name: /^Edit$/i }));
      expect((getByLabelText(/^Remaining term/) as HTMLInputElement).value).toBe("20");
    });

    test("uses the stored account rate and only asks for the term", () => {
      loaderData = loaderWith({ interestRate: 3.9 });
      const { getByText } = customRender(<MortgageContainer />);
      expect(getByText("Add your mortgage term to see your figures.")).toBeDefined();
    });
  });

  describe("saved details and the scenario zone are separate", () => {
    const loaded = () => ({
      accounts: [
        {
          id: "m1",
          name: "HSBC Fixed Mortgage",
          type: "Mortgage",
          balance: -135400,
          interestRate: 4.5,
          termMonths: 240,
        },
        { id: "home", name: "Home", type: "Property", balance: 350000 },
      ],
      accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
      userProfile: {},
    });
    const savedText = (container: HTMLElement) =>
      container.querySelector("#mortgage-summary")?.textContent ?? "";

    test("saved details come from loader data and say when they were last updated", () => {
      loaderData = loaded();
      const { container, getByRole } = customRender(<MortgageContainer />);
      expect(savedText(container)).toContain("£135,400");
      expect(savedText(container)).toContain("4.50%");
      expect(savedText(container)).toContain("Last updated June 2026");
      expect(getByRole("button", { name: /^Edit$/i })).toBeDefined();
    });

    test("changing any scenario input leaves the saved details unchanged and makes no request", () => {
      loaderData = loaded();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { container, getAllByRole, getByRole } = customRender(<MortgageContainer />);
      const before = savedText(container);
      const sliders = container
        .querySelector("[aria-labelledby]")
        ?.ownerDocument.querySelectorAll("input[type='range']");
      expect(sliders?.length).toBeGreaterThanOrEqual(3);
      for (const slider of Array.from(sliders ?? [])) {
        const input = slider as HTMLInputElement;
        const next = String(Number(input.max) / 2);
        fireEvent.change(input, { target: { value: next } });
      }
      expect(getAllByRole("button", { name: "Reset to saved figures" })).toHaveLength(1);
      expect(savedText(container)).toBe(before);
      expect(fetchSpy).not.toHaveBeenCalled();

      fireEvent.click(getByRole("button", { name: "Reset to saved figures" }));
      expect(savedText(container)).toBe(before);
    });

    test("scenario state never reaches the URL or browser storage", () => {
      loaderData = loaded();
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      const { container } = customRender(<MortgageContainer />);
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      expect(setItem).not.toHaveBeenCalled();
      expect(window.location.search).toBe("");
    });

    test("the zone starts from the saved figures and reset stays disabled until a change", () => {
      loaderData = loaded();
      const { getByText, getByRole } = customRender(<MortgageContainer />);
      expect(
        getByText(/Starting from your figures: £135,400 at 4.5%, 20 years left/),
      ).toBeDefined();
      expect(getByRole("button", { name: "Reset to saved figures" })).toHaveProperty(
        "disabled",
        true,
      );
    });

    test("a balance typed in Edit is stored on the mortgage account as a liability", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
      const { getByLabelText, getByRole, findByText, container } = customRender(
        <MortgageContainer />,
      );
      fireEvent.click(getByRole("button", { name: /^Edit$/i }));
      fireEvent.change(getByLabelText(/^Remaining balance/), { target: { value: "130000" } });
      fireEvent.click(getByRole("button", { name: /^Save$/i }));
      await findByText(/Saved repayment type, balance/);
      const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        balance: -130000,
        interestRate: 4.5,
        termMonths: 240,
      });
      expect(savedText(container)).toContain("£130,000");
    });

    test("a failed save leaves the saved figures as they were", async () => {
      setApiEnv();
      loaderData = loaded();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
        String(url).includes("/accounts/")
          ? new Response(JSON.stringify({ message: "nope" }), { status: 500 })
          : new Response(JSON.stringify({}), { status: 200 }),
      );
      const { getByLabelText, getByRole, findByRole, container } = customRender(
        <MortgageContainer />,
      );
      fireEvent.click(getByRole("button", { name: /^Edit$/i }));
      fireEvent.change(getByLabelText(/^Remaining balance/), { target: { value: "90000" } });
      fireEvent.click(getByRole("button", { name: /^Save$/i }));
      await findByRole("alert");
      fireEvent.click(getByRole("button", { name: "Cancel" }));
      expect(savedText(container)).toContain("£135,400");
      expect(savedText(container)).not.toContain("£90,000");
    });

    test("Update your details opens the edit form with the saved values, not the scenario", () => {
      loaderData = loaded();
      const { container, getByRole, getByLabelText } = customRender(<MortgageContainer />);
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      fireEvent.click(getByRole("button", { name: "Update your details" }));
      expect((getByLabelText(/^Interest rate/) as HTMLInputElement).value).toBe("4.5");
      expect((getByLabelText(/^Remaining term/) as HTMLInputElement).value).toBe("20");
    });

    test("the hero surface sits on the saved balance only", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      const heroes = container.querySelectorAll("[data-tone='hero']");
      expect(heroes).toHaveLength(1);
      expect(heroes[0]?.closest("#mortgage-summary")).not.toBeNull();
    });

    test("buy to let saves balance and rate on the profile and offers no term", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));
      const { getByText, getByLabelText, getByRole, queryByLabelText, findByText } = customRender(
        <MortgageContainer />,
      );
      fireEvent.click(getByText("Buy to let (BTL)"));
      fireEvent.click(getByRole("button", { name: /^Edit$/i }));
      expect(queryByLabelText(/^Remaining term/)).toBeNull();
      fireEvent.change(getByLabelText(/^Remaining balance/), { target: { value: "200000" } });
      fireEvent.change(getByLabelText(/^Interest rate/), { target: { value: "5.1" } });
      fireEvent.click(getByRole("button", { name: /^Save$/i }));
      await findByText(/Saved repayment type, balance and interest rate/);
      const profilePatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/user-profile"));
      if (!profilePatch) throw new Error("expected a profile PATCH");
      expect(JSON.parse(String((profilePatch[1] as RequestInit).body))).toMatchObject({
        buyToLetMortgageBalance: 200000,
        buyToLetMortgageRate: 5.1,
      });
      expect(patches(fetchSpy).some(([url]) => String(url).includes("/accounts/"))).toBe(false);
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
      const { getAllByRole } = customRender(<MortgageContainer />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      for (const region of getAllByRole("status", { hidden: true })) {
        expect(region.textContent).toBe("");
      }
    });
  });

  describe("loan to value for the onboarded homeowner (E16 PR 3 regression)", () => {
    const homeownerAccounts = [
      { id: "cash", name: "Cash and emergency savings", type: "Saving", balance: 21000 },
      { id: "pot", name: "Workplace and personal pension", type: "Pension", balance: 96000 },
      { id: "m1", name: "Residential Mortgage", type: "Mortgage", balance: 186000 },
    ];
    const ltvHeading = (container: HTMLElement) =>
      container.querySelector("#ltv-milestones-heading")?.textContent ?? "";

    const home = { id: "home", name: "Home (your estimate)", type: "Property", balance: 310000 };

    test("shows 60% from the seeded home Property account and the mortgage balance", () => {
      loaderData = {
        accounts: [...homeownerAccounts, home],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, queryByText } = customRender(<MortgageContainer />);
      expect(ltvHeading(container)).toContain("Current LTV: 60.0%");
      expect(queryByText(/Add your mortgage balance and property value/)).toBeNull();
    });

    test("leaves buy-to-let out: still 60% with a BTL flat and BTL mortgage listed first", () => {
      loaderData = {
        accounts: [
          { id: "btl-m", name: "BTL interest-only mortgage", type: "Mortgage", balance: 150000 },
          { id: "btl", name: "Buy-to-let flat", type: "Property", balance: 235000 },
          ...homeownerAccounts,
          home,
        ],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(ltvHeading(container)).toContain("Current LTV: 60.0%");
    });

    test("measures the selected residential mortgage, not every mortgage added up", () => {
      loaderData = {
        accounts: [
          ...homeownerAccounts,
          { id: "m2", name: "Second charge", type: "Mortgage", balance: 31000 },
          home,
        ],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container } = customRender(<MortgageContainer />);
      // m1 (186,000) is selected first: 186,000 / 310,000, not 217,000 / 310,000.
      expect(ltvHeading(container)).toContain("Current LTV: 60.0%");
    });

    test("a profile homeValue alone is never used (the backend does not store it)", () => {
      loaderData = {
        accounts: homeownerAccounts,
        accountDetails: [],
        userProfile: { housingStatus: "mortgage", homeValue: 310000 },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#ltv-milestones-heading")).toBeNull();
    });

    test("stays not available, never 0%, without a home value", () => {
      loaderData = {
        accounts: homeownerAccounts,
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, getByText } = customRender(<MortgageContainer />);
      expect(container.querySelector("#ltv-milestones-heading")).toBeNull();
      expect(getByText(/Add your mortgage balance and property value/)).toBeDefined();
    });
  });
});

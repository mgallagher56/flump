import { countFigures, countNotSet, expectPageRules } from "@repo/ui/testing";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import MortgageContainer from "./MortgageContainer";

// Mock sub-components to keep container unit test focused
vi.mock("~/features/mortgage/components/MortgageTracker", () => ({
  MortgageTracker: () => <div id="mock-tracker">Mock Mortgage Tracker</div>,
}));

vi.mock("~/features/mortgage/components/OverpaymentSimulator", () => ({
  OVERPAYMENT_ERC_NOTE: "Many fixed-rate deals allow overpayments (test note).",
  OverpaymentSimulator: () => <div id="mock-simulator">Mock Overpayment Simulator</div>,
}));

vi.mock("~/features/mortgage/components/OverpayVsSaveCompare", () => ({
  OverpayVsSaveCompare: () => <div id="mock-compare">Mock Overpay or save</div>,
}));

const account = (overrides: Record<string, unknown> = {}) => ({
  id: "m1",
  name: "HSBC Fixed Mortgage",
  type: "Mortgage",
  balance: -135400,
  ...overrides,
});

// Balance only: the partial state.
const defaultLoaderData = () => ({
  accounts: [account()],
  accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
});

// Balance, rate, term and a home value: the complete state.
const loaded = (overrides: Record<string, unknown> = {}) => ({
  accounts: [
    account({ interestRate: 4.5, termMonths: 240, ...overrides }),
    { id: "home", name: "Home", type: "Property", balance: 350000 },
  ],
  accountDetails: [{ account_id: "m1", month: 6, year: 2026, value: -135400 }],
  userProfile: {},
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

const setApiEnv = () => {
  (window as unknown as { ENV: { VITE_API_URL: string } }).ENV = {
    VITE_API_URL: "http://api.test",
  };
};
const patches = (fetchSpy: ReturnType<typeof vi.spyOn>) =>
  fetchSpy.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "PATCH");
const okFetch = () =>
  vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));

/** Radix tabs select on mouse down, not click. */
const selectTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }));
/** A field in the edit dialog (the hidden rate change tool has its own "Years left" slider). */
const field = (label: RegExp) =>
  within(screen.getByRole("dialog")).getByLabelText(label) as HTMLInputElement;
const openEdit = () => fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
const save = () => fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
const savedText = (container: HTMLElement) =>
  `${container.querySelector("#mortgage-saved")?.textContent ?? ""}|${
    container.querySelector("#mortgage-summary")?.textContent ?? ""
  }`;

describe("<MortgageContainer />", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (window as unknown as { ENV?: unknown }).ENV = originalEnv;
    loaderData = defaultLoaderData();
    searchParams = new URLSearchParams();
    mockNavigate.mockReset();
  });

  describe("partial state: rate or term missing", () => {
    test("balance and rate: two plain figures, one prompt, no Not set and no scenario zone", () => {
      loaderData = { ...defaultLoaderData(), accounts: [account({ interestRate: 4.5 })] };
      const { container, queryByRole, getByRole } = customRender(<MortgageContainer />);
      expect(getByRole("heading", { level: 1, name: "Your mortgage" })).toBeDefined();
      expect(
        getByRole("heading", {
          name: "Add your years left to see your payoff date and what overpaying would change",
        }),
      ).toBeDefined();
      const prompt = container.querySelector("#mortgage-prompt") as HTMLElement;
      expect(prompt.textContent).toContain("£135,400");
      expect(prompt.textContent).toContain("4.50%");
      expect(countFigures(container)).toBe(2);
      expect(countNotSet(container)).toBe(0);
      expect(queryByRole("region", { name: "Model a change to your mortgage" })).toBeNull();
      expect(container.querySelector("#mock-tracker")).toBeNull();
      expect(container.querySelector("[data-tone='hero']")).toBeNull();
      expectPageRules(container, { maxFigures: 2, maxNotSet: 0, projectionNotices: 0 });
    });

    test("balance only names both missing figures", () => {
      const { getByRole, queryByText } = customRender(<MortgageContainer />);
      expect(
        getByRole("heading", {
          name: "Add your interest rate and years left to see your payoff date and what overpaying would change",
        }),
      ).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
    });

    test("a stored rate means only the term is asked for", () => {
      loaderData = { ...defaultLoaderData(), accounts: [account({ interestRate: 3.9 })] };
      const { getByText } = customRender(<MortgageContainer />);
      expect(getByText(/^Add your years left to see/)).toBeDefined();
    });

    test("the prompt button opens the edit dialog", () => {
      const { getByRole, getByLabelText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      expect(getByRole("dialog", { name: "Edit your mortgage details" })).toBeDefined();
      expect(field(/^Interest rate/)).toBeDefined();
    });

    test("with no mortgage account, one prompt sends the user to add one", () => {
      loaderData = { accounts: [], accountDetails: [] };
      const { getByRole, queryByText, container } = customRender(<MortgageContainer />);
      expect(
        getByRole("heading", {
          name: "Add your mortgage to see your payment, balance and payoff date",
        }),
      ).toBeDefined();
      expect(queryByText(/150,000/)).toBeNull();
      expect(countNotSet(container)).toBe(0);
      fireEvent.click(getByRole("button", { name: "Add mortgage account" }));
      expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
    });

    test("details that say there is a mortgage but no account get one factual prompt", () => {
      loaderData = { accounts: [], accountDetails: [], userProfile: { hasMortgage: true } };
      const { getByRole, getByText, getAllByRole } = customRender(<MortgageContainer />);
      expect(getByRole("heading", { name: "No mortgage account added" })).toBeDefined();
      expect(getByText(/Your details say you have a mortgage/)).toBeDefined();
      expect(getAllByRole("button", { name: "Add mortgage account" })).toHaveLength(1);
    });

    test("uses the stored account term (months) as years", () => {
      loaderData = { ...defaultLoaderData(), accounts: [account({ termMonths: 240 })] };
      const { getByRole, getByLabelText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      expect(field(/^Years left/).value).toBe("20");
    });
  });

  describe("complete state", () => {
    test("hero monthly payment with an estimated payoff date, then three KPIs", () => {
      loaderData = loaded();
      const { container, getByText } = customRender(<MortgageContainer />);
      const heroes = container.querySelectorAll("[data-tone='hero']");
      expect(heroes).toHaveLength(1);
      const hero = heroes[0] as HTMLElement;
      expect(hero.textContent).toContain("Monthly payment");
      // The payment is worked out from the saved figures; the payoff date is labelled an estimate.
      expect(hero.textContent).toMatch(/£\d{3}/);
      expect(hero.textContent).toMatch(/Estimate: paid off by [A-Z][a-z]{2,3} \d{4}/);
      const saved = container.querySelector("#mortgage-saved") as HTMLElement;
      expect(saved.textContent).toContain("Remaining balance");
      expect(saved.textContent).toContain("£135,400");
      expect(saved.textContent).toContain("4.50%");
      expect(saved.textContent).toContain("Loan to value");
      expect(saved.textContent).toContain("38.7%");
      expect(getByText("Your details")).toBeDefined();
    });

    test("page rules: one hero, one notice below the h1, one primary, first view within budget", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      expectPageRules(container, { maxNotSet: 0, projectionNotices: 1 });
      const firstView = [
        container.querySelector("#mortgage-saved"),
        container.querySelector("#mortgage-summary"),
      ];
      const figures = firstView.reduce((sum, el) => sum + (el ? countFigures(el) : 0), 0);
      expect(figures).toBeLessThanOrEqual(10);
    });

    test("the fixed rate end date is the rate's caption", () => {
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mortgage-saved")?.textContent).toContain(
        "Fixed until Oct 2099",
      );
    });

    test("loan to value without a home value is one Not set with one action", () => {
      loaderData = { ...loaded(), accounts: [account({ interestRate: 4.5, termMonths: 240 })] };
      const { container, getByRole, queryByRole } = customRender(<MortgageContainer />);
      expect(countNotSet(container)).toBe(1);
      expect(queryByRole("button", { name: "Show loan to value bands" })).toBeNull();
      fireEvent.click(getByRole("button", { name: "Add your home's value" }));
      expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
    });

    test("cost details and loan to value bands are quiet drawers, closed at first", () => {
      loaderData = loaded();
      const { container, getByRole } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mock-tracker")).toBeNull();
      fireEvent.click(getByRole("button", { name: "Show cost details" }));
      expect(container.querySelector("#mock-tracker")).not.toBeNull();
      fireEvent.click(getByRole("button", { name: "Show loan to value bands" }));
      expect(container.querySelector("#ltv-milestones-heading")?.textContent).toContain(
        "Current LTV: 38.7%",
      );
    });

    test("no separate housing cost card: the payment is the hero", () => {
      loaderData = { ...loaded(), userProfile: { housingStatus: "mortgage", annualSalary: 50000 } };
      const { queryByTestId } = customRender(<MortgageContainer />);
      expect(queryByTestId("housing-cost-card")).toBeNull();
    });

    test("the fix-end line reads the account's stored date as a plain fact", () => {
      const soon = new Date();
      soon.setUTCMonth(soon.getUTCMonth() + 3);
      loaderData = loaded({ fixedRateEndDate: soon.toISOString().slice(0, 10) });
      const { getByText, container } = customRender(<MortgageContainer />);
      expect(getByText(/Your fixed rate ends in [23] months\./)).toBeDefined();
      const line = container.querySelector("#mortgage-refinance-warning");
      expect(line?.textContent).not.toMatch(/worth comparing|usually raises|shock/i);
      fireEvent.click(screen.getByRole("button", { name: "Model a rate change" }));
      expect(screen.getByRole("tab", { name: "Rate change" }).getAttribute("aria-selected")).toBe(
        "true",
      );
    });
  });

  describe("scenario zone", () => {
    test("three tools in one Tabs control, the first selected", () => {
      loaderData = loaded();
      const { container, getByRole } = customRender(<MortgageContainer />);
      expect(getByRole("region", { name: "Model a change to your mortgage" })).toBeDefined();
      expect(screen.getByText("Illustration, not saved")).toBeDefined();
      expect(getByRole("tablist", { name: "Mortgage what-if tools" })).toBeDefined();
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
        "Overpay",
        "Rate change",
        "Overpay or save",
      ]);
      const panelOf = (id: string) => container.querySelector(id)?.closest("[role='tabpanel']");
      expect(panelOf("#mock-simulator")?.hasAttribute("hidden")).toBe(false);
      expect(panelOf("#mock-compare")?.hasAttribute("hidden")).toBe(true);
      selectTab("Overpay or save");
      expect(panelOf("#mock-compare")?.hasAttribute("hidden")).toBe(false);
      expect(panelOf("#mock-simulator")?.hasAttribute("hidden")).toBe(true);
    });

    test("?tool= selects a what-if tool and scrolls to the zone", () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      loaderData = loaded();
      searchParams = new URLSearchParams("tool=overpay-vs-save");
      customRender(<MortgageContainer />);
      expect(
        screen.getByRole("tab", { name: "Overpay or save" }).getAttribute("aria-selected"),
      ).toBe("true");
      expect(scrollIntoView).toHaveBeenCalled();
    });

    test("an unknown ?tool= value is ignored", () => {
      loaderData = loaded();
      searchParams = new URLSearchParams("tool=nonsense");
      customRender(<MortgageContainer />);
      expect(screen.getByRole("tab", { name: "Overpay" }).getAttribute("aria-selected")).toBe(
        "true",
      );
    });

    test("the one notice is the standard notice with the ERC fact as its lead", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      const notices = container.querySelectorAll("[data-notice='projection']");
      expect(notices).toHaveLength(1);
      expect(notices[0]?.textContent).toMatch(/^Many fixed-rate deals allow overpayments/);
    });

    test("starting figures sit behind More options and start from the saved figures", () => {
      loaderData = loaded();
      const { getByRole, getByLabelText, queryByLabelText } = customRender(<MortgageContainer />);
      expect(queryByLabelText("Balance to try range slider")).toBeNull();
      fireEvent.click(getByRole("button", { name: "More options" }));
      expect((getByLabelText("Balance to try range slider") as HTMLInputElement).value).toBe(
        "135400",
      );
      expect((getByLabelText("Rate to try range slider") as HTMLInputElement).value).toBe("4.5");
      expect((getByLabelText("Years left to try range slider") as HTMLInputElement).value).toBe(
        "20",
      );
    });

    test("changing any scenario input leaves the hero, strip and details unchanged", () => {
      loaderData = loaded();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { container, getAllByRole, getByRole } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "More options" }));
      const before = savedText(container);
      const sliders = container.querySelectorAll("input[type='range']");
      expect(sliders.length).toBeGreaterThanOrEqual(3);
      for (const slider of Array.from(sliders)) {
        const input = slider as HTMLInputElement;
        fireEvent.change(input, { target: { value: String(Number(input.max) / 2) } });
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
      const { container, getByRole } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "More options" }));
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      expect(setItem).not.toHaveBeenCalled();
      expect(window.location.search).toBe("");
    });

    test("the zone states its starting point and reset stays disabled until a change", () => {
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

    test("the rate change tool uses the user's real property value and fix date", () => {
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const { getAllByText, queryByText } = customRender(<MortgageContainer />);
      selectTab("Rate change");
      expect(getAllByText(/current LTV:/i).length).toBeGreaterThan(0);
      expect(queryByText(/Fixed rate end date not set/)).toBeNull();
    });

    test("Update your details opens the dialog with the saved values, not the scenario", () => {
      loaderData = loaded();
      const { container, getByRole, getByLabelText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "More options" }));
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      fireEvent.click(getByRole("button", { name: "Update your details" }));
      expect(field(/^Interest rate/).value).toMatch(/^4\.50?$/);
      expect(field(/^Years left/).value).toBe("20");
    });
  });

  describe("residential and buy to let", () => {
    test("no tabs when the user has only a residential mortgage", () => {
      loaderData = loaded();
      customRender(<MortgageContainer />);
      expect(screen.queryByRole("tablist", { name: "Property type" })).toBeNull();
    });

    test("tabs under the h1 when the user has both, and buy to let shows its overview", () => {
      loaderData = { ...loaded(), userProfile: { hasBuyToLet: true } };
      const { queryByText, getByText } = customRender(<MortgageContainer />);
      expect(screen.getByRole("tablist", { name: "Property type" })).toBeDefined();
      expect(queryByText("Your buy to let properties")).toBeNull();
      selectTab("Buy to let");
      // Balance and rate are not set for buy to let yet, so the page prompts for them.
      expect(
        getByText(
          "Add your buy to let mortgage balance and interest rate to see your monthly payment and what overpaying would change",
        ),
      ).toBeDefined();
      expect(queryByText(/180,000|250,000/)).toBeNull();
    });

    test("a buy to let mortgage with balance and rate shows the hero and the overview", () => {
      loaderData = {
        accounts: [],
        accountDetails: [],
        userProfile: {
          hasBuyToLet: true,
          buyToLetMortgageBalance: 200000,
          buyToLetMortgageRate: 5,
          buyToLetMortgageType: "interest-only",
          buyToLetMonthlyRental: 1200,
          buyToLetPropertyValue: 300000,
          buyToLetCount: 1,
        },
      };
      const { container, getByText } = customRender(<MortgageContainer />);
      // Only buy to let: no tabs, and the page opens on it.
      expect(screen.queryByRole("tablist", { name: "Property type" })).toBeNull();
      const hero = container.querySelector("[data-tone='hero']");
      expect(hero?.textContent).toContain("£833");
      expect(getByText("Your buy to let properties")).toBeDefined();
      expect(container.textContent).not.toMatch(/Section 24/);
      expectPageRules(container, { projectionNotices: 1 });
    });

    test("buy to let saves balance and rate on the profile and offers no term", async () => {
      setApiEnv();
      loaderData = { ...loaded(), userProfile: { hasBuyToLet: true } };
      const fetchSpy = okFetch();
      const { getByLabelText, getByRole, queryByLabelText, findByText } = customRender(
        <MortgageContainer />,
      );
      selectTab("Buy to let");
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      expect(within(screen.getByRole("dialog")).queryByLabelText(/^Years left/)).toBeNull();
      fireEvent.change(field(/^Remaining balance/), { target: { value: "200000" } });
      fireEvent.change(field(/^Interest rate/), { target: { value: "5.1" } });
      save();
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

  describe("editing saved details", () => {
    test("the edit dialog holds the linked account choice, and switching reads that account", () => {
      loaderData = {
        ...loaded(),
        accounts: [
          ...loaded().accounts,
          account({ id: "m2", name: "Second charge", balance: -20000 }),
        ],
      };
      const { getByLabelText, container } = customRender(<MortgageContainer />);
      openEdit();
      const select = getByLabelText("Mortgage account") as HTMLSelectElement;
      expect(select.value).toBe("m1");
      fireEvent.change(select, { target: { value: "m2" } });
      expect(field(/^Interest rate/).value).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      // m2 has no rate or term, so the page is back to one prompt.
      expect(container.querySelector("#mortgage-prompt")).not.toBeNull();
    });

    test("saving stores the rate on the mortgage account and never sends unsupported profile fields", async () => {
      setApiEnv();
      const fetchSpy = okFetch();
      const { getByLabelText, getByRole, findByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.5" } });
      fireEvent.change(field(/^Years left/), { target: { value: "18" } });
      fireEvent.click(getByRole("radio", { name: /Interest-only/ }));
      fireEvent.click(getByRole("radio", { name: /Repayment/ }));
      save();
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
      loaderData = { ...defaultLoaderData(), accounts: [account({ interestRate: 4.5 })] };
      const fetchSpy = okFetch();
      const { getByLabelText, getByRole, findByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      fireEvent.change(field(/^Years left/), { target: { value: "60" } });
      save();
      await findByText(/Saved repayment type/);
      const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        interestRate: 4.5,
        termMonths: 600,
      });
      openEdit();
      expect(field(/^Years left/).value).toBe("50");
    });

    test("saves the fixed rate end date on the account, and an emptied date clears it (E32)", async () => {
      setApiEnv();
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const fetchSpy = okFetch();
      const { getByLabelText, findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      const date = getByLabelText(/Fixed rate end date \(optional\)/) as HTMLInputElement;
      expect(date.value).toBe("2099-10-01");
      fireEvent.change(date, { target: { value: "2099-12-31" } });
      save();
      await findAllByText(/fixed rate end date/);
      const bodyOf = () => {
        const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
        if (!call) throw new Error("expected an account PATCH");
        return JSON.parse(String((call[1] as RequestInit).body));
      };
      expect(bodyOf()).toEqual({
        interestRate: 4.5,
        termMonths: 240,
        fixedRateEndDate: "2099-12-31",
      });

      fetchSpy.mockClear();
      openEdit();
      const again = getByLabelText(/Fixed rate end date/) as HTMLInputElement;
      expect(again.value).toBe("2099-12-31");
      fireEvent.change(again, { target: { value: "" } });
      save();
      await findAllByText(/fixed rate end date/);
      expect(bodyOf()).toEqual({ interestRate: 4.5, termMonths: 240, fixedRateEndDate: null });
    });

    test("the term field says where it is saved", () => {
      const { getByRole, getByLabelText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      const term = field(/^Years left/);
      const hintId = term.getAttribute("aria-describedby") ?? "";
      expect(document.getElementById(hintId.split(" ")[0] ?? "")?.textContent).toBe(
        "Saved on your mortgage account",
      );
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
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.5" } });
      save();
      expect((await findByRole("alert")).textContent).toContain(
        "We could not save your mortgage details. Nothing has changed. Try again.",
      );
      expect(queryByText(/Saved repayment type/)).toBeNull();
    });

    test("blanking the rate and term fields leaves them empty rather than 0 or 1", () => {
      const { getByLabelText, getByRole } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      const term = field(/^Years left/);
      const rate = field(/^Interest rate/);
      expect(rate.value).toBe("");
      fireEvent.change(term, { target: { value: "18" } });
      fireEvent.change(rate, { target: { value: "4.5" } });
      expect(term.value).toBe("18");
      fireEvent.change(term, { target: { value: "" } });
      fireEvent.change(rate, { target: { value: "" } });
      expect(term.value).toBe("");
      expect(rate.value).toBe("");
    });

    test("a balance typed in Edit is stored on the mortgage account as a liability", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = okFetch();
      const { getByLabelText, findAllByText, container } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Remaining balance/), { target: { value: "130000" } });
      save();
      await findAllByText(/Saved repayment type, balance/);
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
      openEdit();
      fireEvent.change(field(/^Remaining balance/), { target: { value: "90000" } });
      save();
      await findByRole("alert");
      fireEvent.click(getByRole("button", { name: "Cancel" }));
      expect(savedText(container)).toContain("£135,400");
      expect(savedText(container)).not.toContain("£90,000");
    });

    test("saved details say when they were last updated", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mortgage-summary")?.textContent).toContain(
        "Last updated June 2026",
      );
    });

    test("money and rate inputs never use type=number", () => {
      loaderData = loaded();
      customRender(<MortgageContainer />);
      openEdit();
      expect(document.querySelectorAll('input[type="number"]')).toHaveLength(0);
    });
  });

  describe("live region", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test("does not announce a headline on load", () => {
      vi.useFakeTimers();
      loaderData = loaded();
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
      {
        id: "m1",
        name: "Residential Mortgage",
        type: "Mortgage",
        balance: 186000,
        interestRate: 4.5,
        termMonths: 300,
      },
    ];
    const home = { id: "home", name: "Home (your estimate)", type: "Property", balance: 310000 };
    const ltvStrip = (container: HTMLElement) =>
      container.querySelector("#mortgage-saved")?.textContent ?? "";

    test("shows 60% from the seeded home Property account and the mortgage balance", () => {
      loaderData = {
        accounts: [...homeownerAccounts, home],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, getByRole } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).toContain("60.0%");
      fireEvent.click(getByRole("button", { name: "Show loan to value bands" }));
      expect(container.querySelector("#ltv-milestones-heading")?.textContent).toContain(
        "Current LTV: 60.0%",
      );
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
      expect(ltvStrip(container)).toContain("60.0%");
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
      expect(ltvStrip(container)).toContain("60.0%");
    });

    test("a profile homeValue alone is never used (the backend does not store it)", () => {
      loaderData = {
        accounts: homeownerAccounts,
        accountDetails: [],
        userProfile: { housingStatus: "mortgage", homeValue: 310000 },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).not.toContain("60.0%");
      expect(screen.queryByRole("button", { name: "Show loan to value bands" })).toBeNull();
    });

    test("stays not set, never 0%, without a home value", () => {
      loaderData = {
        accounts: homeownerAccounts,
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, getByRole } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).not.toMatch(/\b0(\.0)?%/);
      expect(getByRole("button", { name: "Add your home's value" })).toBeDefined();
    });
  });
});

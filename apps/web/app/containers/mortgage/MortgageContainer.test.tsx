import { getCurrentUKTaxYear } from "@flump/finance-engine";
import { countFigures, countNotSet, expectPageRules } from "@repo/ui/testing";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import {
  ACCOUNT_ID,
  accountWithDetailsFixture,
  contractFetch,
} from "~/test/fixtures/contractResponses";
import customRender from "~/testUtils/customRender";
import MortgageContainer, {
  firstResidentialFigures,
  HOME_VALUE_NOT_SAVED,
} from "./MortgageContainer";

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
  accountDetails: [{ accountId: "m1", month: 6, year: 2026, value: -135400 }],
});

// Balance, rate, term and a home value: the complete state.
const loaded = (overrides: Record<string, unknown> = {}) => ({
  accounts: [
    account({ interestRate: 4.5, termMonths: 240, ...overrides }),
    { id: "home", name: "Home", type: "Property", balance: 350000 },
  ],
  accountDetails: [{ accountId: "m1", month: 6, year: 2026, value: -135400 }],
  userProfile: {},
});

// Per-test loader data; a plain variable keeps it stable across re-renders and is reset below.
let loaderData: Record<string, unknown> = defaultLoaderData();
const mockNavigate = vi.fn();
const mockRevalidate = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(() => loaderData),
    useNavigate: () => mockNavigate,
    useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
    // The root loader's profile (audit slice 8): the same saved profile this page's loader has.
    useRouteLoaderData: () => ({ userProfile: loaderData.userProfile }),
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
const okFetch = () => vi.spyOn(globalThis, "fetch").mockImplementation(contractFetch());

/** Radix tabs select on mouse down, not click. */
const selectTab = (name: string | RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }));
/** The what-if zone starts closed below the saved figures; open it from its named button. */
const openZone = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show what-if: overpay or a new rate" }));
/** A field in the edit dialog. */
const field = (label: RegExp) =>
  within(screen.getByRole("dialog")).getByLabelText(label) as HTMLInputElement;
const openEdit = () => fireEvent.click(screen.getByRole("button", { name: /^Edit$/ }));
const save = () => fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
const savedText = (container: HTMLElement) =>
  `${container.querySelector("#mortgage-saved")?.textContent ?? ""}|${
    container.querySelector("#mortgage-summary")?.textContent ?? ""
  }`;

/** Old buy-to-let profile figures: migrated into accounts, and never read for figures now. */
const OLD_BTL_PROFILE = {
  hasBuyToLet: true,
  buyToLetMortgageBalance: 999999,
  buyToLetMortgageRate: 9,
  buyToLetMortgageType: "repayment",
  buyToLetPropertyValue: 111111,
  buyToLetMonthlyRental: 1200,
  buyToLetCount: 4,
};

/** A buy-to-let mortgage linked to its rental property (system audit slice 4). */
const btlAccounts = (): Record<string, unknown>[] => [
  {
    id: "b1",
    name: "Flat 2 mortgage",
    type: "Mortgage",
    accountSubtype: "btl_mortgage",
    balance: -150000,
    interestRate: 5,
    repaymentType: "interest-only",
    linkedAccountId: "r1",
    updatedAt: "2026-11-01T09:00:00.000Z",
  },
  { id: "r1", name: "Flat 2", type: "Property", accountSubtype: "rental", balance: 250000 },
];

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
          name: "Add your years left to see when the term ends and what overpaying would change",
        }),
      ).toBeDefined();
      const prompt = container.querySelector("#mortgage-prompt") as HTMLElement;
      expect(prompt.textContent).toContain("£135,400");
      // Rates show as entered, never padded to "4.50%".
      expect(prompt.textContent).toContain("4.5%");
      expect(prompt.textContent).not.toContain("4.50%");
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
          name: "Add your interest rate and years left to see when the term ends and what overpaying would change",
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

    test("with no mortgage on record, the empty state does not assume one", () => {
      loaderData = { accounts: [], accountDetails: [] };
      const { getByRole, getByText, queryByText, container } = customRender(<MortgageContainer />);
      const empty = container.querySelector("#mortgage-empty") as HTMLElement;
      expect(empty).not.toBeNull();
      // One illustration in view: the page icon in the header, none in the empty state.
      expect(container.querySelector("#mortgage-empty-illustration")).toBeNull();
      expect(container.querySelectorAll("svg[data-scene]")).toHaveLength(1);
      expect(getByRole("heading", { name: "No mortgage added" })).toBeDefined();
      expect(
        getByText("If you have a mortgage, add it to see your payment and when the term ends."),
      ).toBeDefined();
      // No copy that assumes the reader owns a home or has a mortgage.
      expect(container.textContent).not.toMatch(/What you owe on your mortgage|payoff date/);
      expect(queryByText(/150,000/)).toBeNull();
      expect(countNotSet(container)).toBe(0);
      fireEvent.click(getByRole("button", { name: "Add a mortgage" }));
      expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
    });

    test("details that say there is a mortgage but no account keep the factual empty state", () => {
      loaderData = { accounts: [], accountDetails: [], userProfile: { hasMortgage: true } };
      const { getByRole, getByText, getAllByRole, container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mortgage-empty")).not.toBeNull();
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
    test("hero is the saved balance when no payment is saved; a strip of three", () => {
      loaderData = loaded();
      const { container, getByText } = customRender(<MortgageContainer />);
      const heroes = container.querySelectorAll("[data-tone='hero']");
      expect(heroes).toHaveLength(1);
      const hero = heroes[0] as HTMLElement;
      // Ruling 7: the hero holds a saved fact only, never an estimate.
      expect(hero.textContent).toContain("Remaining balance");
      expect(hero.textContent).toContain("£135,400");
      expect(hero.textContent).not.toMatch(/Estimate|Monthly payment|paid off/i);
      const saved = container.querySelector("#mortgage-saved") as HTMLElement;
      // Ruling D2: the subline is a saved fact (the repayment type), never a term end month.
      expect(hero.textContent).toContain("Repayment mortgage");
      expect(hero.textContent).not.toMatch(/Term ends/);
      expect(saved.textContent).not.toMatch(/Paid off by|Sept/);
      expect(saved.textContent).toMatch(/Monthly payment.*£\d{3}Estimate/);
      expect(saved.querySelectorAll("[data-kpi-value]")).toHaveLength(3);
      expect(saved.textContent).toContain("4.5%");
      expect(saved.textContent).not.toContain("4.50%");
      expect(saved.textContent).toContain("Loan to value");
      expect(saved.textContent).toContain("38.7%");
      // The balance is the hero, so it is not repeated as a KPI.
      expect(saved.textContent?.match(/£135,400/g)).toHaveLength(1);
      expect(getByText("Your details")).toBeDefined();
    });

    test("a saved monthly payment is the hero, with the fixed rate end as its subline", () => {
      // The seeded homeowner: £186,000 at 4.5%, 218 months left, £1,250 a month saved.
      loaderData = {
        accounts: [
          account({
            balance: -186000,
            interestRate: 4.5,
            termMonths: 218,
            monthlyContribution: 1250,
            fixedRateEndDate: "2099-07-01",
          }),
          { id: "home", name: "Home", type: "Property", balance: 310000 },
        ],
        accountDetails: [],
        userProfile: {},
      };
      const { container, getByText } = customRender(<MortgageContainer />);
      const heroes = container.querySelectorAll("[data-tone='hero']");
      expect(heroes).toHaveLength(1);
      const hero = heroes[0] as HTMLElement;
      expect(hero.textContent).toContain("Monthly payment");
      expect(hero.textContent).toContain("£1,250");
      expect(hero.textContent).toContain("Fixed until Jul 2099");
      expect(hero.textContent).not.toMatch(/Term ends|Estimate|Paid off/i);
      const saved = container.querySelector("#mortgage-saved") as HTMLElement;
      expect(saved.querySelectorAll("[data-kpi-value]")).toHaveLength(3);
      expect(saved.textContent).toContain("Remaining balance");
      expect(saved.textContent).toContain("£186,000");
      // The rate KPI does not repeat the fix end.
      expect(saved.textContent?.match(/Fixed until/g)).toHaveLength(1);
      // Loan to value to at most 1 place, a trailing zero dropped.
      expect(saved.textContent).toContain("60%");
      expect(saved.textContent).not.toContain("60.0%");
      expect(saved.textContent).not.toMatch(/Estimate/);
      // "Your details" shows years left in years and months.
      expect(getByText("18 years 2 months")).toBeDefined();
      // The what-if zone is closed, so its notice is not on the page yet.
      expectPageRules(container, { maxNotSet: 0, projectionNotices: 0 });
      openZone();
      expectPageRules(container, { maxNotSet: 0, projectionNotices: 1 });
    });

    test("the rate change tool shows the saved payment as the current payment", () => {
      loaderData = {
        accounts: [
          account({ interestRate: 4.5, termMonths: 218, monthlyContribution: 1250 }),
          { id: "home", name: "Home", type: "Property", balance: 350000 },
        ],
        accountDetails: [],
        userProfile: {},
      };
      const { container } = customRender(<MortgageContainer />);
      openZone();
      selectTab("Rate change");
      const results = container.querySelector("#remortgage-results") as HTMLElement;
      expect(results.textContent).toContain("Current payment£1,250");
      expect(results.textContent).not.toContain("Current payment (estimate)");
    });

    test("page rules: one hero, one notice below the h1, one primary, first view within budget", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      expectPageRules(container, { maxNotSet: 0, projectionNotices: 0 });
      openZone();
      expectPageRules(container, { maxNotSet: 0, projectionNotices: 1 });
      // "Your details" sits above the scenario zone.
      expect(countFigures(container.querySelector("#mortgage-saved") as HTMLElement)).toBe(4);
      const zone = container.querySelector("#mortgage-scenario") as HTMLElement;
      const summary = container.querySelector("#mortgage-summary") as HTMLElement;
      expect(summary.compareDocumentPosition(zone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test("the fixed rate end date is the hero subline", () => {
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const { container } = customRender(<MortgageContainer />);
      const hero = container.querySelector("[data-tone='hero']") as HTMLElement;
      expect(hero.textContent).toContain("Fixed until Oct 2099");
      expect(
        container.querySelector("#mortgage-saved")?.textContent?.match(/Fixed until/g),
      ).toHaveLength(1);
    });

    test("an ended fixed rate reads as ended in the hero subline", () => {
      loaderData = loaded({ fixedRateEndDate: "2001-01-01" });
      const { container } = customRender(<MortgageContainer />);
      const hero = container.querySelector("[data-tone='hero']") as HTMLElement;
      expect(hero.textContent).toContain("Fixed rate has ended");
    });

    test("loan to value without a home value is one Not set with one action", () => {
      loaderData = { ...loaded(), accounts: [account({ interestRate: 4.5, termMonths: 240 })] };
      const { container, getByRole, queryByRole } = customRender(<MortgageContainer />);
      expect(countNotSet(container)).toBe(1);
      expect(queryByRole("button", { name: "Show loan to value bands" })).toBeNull();
      fireEvent.click(getByRole("button", { name: "Add your home's value" }));
      expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
    });

    test("cost details are a quiet drawer, closed at first, and there is no bands drawer", () => {
      loaderData = loaded();
      const { container, getByRole, queryByRole } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mock-tracker")).toBeNull();
      fireEvent.click(getByRole("button", { name: "Show cost details" }));
      expect(container.querySelector("#mock-tracker")).not.toBeNull();
      // Loan to value stays as the KPI only.
      expect(queryByRole("button", { name: "Show loan to value bands" })).toBeNull();
      expect(container.querySelector("#ltv-milestones-heading")).toBeNull();
    });

    test("no separate housing cost card: the payment is in the strip", () => {
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
    test("starts closed with a one-line summary and opens from the named button", () => {
      loaderData = loaded();
      customRender(<MortgageContainer />);
      expect(screen.getByText(/^Starts from your mortgage of/)).toBeDefined();
      expect(screen.queryByRole("tablist", { name: "Mortgage what-if tools" })).toBeNull();
      const button = screen.getByRole("button", { name: "Show what-if: overpay or a new rate" });
      expect(button.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(button);
      expect(
        screen.getByRole("button", { name: "Hide what-if" }).getAttribute("aria-expanded"),
      ).toBe("true");
      expect(screen.getByRole("tablist", { name: "Mortgage what-if tools" })).toBeDefined();
    });

    test("three tools in one Tabs control, the first selected", () => {
      loaderData = loaded();
      const { container, getByRole } = customRender(<MortgageContainer />);
      openZone();
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
      // The zone opens by itself for a ?tool= link.
      expect(
        screen.getByRole("button", { name: "Hide what-if" }).getAttribute("aria-expanded"),
      ).toBe("true");
      expect(
        screen.getByRole("tab", { name: "Overpay or save" }).getAttribute("aria-selected"),
      ).toBe("true");
      expect(scrollIntoView).toHaveBeenCalled();
    });

    test("an unknown ?tool= value is ignored", () => {
      loaderData = loaded();
      searchParams = new URLSearchParams("tool=nonsense");
      customRender(<MortgageContainer />);
      // An unknown value does not open the zone.
      expect(screen.queryByRole("tab", { name: "Overpay" })).toBeNull();
      openZone();
      expect(screen.getByRole("tab", { name: "Overpay" }).getAttribute("aria-selected")).toBe(
        "true",
      );
    });

    test("the one notice is the standard notice, with no ERC lead", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      openZone();
      const notices = container.querySelectorAll("[data-notice='projection']");
      expect(notices).toHaveLength(1);
      expect(notices[0]?.textContent).not.toMatch(/fixed-rate deals|early repayment/);
    });

    test("starting figures sit behind Starting figures and start from the saved figures", () => {
      loaderData = loaded();
      const { getByRole, getByLabelText, queryByLabelText } = customRender(<MortgageContainer />);
      openZone();
      expect(queryByLabelText("Balance to try")).toBeNull();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
      expect((getByLabelText("Balance to try") as HTMLInputElement).value).toBe("135400");
      expect((getByLabelText("Rate to try") as HTMLInputElement).value).toBe("4.5");
      expect((getByLabelText("Years left to try") as HTMLInputElement).value).toBe("20");
    });

    test("changing any scenario input leaves the hero, strip and details unchanged", () => {
      loaderData = loaded();
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { container, getAllByRole, getByRole } = customRender(<MortgageContainer />);
      openZone();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
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
      openZone();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      expect(setItem).not.toHaveBeenCalled();
      expect(window.location.search).toBe("");
    });

    test("the zone does not repeat the saved figures and reset is absent until a change", () => {
      loaderData = loaded();
      const { queryByText, queryByRole } = customRender(<MortgageContainer />);
      // The starting figures are the inputs under Starting figures, so no basis line repeats them.
      expect(queryByText(/Starting from your figures/)).toBeNull();
      expect(queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    });

    test("the rate change tool uses the fix date, and the zone has one Starting figures drawer", () => {
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const { queryByText } = customRender(<MortgageContainer />);
      openZone();
      selectTab("Rate change");
      // No loan to value bands in the tool.
      expect(screen.getAllByRole("button", { name: "Starting figures" })).toHaveLength(1);
      expect(queryByText(/Next LTV band/)).toBeNull();
      expect(queryByText(/Fixed rate end date not set/)).toBeNull();
    });

    test("once the rate to try differs from the saved rate, the rate change tool drops the saved payment", () => {
      loaderData = {
        accounts: [
          account({ interestRate: 4.5, termMonths: 218, monthlyContribution: 1250 }),
          { id: "home", name: "Home", type: "Property", balance: 350000 },
        ],
        accountDetails: [],
        userProfile: {},
      };
      const { container, getByRole, getByLabelText } = customRender(<MortgageContainer />);
      openZone();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
      fireEvent.change(getByLabelText("Rate to try"), { target: { value: "3" } });
      selectTab("Rate change");
      const results = container.querySelector("#remortgage-results") as HTMLElement;
      expect(results.textContent).toContain("Current payment (estimate)");
      expect(results.textContent).not.toContain("£1,250");
      // The default new rate (5.2%) is higher than 3%, so the change is never a fall.
      const outcome = container.querySelector("#remortgage-outcome") as HTMLElement;
      expect(outcome.textContent).toMatch(/\+£[\d,]+ a month/);
      expect(outcome.textContent).not.toMatch(/\u2212£/);
    });

    test("Edit in Your details opens the dialog with the saved values, not the scenario", () => {
      loaderData = loaded();
      const { container, getByRole } = customRender(<MortgageContainer />);
      openZone();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
      const slider = container.querySelector("input[type='range']") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "500000" } });
      fireEvent.click(getByRole("button", { name: "Edit" }));
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

    test("tabs under the h1 when the user has both, and buy to let reads its accounts", () => {
      loaderData = {
        ...loaded(),
        accounts: [...loaded().accounts, ...btlAccounts()],
        userProfile: OLD_BTL_PROFILE,
      };
      const { container, queryByText, getByText } = customRender(<MortgageContainer />);
      expect(screen.getByRole("tablist", { name: "Property type" })).toBeDefined();
      expect(queryByText("Your buy to let properties")).toBeNull();
      selectTab("Buy to let");
      expect(getByText("Your buy to let properties")).toBeDefined();
      expect(container.querySelector("[data-tone='hero']")?.textContent).toContain("£150,000");
      expect(container.textContent).not.toMatch(/999,999|111,111/);
    });

    test("the buy to let tab reads the buy-to-let accounts, never the profile copy (HM-4, DB-1)", () => {
      loaderData = { accounts: btlAccounts(), accountDetails: [], userProfile: OLD_BTL_PROFILE };
      const { container, getByText } = customRender(<MortgageContainer />);
      // Only buy to let: no tabs, and the page opens on it.
      expect(screen.queryByRole("tablist", { name: "Property type" })).toBeNull();
      const hero = container.querySelector("[data-tone='hero']");
      expect(hero?.textContent).toContain("£150,000");
      const saved = container.querySelector("#mortgage-saved")?.textContent ?? "";
      // Interest-only at 5%: 150,000 x 0.05 / 12 = 625 a month, an estimate.
      expect(saved).toMatch(/Monthly payment.*£625Estimate/);
      // Loan to value against the linked rental: 150,000 / 250,000 = 60%.
      expect(saved).toContain("60%");
      // Equity: 250,000 - 150,000 = 100,000, both held solely.
      const equity = container.querySelector("[data-testid='mortgage-equity']") as HTMLElement;
      expect(equity.textContent).toContain("£100,000");
      // The count comes from the rental Property accounts, not the profile's 4.
      expect(getByText("1 property")).toBeDefined();
      expect(getByText("Flat 2")).toBeDefined();
      expect(container.textContent).not.toMatch(/999,999|111,111|1,200/);
      expect(container.textContent).not.toMatch(/Section 24/i);
      expect(container.querySelector("#mortgage-summary")?.textContent).toContain("Interest-only");
      // The what-if zone is closed, so its notice is not on the page yet.
      expectPageRules(container, { projectionNotices: 0 });
      openZone();
      expectPageRules(container, { projectionNotices: 1 });
    });

    test("each rental property's gross yield reads the rent linked to it in Self Assessment (L22)", () => {
      const start = getCurrentUKTaxYear().slice(0, 4);
      const accounts = btlAccounts().map((a) => (a.id === "r1" ? { ...a, balance: 230000 } : a));
      loaderData = {
        accounts,
        accountDetails: [],
        userProfile: OLD_BTL_PROFILE,
        taxRecords: [
          {
            id: "t1",
            userId: "u",
            type: "income",
            source: "rental",
            category: "rental_income",
            name: "Flat rent",
            amount: 1150,
            frequency: "monthly",
            date: `${start}-04-06`,
            endDate: null,
            notes: null,
            receiptFilename: null,
            receiptMimeType: null,
            accountId: "r1",
          },
        ],
      };
      const { container } = customRender(<MortgageContainer />);
      // 1,150 a month for the tax year = 13,800; 13,800 / 230,000 = 6.0%.
      const overview = container.querySelector("#btl-overview")?.textContent ?? "";
      expect(overview).toContain("Gross yield 6.0%");
      // The profile's old monthly rental (1,200) is never read.
      expect(overview).not.toContain("1,200");
    });

    test("a rental property with no linked rent says how to see its yield", () => {
      loaderData = { accounts: btlAccounts(), accountDetails: [], userProfile: OLD_BTL_PROFILE };
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#btl-overview")?.textContent).toContain(
        "Add rent in Self Assessment, linked to this property, to see its yield.",
      );
    });

    test("the what-if tools start from the buy-to-let account's saved term, saving nothing (P40)", () => {
      setApiEnv();
      const fetchSpy = okFetch();
      loaderData = {
        accounts: [
          {
            id: "btl-m",
            name: "BTL mortgage",
            type: "Mortgage",
            accountSubtype: "btl_mortgage",
            balance: -200000,
            interestRate: 5,
            // 180 months saved on the account = 15 years.
            termMonths: 180,
          },
        ],
        accountDetails: [],
        userProfile: {
          hasBuyToLet: true,
          buyToLetMortgageBalance: 200000,
          buyToLetMortgageRate: 5,
          buyToLetMortgageType: "interest-only",
        },
      };
      customRender(<MortgageContainer />);
      openZone();
      fireEvent.click(screen.getByRole("button", { name: /Starting figures/ }));
      const years = screen.getAllByLabelText(/^Years left to try/) as HTMLInputElement[];
      expect(years.map((el) => el.value)).toContain("15");
      expect(patches(fetchSpy)).toHaveLength(0);
    });

    test("with no buy-to-let mortgage the tab offers to add one and makes nothing up from the profile", () => {
      loaderData = {
        ...loaded(),
        accounts: [...loaded().accounts, btlAccounts()[1] as Record<string, unknown>],
        userProfile: OLD_BTL_PROFILE,
      };
      const { container, getByRole, getByText } = customRender(<MortgageContainer />);
      selectTab("Buy to let");
      expect(getByText("No buy to let mortgage added")).toBeDefined();
      expect(container.textContent).not.toMatch(/999,999|111,111/);
      fireEvent.click(getByRole("button", { name: "Add a buy to let mortgage" }));
      expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");
    });

    test("buy to let saves balance, rate, repayment type and property value on its accounts", async () => {
      setApiEnv();
      loaderData = { accounts: btlAccounts(), accountDetails: [], userProfile: OLD_BTL_PROFILE };
      const fetchSpy = okFetch();
      const { container, findByText } = customRender(<MortgageContainer />);
      fireEvent.click(
        within(container.querySelector("#mortgage-summary") as HTMLElement).getByRole("button", {
          name: /^Edit$/,
        }),
      );
      expect(within(screen.getByRole("dialog")).queryByLabelText(/^Years left/)).toBeNull();
      expect(field(/^What the property is worth/).value).toContain("250,000");
      fireEvent.change(field(/^Remaining balance/), { target: { value: "140000" } });
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.8" } });
      fireEvent.click(screen.getByRole("radio", { name: /Repayment/ }));
      fireEvent.change(field(/^What the property is worth/), { target: { value: "260000" } });
      save();
      await findByText(/Saved repayment type, balance, interest rate and property value/);
      const mortgagePatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/b1"));
      if (!mortgagePatch) throw new Error("expected a PATCH of the buy-to-let mortgage");
      expect(JSON.parse(String((mortgagePatch[1] as RequestInit).body))).toEqual({
        balance: -140000,
        interestRate: 4.8,
        repaymentType: "repayment",
      });
      expect(new Headers((mortgagePatch[1] as RequestInit).headers).get("If-Match")).toBe(
        '"2026-11-01T09:00:00.000Z"',
      );
      const rentalPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/r1"));
      if (!rentalPatch) throw new Error("expected a PATCH of the rental property");
      expect(JSON.parse(String((rentalPatch[1] as RequestInit).body))).toEqual({ balance: 260000 });
      // Nothing about buy to let goes to the profile any more.
      expect(patches(fetchSpy).some(([url]) => String(url).endsWith("/user-profile"))).toBe(false);
    });

    test("a buy-to-let mortgage with no property adds a rental and links it", async () => {
      setApiEnv();
      const [mortgage] = btlAccounts();
      loaderData = {
        accounts: [{ ...mortgage, linkedAccountId: null }],
        accountDetails: [],
        userProfile: {},
      };
      const fetchSpy = okFetch();
      const { container, findByText } = customRender(<MortgageContainer />);
      expect(container.querySelector("[data-testid='mortgage-equity']")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add the property value" }));
      fireEvent.change(field(/^What the property is worth/), { target: { value: "260000" } });
      save();
      await findByText(/property value/);
      const post = fetchSpy.mock.calls.find(
        ([url, init]) =>
          String(url) === "/api/accounts" && (init as RequestInit)?.method === "POST",
      );
      if (!post) throw new Error("expected a POST of the rental property");
      expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({
        name: "Buy-to-let property",
        type: "Property",
        accountSubtype: "rental",
        balance: 260000,
        ownership: "sole",
      });
      const link = patches(fetchSpy).find(
        ([url, init]) =>
          String(url).endsWith("/accounts/b1") &&
          "linkedAccountId" in JSON.parse(String((init as RequestInit).body)),
      );
      if (!link) throw new Error("expected the mortgage to be linked to the new rental");
      expect(JSON.parse(String((link[1] as RequestInit).body))).toEqual({
        linkedAccountId: ACCOUNT_ID,
      });
    });

    test("a saved rate stays after choosing the account again, and is not sent back (CS-1)", async () => {
      setApiEnv();
      loaderData = {
        ...loaded(),
        accounts: [
          ...loaded().accounts,
          account({ id: "m2", name: "Second charge", balance: -20000 }),
        ],
      };
      const fetchSpy = okFetch();
      const { container, findByText, getByLabelText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.1" } });
      save();
      await findByText(/Saved interest rate/);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      // Choose the other account, then this one again: the loader still holds 4.5%.
      openEdit();
      const select = getByLabelText("Mortgage account") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "m2" } });
      fireEvent.change(select, { target: { value: "m1" } });
      expect(field(/^Interest rate/).value).toBe("4.1");
      // A later save must not send the old rate back.
      save();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(savedText(container)).toContain("4.1%");
      expect(savedText(container)).not.toContain("4.5%");
      const rates = patches(fetchSpy)
        .filter(([url]) => String(url).endsWith("/accounts/m1"))
        .map(([, init]) => JSON.parse(String((init as RequestInit).body)).interestRate);
      expect(rates).not.toContain(4.5);
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

    test("switching accounts in the dialog never clears a stored fixed rate end date", async () => {
      setApiEnv();
      loaderData = {
        ...loaded({ fixedRateEndDate: "2099-10-01" }),
        accounts: [
          ...loaded({ fixedRateEndDate: "2099-10-01" }).accounts,
          account({ id: "m2", name: "Second charge", balance: -20000 }),
        ],
      };
      const fetchSpy = okFetch();
      const { getByLabelText, findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      const select = getByLabelText("Mortgage account") as HTMLSelectElement;
      // There is no "none" option to unlink the account and blank the form.
      expect(Array.from(select.options).map((o) => o.value)).toEqual(["m1", "m2"]);
      fireEvent.change(select, { target: { value: "m2" } });
      fireEvent.change(select, { target: { value: "m1" } });
      expect(getByLabelText(/Fixed rate end date/).textContent).toContain("1 Oct 2099");
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      save();
      await findAllByText(/^Saved /);
      const bodies = patches(fetchSpy)
        .filter(([url]) => String(url).includes("/accounts/"))
        .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) expect(body).not.toHaveProperty("fixedRateEndDate");
    });

    test("saving stores the rate on the mortgage account and never sends unsupported profile fields", async () => {
      setApiEnv();
      const fetchSpy = okFetch();
      const { getByLabelText, getByRole, findByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.5" } });
      fireEvent.change(field(/^Years left/), { target: { value: "18" } });
      fireEvent.change(field(/^Months/), { target: { value: "2" } });
      fireEvent.click(getByRole("radio", { name: /Interest-only/ }));
      fireEvent.click(getByRole("radio", { name: /Repayment/ }));
      save();
      await findByText(/^Saved /);

      const calls = patches(fetchSpy);
      const accountPatch = calls.find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      // E20-N9: the browser calls the same-origin proxy and never sends a bearer token.
      expect(String(accountPatch[0])).toBe("/api/accounts/m1");
      expect(JSON.stringify(accountPatch[1])).not.toMatch(/authorization|bearer/i);
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        interestRate: 4.5,
        termMonths: 218,
      });
      const profilePatch = calls.find(([url]) => String(url).endsWith("/user-profile"));
      if (!profilePatch) throw new Error("expected a profile PATCH");
      const profileBody = JSON.parse(String((profilePatch[1] as RequestInit).body));
      // The repayment type lives on the account only (system audit leftovers, item 3).
      for (const key of [
        "mortgageRate",
        "mortgageTermYears",
        "mortgageBalance",
        "homeValue",
        "mortgageType",
      ]) {
        expect(profileBody).not.toHaveProperty(key);
      }
    });

    test("saves the monthly payment on the account and the hero shows it at once", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = okFetch();
      const { container, findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      const input = field(/^Monthly payment/);
      expect(input.value).toBe("");
      fireEvent.change(input, { target: { value: "1300" } });
      fireEvent.blur(input);
      save();
      await findAllByText(/monthly payment/);
      const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!call) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((call[1] as RequestInit).body))).toMatchObject({
        monthlyContribution: 1300,
      });
      const hero = container.querySelector("[data-tone='hero']") as HTMLElement;
      expect(hero.textContent).toContain("Monthly payment");
      expect(hero.textContent).toContain("£1,300");
    });

    test("clearing the saved monthly payment sends null and the hero falls back to the balance", async () => {
      setApiEnv();
      loaderData = loaded({ monthlyContribution: 1250 });
      const fetchSpy = okFetch();
      const { container, findAllByText } = customRender(<MortgageContainer />);
      expect(container.querySelector("[data-tone='hero']")?.textContent).toContain(
        "Monthly payment",
      );
      openEdit();
      const input = field(/^Monthly payment/);
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.blur(input);
      save();
      await findAllByText(/monthly payment/);
      const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!call) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((call[1] as RequestInit).body))).toMatchObject({
        monthlyContribution: null,
      });
      const hero = container.querySelector("[data-tone='hero']") as HTMLElement;
      expect(hero.textContent).toContain("Remaining balance");
      expect(hero.textContent).not.toContain("£1,250");
    });

    test("an unchanged monthly payment is not sent", async () => {
      setApiEnv();
      loaderData = loaded({ monthlyContribution: 1250 });
      const fetchSpy = okFetch();
      const { findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      expect(field(/^Monthly payment/).value).toContain("1,250");
      save();
      await findAllByText(/^Saved /);
      for (const [, init] of patches(fetchSpy)) {
        expect(JSON.parse(String((init as RequestInit).body))).not.toHaveProperty(
          "monthlyContribution",
        );
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
      await findByText(/^Saved /);
      const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      // The rate is already saved and the repayment type was not changed, so only the term is sent.
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        termMonths: 600,
      });
      openEdit();
      expect(field(/^Years left/).value).toBe("50");
      expect(field(/^Months/).value).toBe("0");
    });

    test("prefills a stored term as whole years and months, never decimal years", () => {
      loaderData = { ...defaultLoaderData(), accounts: [account({ termMonths: 218 })] };
      const { getByRole } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      expect(field(/^Years left/).value).toBe("18");
      expect(field(/^Months/).value).toBe("2");
    });

    test("saves the fixed rate end date on the account, and an emptied date clears it (E32)", async () => {
      setApiEnv();
      loaderData = loaded({ fixedRateEndDate: "2099-10-01" });
      const fetchSpy = okFetch();
      const { getByLabelText, findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      const date = getByLabelText(/Fixed rate end date \(optional\)/);
      expect(date.textContent).toContain("1 Oct 2099");
      fireEvent.click(date);
      fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
      fireEvent.click(screen.getByRole("button", { name: "Dec" }));
      fireEvent.click(screen.getByRole("button", { name: "31 Dec 2099" }));
      save();
      await findAllByText(/fixed rate end date/);
      const bodyOf = () => {
        const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
        if (!call) throw new Error("expected an account PATCH");
        return JSON.parse(String((call[1] as RequestInit).body));
      };
      expect(bodyOf()).toEqual({ fixedRateEndDate: "2099-12-31" });

      fetchSpy.mockClear();
      openEdit();
      const again = getByLabelText(/Fixed rate end date/);
      expect(again.textContent).toContain("31 Dec 2099");
      fireEvent.click(again);
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      save();
      await findAllByText(/fixed rate end date/);
      // Only what changed: the repayment type is on the account since the first save.
      expect(bodyOf()).toEqual({ fixedRateEndDate: null });
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
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) =>
        String(url).includes("/accounts/")
          ? new Response(JSON.stringify({ message: "nope" }), { status: 500 })
          : contractFetch()(url, init),
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
      expect(queryByText(/^Saved interest rate/)).toBeNull();
    });

    test("sends the account's version, and a 412 says it changed somewhere else, reloads and keeps what was typed (BE-16)", async () => {
      setApiEnv();
      mockRevalidate.mockClear();
      loaderData = {
        ...defaultLoaderData(),
        accounts: [account({ updatedAt: "2026-11-14T09:30:00.123Z" })],
      };
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (url, init) =>
          String(url).includes("/accounts/")
            ? new Response(JSON.stringify({ kind: "client" }), { status: 412 })
            : contractFetch()(url, init),
        );
      const { getByRole, findByRole, queryByText } = customRender(<MortgageContainer />);
      fireEvent.click(getByRole("button", { name: "Add mortgage details" }));
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.5" } });
      save();
      expect((await findByRole("alert")).textContent).toContain(
        "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
      );
      const patch = fetchSpy.mock.calls.find(([url]) => String(url).includes("/accounts/"));
      const sentHeaders = (patch?.[1]?.headers ?? {}) as Record<string, string>;
      expect(sentHeaders["If-Match"]).toBe('"2026-11-14T09:30:00.123Z"');
      // Slice 8: the profile save before it reloads saved data too, so two reloads: that one and the 412's.
      expect(mockRevalidate).toHaveBeenCalledTimes(2);
      expect(queryByText(/^Saved interest rate/)).toBeNull();
      // The edit dialog is still open with the rate that was typed.
      expect(field(/^Interest rate/).value).toBe("4.5");
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
      await findAllByText(/Saved balance/);
      const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        balance: -130000,
      });
      expect(savedText(container)).toContain("£130,000");
    });

    test("never reads the profile's old repayment answer: an account with none set is repayment", () => {
      loaderData = {
        ...loaded({ repaymentType: null }),
        userProfile: { mortgageType: "interest-only" },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mortgage-summary")?.textContent).toContain(
        "Repayment typeRepayment",
      );
    });

    test("reads the repayment type from the mortgage account before the profile", () => {
      loaderData = {
        ...loaded({ repaymentType: "interest-only" }),
        userProfile: { mortgageType: "repayment" },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("#mortgage-summary")?.textContent).toContain(
        "Repayment typeInterest-only",
      );
    });

    test("sends only the fields that changed", async () => {
      setApiEnv();
      loaderData = loaded({ repaymentType: "repayment" });
      const fetchSpy = okFetch();
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      save();
      await findByText("Saved interest rate");
      const accountPatch = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/m1"));
      if (!accountPatch) throw new Error("expected an account PATCH");
      expect(JSON.parse(String((accountPatch[1] as RequestInit).body))).toEqual({
        interestRate: 4.6,
      });
    });

    test("a failed save leaves the saved figures as they were", async () => {
      setApiEnv();
      loaderData = loaded();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) =>
        String(url).includes("/accounts/")
          ? new Response(JSON.stringify({ message: "nope" }), { status: 500 })
          : contractFetch()(url, init),
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

    test("last updated is the month of the latest mortgage balance, not the profile date (CH-6)", () => {
      loaderData = {
        ...loaded(),
        accountDetails: [
          { accountId: "m1", month: 2, year: 2026, value: -137000 },
          { accountId: "m1", month: 3, year: 2026, value: -135400 },
        ],
        userProfile: { updatedAt: "2026-10-01T09:00:00.000Z" },
      };
      const { container } = customRender(<MortgageContainer />);
      const summary = container.querySelector("#mortgage-summary")?.textContent ?? "";
      expect(summary).toContain("Last updated March 2026");
      expect(summary).not.toContain("October 2026");
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
      const { container } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).toContain("60%");
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
      expect(ltvStrip(container)).toContain("60%");
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
      expect(ltvStrip(container)).toContain("60%");
    });

    test("a profile homeValue alone is never used (the backend does not store it)", () => {
      loaderData = {
        accounts: homeownerAccounts,
        accountDetails: [],
        userProfile: { housingStatus: "mortgage", homeValue: 310000 },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).not.toContain("60%");
      expect(screen.queryByRole("button", { name: "Show loan to value bands" })).toBeNull();
    });

    // E34: the page works on the whole loan and whole property, whatever share the user counts.
    const jointMortgage = {
      ...homeownerAccounts[2],
      balance: -200000,
      ownership: "joint",
      sharePercent: 50,
    };
    const jointHome = { ...home, balance: 400000, ownership: "joint", sharePercent: 50 };
    const soleHome = { ...home, balance: 400000 };

    test("a joint mortgage on a joint property: whole loan, whole value, and the simulator starts from the whole loan", () => {
      loaderData = {
        accounts: [homeownerAccounts[0], jointMortgage, jointHome],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, getByRole, getByLabelText } = customRender(<MortgageContainer />);
      const strip = ltvStrip(container);
      expect(strip).toContain("50%");
      expect(strip).toContain("£200,000");
      expect(strip).toContain("Whole loan, held jointly");
      openZone();
      fireEvent.click(getByRole("button", { name: "Starting figures" }));
      // An overpayment pays the whole loan, so it is never applied to a share of it.
      expect((getByLabelText("Balance to try") as HTMLInputElement).value).toBe("200000");
    });

    test("a joint mortgage on a sole property: whole loan over whole value, never the share over it", () => {
      loaderData = {
        accounts: [homeownerAccounts[0], jointMortgage, soleHome],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container } = customRender(<MortgageContainer />);
      const strip = ltvStrip(container);
      expect(strip).toContain("50%");
      // The 50% share (100,000) over the whole value would read 25%.
      expect(strip).not.toContain("25%");
    });

    test("a sole mortgage carries no joint label", () => {
      loaderData = {
        accounts: [...homeownerAccounts, home],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).not.toContain("held jointly");
    });

    test("a second property not named buy to let leaves loan to value out and says why (HM-3)", () => {
      // Was 186,000 / (310,000 + 200,000) = 36.47%, shown as 36.5%. With two properties that could
      // each be the home there is no way to tell which, so the figure is not shown.
      loaderData = {
        accounts: [
          ...homeownerAccounts,
          home,
          { id: "rental", name: "Rental flat", type: "Property", balance: 200000 },
        ],
        accountDetails: [],
        userProfile: { housingStatus: "mortgage" },
      };
      const { container, getByText } = customRender(<MortgageContainer />);
      expect(ltvStrip(container)).not.toContain("36.5%");
      expect(ltvStrip(container)).not.toContain("60%");
      expect(
        getByText(
          "You have more than one property on Accounts, so we cannot tell which is your home.",
        ),
      ).toBeDefined();
      expect(screen.queryByRole("button", { name: "Add your home's value" })).toBeNull();
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

  describe("home value and equity", () => {
    const posts = (fetchSpy: ReturnType<typeof vi.spyOn>) =>
      fetchSpy.mock.calls.filter(([, init]) => (init as RequestInit)?.method === "POST");
    const bodyOf = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));
    const noHome = (overrides: Record<string, unknown> = {}) => ({
      accounts: [account({ interestRate: 4.5, termMonths: 240, ...overrides })],
      accountDetails: [{ accountId: "m1", month: 6, year: 2026, value: -135400 }],
      userProfile: {},
    });

    test("Your details shows the equity from the saved home and mortgage", () => {
      loaderData = loaded();
      const { container } = customRender(<MortgageContainer />);
      const row = container.querySelector("[data-testid='mortgage-equity']") as HTMLElement;
      // 350,000 - 135,400 = 214,600.
      expect(row.textContent).toContain("Your equity");
      expect(row.textContent).toContain("£214,600");
      expect(row.textContent).not.toMatch(/share/);
    });

    test("a joint mortgage on a sole home takes each at its own share", () => {
      loaderData = loaded({ ownership: "joint", sharePercent: 40 });
      const { container } = customRender(<MortgageContainer />);
      const row = container.querySelector("[data-testid='mortgage-equity']") as HTMLElement;
      // Home held solely, mortgage at 40%: 350,000 - 135,400 x 40 / 100 = 350,000 - 54,160
      // = 295,840.
      expect(row.textContent).toContain("£295,840");
      expect(row.textContent).toContain("At your share of the home and of the mortgage");
    });

    test("a joint home and mortgage at the same share show that share", () => {
      const base = loaded({ ownership: "joint", sharePercent: 40 });
      loaderData = {
        ...base,
        accounts: [base.accounts[0], { ...base.accounts[1], ownership: "joint", sharePercent: 40 }],
      };
      const { container } = customRender(<MortgageContainer />);
      const row = container.querySelector("[data-testid='mortgage-equity']") as HTMLElement;
      // 350,000 x 40 / 100 - 135,400 x 40 / 100 = 140,000 - 54,160 = 85,840.
      expect(row.textContent).toContain("£85,840");
      expect(row.textContent).toContain("At your 40% share");
    });

    test("no equity row without a home value", () => {
      loaderData = noHome();
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("[data-testid='mortgage-equity']")).toBeNull();
    });

    test("a changed value updates the one home Property account with its version", async () => {
      setApiEnv();
      loaderData = {
        ...loaded(),
        accounts: [
          loaded().accounts[0],
          { ...loaded().accounts[1], updatedAt: "2026-06-01T10:00:00.000Z" },
        ],
      };
      const fetchSpy = okFetch();
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      const input = field(/^What your home is worth/);
      expect(input.value).toContain("350,000");
      expect(screen.getByText("Your own estimate. Saved as your home on Accounts.")).toBeDefined();
      fireEvent.change(input, { target: { value: "360000" } });
      // 360,000 - 135,400 = 224,600, shown before saving.
      expect(
        within(screen.getByRole("dialog")).getByTestId("home-equity-line").textContent,
      ).toContain("£224,600");
      save();
      await findByText(/home value/);
      const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/home"));
      if (!call) throw new Error("expected a PATCH of the home account");
      expect(bodyOf(call)).toEqual({ balance: 360000 });
      expect(new Headers((call[1] as RequestInit).headers).get("If-Match")).toBeTruthy();
      expect(posts(fetchSpy).some(([url]) => String(url).endsWith("/accounts"))).toBe(false);
    });

    test("a failed home value save after the mortgage saved says what was kept", async () => {
      setApiEnv();
      loaderData = loaded();
      const ok = contractFetch();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        if (String(input).endsWith("/accounts/home")) {
          return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
        }
        return ok(input, init);
      });
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      fireEvent.change(field(/^What your home is worth/), { target: { value: "360000" } });
      save();
      expect(await findByText(HOME_VALUE_NOT_SAVED)).toBeDefined();
      expect(screen.queryByText(/Nothing has changed/)).toBeNull();
    });

    test("a failed home value save still shows the mortgage figures that did save", async () => {
      setApiEnv();
      loaderData = loaded();
      const ok = contractFetch();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        if (String(input).endsWith("/accounts/home")) {
          return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
        }
        return ok(input, init);
      });
      const { container, findByText } = customRender(<MortgageContainer />);
      expect(savedText(container)).toContain("£135,400");
      openEdit();
      fireEvent.change(field(/^Remaining balance/), { target: { value: "140000" } });
      fireEvent.change(field(/^What your home is worth/), { target: { value: "360000" } });
      save();
      expect(await findByText(HOME_VALUE_NOT_SAVED)).toBeDefined();
      // The balance PATCH went through, so the page reads £140,000, not the £135,400 from before.
      expect(savedText(container)).toContain("£140,000");
      expect(savedText(container)).not.toContain("£135,400");
    });

    test("two quick clicks on Save add one home, and Save is disabled while it saves", async () => {
      setApiEnv();
      loaderData = noHome();
      const ok = contractFetch();
      let releaseList: () => void = () => {};
      const listHeld = new Promise<void>((resolve) => {
        releaseList = resolve;
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = new URL(String(input), "http://web.test");
        if (url.pathname === "/api/accounts" && (init?.method ?? "GET") === "GET") {
          // Held, so the second click lands while the first save is still running.
          await listHeld;
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return ok(input, init);
      });
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^What your home is worth/), { target: { value: "300000" } });
      save();
      save();
      await act(async () => {});
      expect(
        (
          within(screen.getByRole("dialog")).getByRole("button", {
            name: /^Save$/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      releaseList();
      await findByText(/home value/);
      const homePosts = posts(fetchSpy).filter(([url]) => String(url) === "/api/accounts");
      expect(homePosts).toHaveLength(1);
    });

    test("a refused home value write after the mortgage saved still says the mortgage was kept", async () => {
      setApiEnv();
      loaderData = loaded();
      mockRevalidate.mockClear();
      const ok = contractFetch();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        if (String(input).endsWith("/accounts/home")) {
          return new Response(JSON.stringify({ kind: "client" }), { status: 412 });
        }
        return ok(input, init);
      });
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      fireEvent.change(field(/^What your home is worth/), { target: { value: "360000" } });
      save();
      expect(await findByText(HOME_VALUE_NOT_SAVED)).toBeDefined();
      expect(screen.queryByText(/changed somewhere else/i)).toBeNull();
      expect(mockRevalidate).toHaveBeenCalled();
    });

    test("a typed value is rounded to pence before it is sent", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = okFetch();
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^What your home is worth/), { target: { value: "360000.456" } });
      save();
      await findByText(/home value/);
      const call = patches(fetchSpy).find(([url]) => String(url).endsWith("/accounts/home"));
      if (!call) throw new Error("expected a PATCH of the home account");
      // 360,000.456 to 2 decimal places: the third decimal is 6, so .45 rounds up to 360,000.46.
      expect(bodyOf(call)).toEqual({ balance: 360000.46 });
    });

    test("a home added since the page loaded is updated, not added a second time", async () => {
      const OTHER_HOME_ID = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
      setApiEnv();
      loaderData = noHome();
      const ok = contractFetch();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = new URL(String(input), "http://web.test");
        if (url.pathname === "/api/accounts" && (init?.method ?? "GET") === "GET") {
          return new Response(
            JSON.stringify([
              {
                ...accountWithDetailsFixture,
                id: OTHER_HOME_ID,
                name: "Home (your estimate)",
                type: "Property",
                balance: 290000,
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return ok(input, init);
      });
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^What your home is worth/), { target: { value: "300000" } });
      save();
      await findByText(/home value/);
      const call = patches(fetchSpy).find(([url]) =>
        String(url).endsWith(`/accounts/${OTHER_HOME_ID}`),
      );
      if (!call) throw new Error("expected a PATCH of the home added elsewhere");
      expect(bodyOf(call)).toEqual({ balance: 300000 });
      expect(posts(fetchSpy).some(([url]) => String(url) === "/api/accounts")).toBe(false);
    });

    test("two properties found at save time: neither is written and none is added (HM-3)", async () => {
      setApiEnv();
      loaderData = noHome();
      const ok = contractFetch();
      const property = (id: string, name: string, balance: number) => ({
        ...accountWithDetailsFixture,
        id,
        name,
        type: "Property",
        balance,
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = new URL(String(input), "http://web.test");
        if (url.pathname === "/api/accounts" && (init?.method ?? "GET") === "GET") {
          return new Response(
            JSON.stringify([
              property("7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c41", "Home (your estimate)", 290000),
              property("7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c42", "Rental flat", 200000),
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return ok(input, init);
      });
      const { findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^What your home is worth/), { target: { value: "300000" } });
      save();
      await findAllByText(/^Saved /);
      expect(patches(fetchSpy).some(([url]) => /\/accounts\/7a1b2c3d/.test(String(url)))).toBe(
        false,
      );
      expect(posts(fetchSpy).some(([url]) => String(url) === "/api/accounts")).toBe(false);
    });

    test("an unchanged value is not sent", async () => {
      setApiEnv();
      loaderData = loaded();
      const fetchSpy = okFetch();
      const { findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      save();
      const messages = await findAllByText(/^Saved /);
      expect(messages.some((m) => /home value/.test(m.textContent ?? ""))).toBe(false);
      expect(patches(fetchSpy).some(([url]) => String(url).endsWith("/accounts/home"))).toBe(false);
    });

    test("with no home yet, a typed value adds one with the mortgage's share", async () => {
      setApiEnv();
      loaderData = noHome({ ownership: "joint", sharePercent: 40 });
      const fetchSpy = okFetch();
      const { findByText } = customRender(<MortgageContainer />);
      openEdit();
      expect(within(screen.getByRole("dialog")).queryByTestId("home-equity-line")).toBeNull();
      fireEvent.change(field(/^What your home is worth/), { target: { value: "300000" } });
      // (300,000 - 135,400) x 40 / 100 = 164,600 x 0.4 = 65,840.
      const line = within(screen.getByRole("dialog")).getByTestId("home-equity-line");
      expect(line.textContent).toContain("£65,840");
      expect(line.textContent).toContain("At your 40% share");
      save();
      await findByText(/home value/);
      const call = posts(fetchSpy).find(([url]) => String(url) === "/api/accounts");
      if (!call) throw new Error("expected a POST of the home account");
      expect(bodyOf(call)).toEqual({
        name: "Home (your estimate)",
        type: "Property",
        accountSubtype: "home",
        balance: 300000,
        ownership: "joint",
        sharePercent: 40,
      });
      // The mortgage exists, so the new home is linked to it with a second call (slice 4).
      const link = patches(fetchSpy).find(
        ([url, init]) =>
          String(url).endsWith("/accounts/m1") &&
          "linkedAccountId" in JSON.parse(String((init as RequestInit).body)),
      );
      if (!link) throw new Error("expected the mortgage to be linked to the new home");
      expect(bodyOf(link)).toEqual({ linkedAccountId: ACCOUNT_ID });
      expect(posts(fetchSpy).some(([url]) => String(url).includes("mortgage-with-property"))).toBe(
        false,
      );
      expect(mockRevalidate).toHaveBeenCalled();
    });

    test("with no value entered, nothing is added and no equity shows", async () => {
      setApiEnv();
      loaderData = noHome();
      const fetchSpy = okFetch();
      const { findAllByText } = customRender(<MortgageContainer />);
      openEdit();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      save();
      await findAllByText(/^Saved /);
      expect(posts(fetchSpy).some(([url]) => String(url) === "/api/accounts")).toBe(false);
    });

    test("with two homes the value comes from Accounts and is not offered", async () => {
      setApiEnv();
      loaderData = {
        ...loaded(),
        accounts: [
          ...loaded().accounts,
          { id: "home2", name: "Holiday cottage", type: "Property", balance: 150000 },
        ],
      };
      const fetchSpy = okFetch();
      const { container, findAllByText } = customRender(<MortgageContainer />);
      // One mortgage against several homes would misstate the equity: no row, no line.
      expect(container.querySelector("[data-testid='mortgage-equity']")).toBeNull();
      openEdit();
      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.queryByTestId("home-equity-line")).toBeNull();
      expect(dialog.queryByLabelText(/^What your home is worth/)).toBeNull();
      expect(
        dialog.getByText(
          "You have more than one property on Accounts, so we cannot tell which is your home. Change each value on Accounts.",
        ),
      ).toBeDefined();
      fireEvent.change(field(/^Interest rate/), { target: { value: "4.6" } });
      save();
      await findAllByText(/^Saved /);
      expect(patches(fetchSpy).some(([url]) => /\/accounts\/home2?$/.test(String(url)))).toBe(
        false,
      );
      expect(posts(fetchSpy).some(([url]) => String(url) === "/api/accounts")).toBe(false);
    });

    test("the home is the property the mortgage is linked to, even with two possible homes", () => {
      loaderData = {
        ...loaded({ linkedAccountId: "home2" }),
        accounts: [
          ...loaded({ linkedAccountId: "home2" }).accounts,
          { id: "home2", name: "Cottage", type: "Property", balance: 400000 },
        ],
      };
      const { container } = customRender(<MortgageContainer />);
      // Equity against the linked home: 400,000 - 135,400 = 264,600.
      const row = container.querySelector("[data-testid='mortgage-equity']") as HTMLElement;
      expect(row.textContent).toContain("£264,600");
      // Loan to value against it: 135,400 / 400,000 = 33.85%, shown as 33.9%.
      expect(savedText(container)).toContain("33.9%");
      openEdit();
      expect(field(/^What your home is worth/).value).toContain("400,000");
    });

    test("a rental property is never offered as the home value (HM-3)", () => {
      loaderData = noHome();
      loaderData.accounts = [
        ...(loaderData.accounts as unknown[]),
        { id: "r1", name: "Flat 2", type: "Property", accountSubtype: "rental", balance: 200000 },
      ];
      const { container } = customRender(<MortgageContainer />);
      expect(container.querySelector("[data-testid='mortgage-equity']")).toBeNull();
      openEdit();
      expect(field(/^What your home is worth/).value).toBe("");
    });
  });
});

describe("firstResidentialFigures (P61)", () => {
  test("reads the first residential account's saved figures for the first render", () => {
    const { accounts, accountDetails } = loaded();
    // Balance -£135,400 is read as £135,400 owed; 240 months = 20 years; rate 4.5% as saved.
    expect(firstResidentialFigures(accounts as never, accountDetails as never, 0)).toEqual({
      accountId: "m1",
      loanAmount: 135400,
      interestRate: 4.5,
      remainingTerm: 20,
    });
  });

  test("keeps the profile balance and leaves rate and term empty with no account", () => {
    expect(firstResidentialFigures([] as never, [] as never, 90000)).toEqual({
      accountId: null,
      loanAmount: 90000,
      interestRate: 0,
      remainingTerm: 0,
    });
  });
});

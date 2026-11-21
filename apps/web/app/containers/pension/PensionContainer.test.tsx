import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());
const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockMarkChecklistStep = vi.fn().mockResolvedValue({});

let testLoaderData: any = {
  accounts: [
    {
      id: "p1",
      name: "Current Workplace Pot",
      type: "Pension",
      balance: 10000,
      interestRate: 6.0,
      monthlyContribution: 100,
      isCurrent: true,
    },
    {
      id: "p2",
      name: "Old Employer Pot",
      type: "Pension",
      balance: 20000,
      interestRate: 5.0,
      monthlyContribution: 50,
      isCurrent: false,
    },
  ],
  accountDetails: [],
  userProfile: {
    annualSalary: 50000,
    pensionPercent: 5.0,
    pensionEmployerPercent: 3.0,
    isSalarySacrifice: true,
    isSalarySacrificeEmployerNi: false,
    employmentType: "employed",
    setupChecklistCompletedSteps: ["pension"],
  },
};

let testProfileData: any = {
  annualSalary: 50000,
  pensionPercent: 5.0,
  pensionEmployerPercent: 3.0,
  isSalarySacrifice: true,
  isSalarySacrificeEmployerNi: false,
  employmentType: "employed",
  setupChecklistCompletedSteps: ["pension"],
};

const defaultLoaderData = testLoaderData;
const defaultProfileData = testProfileData;

let mockHash = "";
vi.mock("react-router", () => ({
  useLocation: () => ({ hash: mockHash, pathname: "/app/pension", search: "" }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLoaderData: () => testLoaderData,
  useNavigate: () => vi.fn(),
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
  }),
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/hooks/useUserProfile")>()),
  useUserProfile: () => ({
    profile: testProfileData,
    updateProfile: mockUpdateProfile,
    markChecklistStep: mockMarkChecklistStep,
  }),
}));

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import PensionContainer from "./PensionContainer";

const AGE = 35;
/** The onboarded user from the E16 audit: £58,000, 8% and 3%, one £96,000 pot. */
const FILLED = {
  accounts: [
    {
      id: "w1",
      name: "Workplace pot",
      type: "Pension",
      balance: 96000,
      interestRate: 5,
      monthlyContribution: null,
      isCurrent: true,
    },
  ],
  accountDetails: [],
  userProfile: {
    annualSalary: 58000,
    pensionPercent: 8,
    pensionEmployerPercent: 3,
    isSalarySacrifice: false,
    isSalarySacrificeEmployerNi: false,
    employmentType: "employed",
    birthYear: new Date().getFullYear() - AGE,
    setupChecklistCompletedSteps: ["pension"],
  },
};

const useFixture = (data: any) => {
  testLoaderData = data;
  testProfileData = data.userProfile;
};
/** The same as useFixture, for use inside loops and try blocks. */
const loadFixture = (data: any) => {
  testLoaderData = data;
  testProfileData = data.userProfile;
};
const restore = () => {
  testLoaderData = defaultLoaderData;
  testProfileData = defaultProfileData;
};

const openDetails = () =>
  fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
const zone = () => screen.getByRole("region", { name: "Model a change to your contribution" });
/** The zone starts closed below the saved figures. */
const openZone = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show what-if: change your contribution" }));
const slider = (label: string) => within(zone()).getByLabelText(label) as HTMLInputElement;
const savedText = () =>
  [
    document.querySelector("[data-tone='hero']")?.textContent,
    document.querySelector("[data-density='compact']")?.textContent,
    document.getElementById("pension-details")?.textContent,
  ].join("|");

describe("PensionContainer", () => {
  beforeEach(restore);

  describe("page rules (E16 PR 7)", () => {
    it("filled: one hero, one primary button, one notice, at most 12 figures before disclosure", () => {
      useFixture(FILLED);
      const { container } = render(<PensionContainer />);
      // The scenario zone starts closed, so its one notice is behind the disclosure.
      expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 0 });
      openZone();
      expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });
      const hero = container.querySelector("[data-tone='hero']");
      expect(hero?.textContent).toContain("Total in your pots");
      expect(hero?.textContent).toContain("£96,000");
      // No chips, no PLSA bar, no "Employer and growth" sentence in the default view.
      expect(container.textContent).not.toMatch(/PLSA|Living Standards|Employer and growth/);
      expect(screen.queryByRole("button", { name: /^\d+%$/ })).toBeNull();
    });

    it("filled: the first view is the hero plus what goes in each month, with no projection", () => {
      useFixture(FILLED);
      const { container } = render(<PensionContainer />);
      const headings = screen.getAllByRole("heading").map((h) => h.tagName);
      expect(headings[0]).toBe("H1");
      const strip = container.querySelector("[data-density='compact']") as HTMLElement;
      const cards = Array.from(strip.children).map((c) => c.textContent ?? "");
      expect(cards).toEqual(["Going in each month£532You and your employer"]);
      // Projections moved to the Retirement page (decision RD6).
      expect(container.textContent).not.toMatch(
        /Income at retirement|Retirement age|Estimated pot|in today's money|4% of the pot/,
      );
      const firstView = document.createElement("div");
      firstView.append(
        (container.querySelector("[data-tone='hero']") as HTMLElement).cloneNode(true),
        strip.cloneNode(true),
      );
      expectPageRules(firstView, { maxFigures: 4 });
    });

    it("filled: the details card holds salary, both contributions and method, then the pots", () => {
      useFixture(FILLED);
      render(<PensionContainer />);
      const details = screen.getByRole("region", { name: "Your details" });
      // The saved facts start behind a closed drawer, so they stay out of the first view.
      expect(details.querySelector("dl")).toBeNull();
      openDetails();
      const rows = Array.from(details.querySelectorAll("dl > div")).map((r) => r.textContent);
      expect(rows).toEqual([
        "Salary£58,000 a year",
        // £58,000 at 8%: 4,640 a year ÷ 12 = £386.67, about £387. At 3%: 1,740 ÷ 12 = £145.
        "You pay8% of salary, about £387 a month",
        "Employer pays3% of salary, about £145 a month",
        "MethodNo salary sacrifice",
      ]);
      const pots = details.querySelectorAll("[data-list-row]");
      expect(pots).toHaveLength(1);
      // With one pot the hero carries the balance, so the row shows the name and one edit button.
      expect(pots[0]?.textContent).not.toContain("£96,000");
      const row = within(pots[0] as HTMLElement);
      expect(row.getAllByRole("button", { name: /^Edit / })).toHaveLength(1);
      expect(row.queryByRole("button", { name: /^Delete / })).toBeNull();
    });

    it("empty: the header and one prompt, with no strip, zone or drawer", () => {
      useFixture({
        accounts: [],
        accountDetails: [],
        userProfile: { annualSalary: null, setupChecklistCompletedSteps: ["pension"] },
      });
      const { container } = render(<PensionContainer />);
      expectPageRules(container, { maxFigures: 0, projectionNotices: 0 });
      expect(screen.getByRole("heading", { level: 2, name: "No pension pots yet" })).toBeDefined();
      expect(screen.getAllByRole("button", { name: "Add pension pot" })).toHaveLength(1);
      expect(screen.queryByRole("region", { name: /Model a change/ })).toBeNull();
      expect(container.querySelector("[data-density='compact']")).toBeNull();
    });
  });

  describe("the link to the retirement plan", () => {
    it("shows one plain link when the Retirement page is available", () => {
      useFixture(FILLED);
      render(<PensionContainer />);
      const line = screen.getByTestId("pension-retirement-link");
      expect(line.textContent).toBe(
        "Your retirement plan shows what your pots could give you each year. Open your retirement plan",
      );
      const link = within(line).getByRole("link", { name: "Open your retirement plan" });
      expect(link.getAttribute("href")).toBe("/app/retirement");
      expect(within(line).queryByRole("button")).toBeNull();
    });

    it("shows for everyone, with no availability check (owner, 20 Nov 2026)", () => {
      useFixture(FILLED);
      render(<PensionContainer />);
      expect(screen.getByRole("link", { name: "Open your retirement plan" })).toBeDefined();
    });
  });

  it("opening the page with pots writes no checklist step (LD-2, CS-6)", () => {
    useFixture(FILLED);
    render(<PensionContainer />);
    // Slice 8: the Dashboard reads the pension step from the saved pots; a visit writes nothing.
    expect(mockMarkChecklistStep).not.toHaveBeenCalled();
  });

  it("keeps the UK pension rules as saved facts in one quiet drawer", () => {
    useFixture(FILLED);
    render(<PensionContainer />);
    expect(screen.queryByRole("button", { name: "Assumptions and UK rules" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "UK pension rules" }));
    const rules = screen.getByTestId("pension-rules");
    // 11% of £58,000 at the saved figures.
    expect(rules.textContent).toContain("At your saved figures, £6,380 a year is paid in.");
    expect(rules.textContent).not.toMatch(/growth|inflation|4%/i);
  });

  it("scrolls to the details section and focuses its heading for the #pension-details deep link", async () => {
    mockHash = "#pension-details";
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      render(<PensionContainer />);
      await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
      expect(document.activeElement?.id).toBe("pension-details-title");
    } finally {
      mockHash = "";
    }
  });

  it("edits employer National Insurance, saving to the profile", async () => {
    useFixture({
      ...defaultLoaderData,
      userProfile: { ...defaultProfileData, isSalarySacrifice: null },
    });
    render(<PensionContainer />);
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    // A method never answered is null, so the box starts unticked until the user picks it.
    const sacrifice = screen.getByLabelText(/Paid by salary sacrifice/i) as HTMLInputElement;
    expect(sacrifice.checked).toBe(false);
    fireEvent.click(sacrifice);
    const employerNi = screen.getByLabelText(/Employer adds its National Insurance/i);
    fireEvent.click(employerNi);
    expect((employerNi as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Save details/i }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ isSalarySacrifice: true, isSalarySacrificeEmployerNi: true }),
      ),
    );
    restore();
  });

  it("editing only the salary never saves the guessed contribution method", async () => {
    mockUpdateProfile.mockClear();
    render(<PensionContainer />);
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    fireEvent.change(screen.getByLabelText(/Yearly salary before tax/), {
      target: { value: "60000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save details/i }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
    const sent = mockUpdateProfile.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent.annualSalary).toBe(60000);
    expect(sent).not.toHaveProperty("isSalarySacrifice");
    expect(sent).not.toHaveProperty("isSalarySacrificeEmployerNi");
  });

  it("after a salary-only save, the pension page and take-home read the same method", async () => {
    const { profileFactsFromProfile } = await import("@flump/finance-engine");
    const chosen = {
      ...defaultProfileData,
      pensionPercent: 6,
      pensionEmployerPercent: 4,
      isSalarySacrifice: true,
    };
    useFixture({ ...defaultLoaderData, userProfile: chosen });
    mockUpdateProfile.mockClear();
    render(<PensionContainer />);
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    fireEvent.change(screen.getByLabelText(/Yearly salary before tax/), {
      target: { value: "60000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save details/i }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
    const stored = { ...chosen, ...(mockUpdateProfile.mock.calls[0]?.[0] as object) };
    expect(profileFactsFromProfile(stored).isSalarySacrifice).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salary and contributions" })).toBeDefined(),
    );
    // After saving, the drawer comes back open where the user left it.
    expect(screen.getByText("Method").nextElementSibling?.textContent).toBe("Salary sacrifice");
  });

  it("reads rates and method never answered as Not set, and what goes in as unknown", () => {
    useFixture({
      ...defaultLoaderData,
      userProfile: {
        ...defaultProfileData,
        pensionPercent: null,
        pensionEmployerPercent: null,
        isSalarySacrifice: null,
      },
    });
    const { container } = render(<PensionContainer />);
    // The strip is one prompt for the rates: never £0 and never a 5% and 3% stand-in.
    expect(container.textContent).toContain(
      "Add your contribution rates to see what goes in each month",
    );
    expect(container.querySelector("[data-density='compact']")).toBeNull();
    openDetails();
    const details = screen.getByRole("region", { name: "Your details" });
    expect(within(details).getByText("You pay").nextElementSibling?.textContent).toBe("Not set");
    expect(within(details).getByText("Employer pays").nextElementSibling?.textContent).toBe(
      "Not set",
    );
    expect(within(details).getByText("Method").nextElementSibling?.textContent).toBe("Not set");
    expect(screen.queryByText(/Assumed/)).toBeNull();
  });

  it("shows a chosen 5% and 3% and salary sacrifice as chosen", () => {
    render(<PensionContainer />);
    openDetails();
    const details = screen.getByRole("region", { name: "Your details" });
    // £50,000 at 5%: 2,500 / 12 = £208.33, about £208. At 3%: 1,500 / 12 = £125.
    expect(within(details).getByText("You pay").nextElementSibling?.textContent).toBe(
      "5% of salary, about £208 a month",
    );
    expect(within(details).getByText("Employer pays").nextElementSibling?.textContent).toBe(
      "3% of salary, about £125 a month",
    );
    expect(within(details).getByText("Method").nextElementSibling?.textContent).toBe(
      "Salary sacrifice",
    );
  });

  it("saves exactly 5% and 3% when chosen, and a blank rate as not set", async () => {
    useFixture({
      ...defaultLoaderData,
      userProfile: { ...defaultProfileData, pensionPercent: null, pensionEmployerPercent: null },
    });
    mockUpdateProfile.mockClear();
    render(<PensionContainer />);
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    fireEvent.change(screen.getByLabelText(/Your contribution/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /Save details/i }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
    const sent = mockUpdateProfile.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent.pensionPercent).toBe(5);
    expect(sent.pensionEmployerPercent).toBeNull();
    restore();
  });

  it("shows the saved loader rates on the first render, whatever the root profile holds", async () => {
    const { DEFAULT_PROFILE } =
      await vi.importActual<typeof import("~/hooks/useUserProfile")>("~/hooks/useUserProfile");
    testLoaderData = {
      accounts: [],
      accountDetails: [],
      userProfile: {
        id: "profile-1",
        annualSalary: 42000,
        pensionPercent: 6,
        pensionEmployerPercent: 4,
        isSalarySacrifice: false,
        isSalarySacrificeEmployerNi: false,
        employmentType: "employed",
      },
    };
    // The root profile is the empty default: this page's own loader profile is the one read.
    testProfileData = DEFAULT_PROFILE;
    const { container } = render(<PensionContainer />);
    const strip = container.querySelector("[data-density='compact']") as HTMLElement;
    // 42,000 x (6% + 4%) = 4,200 a year; 4,200 / 12 = £350 a month going in.
    expect(strip.textContent).toContain("Going in each month£350");
    expect(strip.textContent).toContain("You and your employer");
    expect(strip.textContent).not.toContain("Assumed rates");
  });

  it("totals what goes in each month, counting direct payments only from current pots", () => {
    useFixture({
      ...defaultLoaderData,
      userProfile: { ...defaultProfileData, birthYear: new Date().getFullYear() - AGE },
    });
    const { container } = render(<PensionContainer />);
    const strip = container.querySelector("[data-density='compact']") as HTMLElement;
    // £208 you + £125 employer + £100 into the current pot; the past pot's £50 is not counted.
    expect(strip.textContent).toContain("Going in each month£433");
    // The fixture's 5% and 3% are the user's own choice: no assumed caption.
    expect(strip.textContent).toContain("You, your employer and payments into your pots");
    expect(strip.textContent).not.toContain("Assumed");
    const rows = container.querySelectorAll("[data-list-row]");
    expect(rows[0]?.textContent).toContain("Current pot");
    expect(rows[1]?.textContent).toContain("Past pot");
  });

  it("keeps a saved 0% contribution rate as 0%", () => {
    useFixture({
      ...FILLED,
      userProfile: { ...FILLED.userProfile, pensionPercent: 0, pensionEmployerPercent: 0 },
    });
    render(<PensionContainer />);
    openDetails();
    const details = screen.getByRole("region", { name: "Your details" });
    expect(within(details).getByText("You pay").nextElementSibling?.textContent).toBe(
      "0% of salary",
    );
  });

  it("with pots but no salary, the zone asks for the salary instead of showing a figure", () => {
    useFixture({
      ...FILLED,
      userProfile: { ...FILLED.userProfile, annualSalary: null },
    });
    const { container } = render(<PensionContainer />);
    expect(screen.getByText(/to see the effect of a change on your take-home pay/)).toBeDefined();
    expect(container.querySelector("input[type='range']")).toBeNull();
  });

  describe("the £100,000 line (E31, ruling 6)", () => {
    const trapNote = () => document.getElementById("pension-trap-note");
    const saved = (annualSalary: number, extra: Record<string, unknown> = {}) =>
      useFixture({
        ...FILLED,
        userProfile: {
          ...FILLED.userProfile,
          annualSalary,
          pensionPercent: 0,
          pensionEmployerPercent: 0,
          ...extra,
        },
      });

    it("is hidden below £90,000 and above £125,140", () => {
      saved(89_999);
      const { unmount } = render(<PensionContainer />);
      expect(trapNote()).toBeNull();
      unmount();
      saved(125_141);
      render(<PensionContainer />);
      expect(trapNote()).toBeNull();
    });

    it("in the band: one factual line with no heading or warning, after the scenario zone", () => {
      saved(110_000);
      render(<PensionContainer />);
      const note = trapNote() as HTMLElement;
      expect(note.textContent).toContain(
        "Your adjusted net income is above £100,000, where the Personal Allowance reduces.",
      );
      // One standard notice per page: the line carries no badge of its own.
      expect(note.textContent).not.toContain("Unverified estimate");
      expect(within(note).queryByRole("heading")).toBeNull();
      expect(note.textContent).not.toMatch(/marginal rate|£100k|trap|escape/i);
      expect(zone().compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // The page's one notice carries the standard unverified sentence.
      openZone();
      expect(zone().querySelector("[data-notice='projection']")?.textContent).toContain(
        "Unverified estimate.",
      );
    });

    it("below £100,000: states the threshold, with no action", () => {
      saved(95_000);
      render(<PensionContainer />);
      expect(trapNote()?.textContent).toContain(
        "The Personal Allowance reduces when adjusted net income is above £100,000.",
      );
      openZone();
      expect(zone().querySelector("[data-notice='projection']")?.textContent).toContain(
        "Unverified estimate.",
      );
      expect(screen.queryByRole("button", { name: "Model this contribution" })).toBeNull();
    });

    it("uses saved adjusted net income, net of a salary sacrifice contribution", () => {
      saved(130_000, { pensionPercent: 10, isSalarySacrifice: true });
      render(<PensionContainer />);
      // £130,000 less 10% sacrifice is £117,000: inside the band.
      expect(trapNote()).not.toBeNull();
    });

    it("Model this contribution seeds the contribution input and makes no save call", () => {
      saved(110_000, { pensionPercent: 5, pensionEmployerPercent: 4 });
      mockUpdateProfile.mockClear();
      mockSubmit.mockClear();
      render(<PensionContainer />);
      const scrolled: (string | undefined)[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
      };
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));
      expect(scrolled).toContain("pension-scenario-zone");
      expect(screen.queryByRole("tab")).toBeNull();
      expect(Number(slider("Your contribution").value)).toBeGreaterThan(5);
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    // Slice 8: no browser baseline is read any more, so this proves the saved profile is used.
    it("seeds a contribution that lands at £100,000 from the saved profile", async () => {
      const { calculate100kTaxTrap } = await import("@flump/finance-engine");
      saved(110_000, { pensionPercent: 5, pensionEmployerPercent: 4 });
      render(<PensionContainer />);
      expect(trapNote()?.textContent).toContain("brings it back to that line.");
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));
      const percent = Number(slider("Your contribution").value);
      const ani = (pct: number) =>
        calculate100kTaxTrap(110_000, pct, false, "ENGLAND_NI_WALES").adjustedNetIncome;
      expect(ani(percent)).toBeLessThanOrEqual(100_000);
      expect(ani(percent - 0.5)).toBeGreaterThan(100_000);
    });

    // Slice 8: no browser baseline is read any more, so this proves the saved region is used.
    it("reads the region from the saved profile (PP-9)", () => {
      saved(110_000, { taxRegion: "SCOTLAND" });
      const scottish = render(<PensionContainer />);
      expect(screen.queryByRole("button", { name: "About Tax region" })).toBeNull();
      scottish.unmount();
      saved(110_000, { taxRegion: "ENGLAND" });
      const english = render(<PensionContainer />);
      expect(screen.queryByRole("button", { name: "About Tax region" })).toBeNull();
      english.unmount();
      saved(110_000);
      render(<PensionContainer />);
      // No saved region: the assumption sits behind the "i" beside the line (owner item 23).
      expect(screen.queryByText(/uses England, Wales and Northern Ireland/i)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "About Tax region" }));
      expect(screen.getByText(/uses England, Wales and Northern Ireland/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /set your region/i }).getAttribute("href")).toBe(
        "/app/profile",
      );
    });
  });

  describe("which pots and facts the page reads", () => {
    const strip = () => document.querySelector("[data-density='compact']") as HTMLElement | null;

    it("lists only pension accounts as pots", () => {
      useFixture({
        ...FILLED,
        accounts: [
          ...FILLED.accounts,
          { id: "s1", name: "Rainy day", type: "Savings", balance: 5000, isCurrent: true },
        ],
      });
      render(<PensionContainer />);
      openDetails();
      const details = screen.getByRole("region", { name: "Your details" });
      const pots = details.querySelectorAll("[data-list-row]");
      expect(pots).toHaveLength(1);
      expect(pots[0]?.textContent).toContain("Workplace pot");
      expect(details.textContent).not.toContain("Rainy day");
    });

    it("opens a pot's edit form with its saved growth rate, and blank when none is saved", () => {
      useFixture({
        ...FILLED,
        accounts: [
          { ...FILLED.accounts[0], interestRate: 5 },
          { ...FILLED.accounts[0], id: "w2", name: "Old pot", interestRate: null },
        ],
      });
      render(<PensionContainer />);
      openDetails();
      const growth = () =>
        (within(screen.getByRole("dialog")).getByLabelText(/growth/i) as HTMLInputElement).value;
      fireEvent.click(screen.getByRole("button", { name: "Edit Workplace pot" }));
      expect(growth()).toBe("5");
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Edit Old pot" }));
      expect(growth()).toBe("");
    });

    it("reads the root profile when the loader sends no profile", async () => {
      const { calculateEmployerNISavings, getCurrentUKTaxYear } = await import(
        "@flump/finance-engine"
      );
      const { normalizeProfile } =
        await vi.importActual<typeof import("~/hooks/useUserProfile")>("~/hooks/useUserProfile");
      testLoaderData = { accounts: FILLED.accounts, accountDetails: [] };
      testProfileData = normalizeProfile({
        ...FILLED.userProfile,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      });
      render(<PensionContainer />);
      // The employer NI saving is the engine's figure, passed through: £58,000 salary, 8% sacrificed
      // is 58,000 x 8 / 100 = 4,640 a year.
      const ni = calculateEmployerNISavings(58_000, 4_640, getCurrentUKTaxYear());
      expect(ni).toBeGreaterThan(0);
      // You 4,640 + employer 3% of 58,000 = 1,740 + the NI saving, all over 12 months.
      const monthly = Math.round((4_640 + 1_740 + ni) / 12);
      expect(strip()?.textContent).toContain(`Going in each month£${monthly.toLocaleString()}`);
      openDetails();
      expect(screen.getByText("Method").nextElementSibling?.textContent).toContain(
        "Salary sacrifice",
      );
      // The saved employment type reaches the take-home tool, so it asks for nothing.
      openZone();
      expect(zone().textContent).not.toContain("Add your employment type");
    });

    it("with no salary, no payments into pots and no rates, asks for the salary first", () => {
      useFixture({
        ...FILLED,
        userProfile: {
          ...FILLED.userProfile,
          annualSalary: null,
          pensionPercent: null,
          pensionEmployerPercent: null,
        },
      });
      const { container } = render(<PensionContainer />);
      expect(container.textContent).toContain("Add your salary to see what goes in each month");
      expect(container.textContent).not.toContain("Add your contribution rates");
    });

    it("shows the empty state from the root profile when there is no loader data", async () => {
      const { DEFAULT_PROFILE } =
        await vi.importActual<typeof import("~/hooks/useUserProfile")>("~/hooks/useUserProfile");
      testLoaderData = undefined;
      testProfileData = { ...DEFAULT_PROFILE, isSalarySacrificeEmployerNi: null };
      render(<PensionContainer />);
      expect(screen.getByRole("heading", { level: 2, name: "No pension pots yet" })).toBeDefined();
    });

    it("gives the take-home tool the latest saved facts after the loader changes", () => {
      useFixture(FILLED);
      const view = render(<PensionContainer />);
      openZone();
      expect(zone().textContent).not.toContain("Add your employment type");
      useFixture({ ...FILLED, userProfile: { ...FILLED.userProfile, employmentType: null } });
      view.rerender(<PensionContainer />);
      expect(zone().textContent).toContain("Add your employment type");
    });

    it("adds the employer's National Insurance saving only with salary sacrifice and the employer passing it on", async () => {
      const { calculateEmployerNISavings, getCurrentUKTaxYear } = await import(
        "@flump/finance-engine"
      );
      // £50,000 at 5% sacrificed: 50,000 x 5 / 100 = 2,500 a year.
      const ni = calculateEmployerNISavings(50_000, 2_500, getCurrentUKTaxYear());
      expect(ni).toBeGreaterThan(0);
      useFixture({
        ...defaultLoaderData,
        userProfile: { ...defaultProfileData, isSalarySacrificeEmployerNi: true },
      });
      const passed = render(<PensionContainer />);
      // You 2,500 + employer 3% = 1,500 + the NI saving a year, over 12, plus the current pot's £100.
      const withNi = Math.round((2_500 + 1_500 + ni) / 12 + 100);
      expect(strip()?.textContent).toContain(`Going in each month£${withNi.toLocaleString()}`);
      passed.unmount();
      useFixture({
        ...defaultLoaderData,
        userProfile: {
          ...defaultProfileData,
          isSalarySacrifice: false,
          isSalarySacrificeEmployerNi: true,
        },
      });
      render(<PensionContainer />);
      // No sacrifice, so no NI saving: (2,500 + 1,500) / 12 = 333.33, plus £100, about £433.
      expect(strip()?.textContent).toContain("Going in each month£433");
    });

    it("treats a saved salary of 0 as no salary", () => {
      useFixture({
        accounts: [],
        accountDetails: [],
        userProfile: { ...FILLED.userProfile, annualSalary: 0 },
      });
      render(<PensionContainer />);
      expect(screen.getByRole("heading", { level: 2, name: "No pension pots yet" })).toBeDefined();
    });

    it("asks for the rates when either one is not set", () => {
      for (const rates of [
        { pensionPercent: 5, pensionEmployerPercent: null },
        { pensionPercent: null, pensionEmployerPercent: 3 },
      ]) {
        loadFixture({ ...FILLED, userProfile: { ...FILLED.userProfile, ...rates } });
        const view = render(<PensionContainer />);
        expect(view.container.textContent).toContain(
          "Add your contribution rates to see what goes in each month",
        );
        expect(strip()).toBeNull();
        view.unmount();
      }
    });

    it("with no salary, shows the payments into current pots, or a prompt when there are none", () => {
      useFixture({
        ...defaultLoaderData,
        userProfile: {
          ...defaultProfileData,
          annualSalary: null,
          pensionPercent: null,
          pensionEmployerPercent: null,
        },
      });
      const paying = render(<PensionContainer />);
      // Only the current pot's £100 counts; the past pot's £50 does not, and no rate is asked for.
      expect(strip()?.textContent).toContain("Going in each month£100");
      expect(paying.container.textContent).not.toContain("Add your contribution rates");
      paying.unmount();
      useFixture({ ...FILLED, userProfile: { ...FILLED.userProfile, annualSalary: null } });
      const none = render(<PensionContainer />);
      expect(none.container.textContent).toContain(
        "Add your salary to see what goes in each month",
      );
      expect(none.container.textContent).not.toContain("£0");
    });

    it("leaves what is paid in out of the rules when the rates are not set", () => {
      useFixture({
        ...FILLED,
        userProfile: { ...FILLED.userProfile, pensionPercent: null, pensionEmployerPercent: null },
      });
      render(<PensionContainer />);
      fireEvent.click(screen.getByRole("button", { name: "UK pension rules" }));
      expect(screen.getByTestId("pension-rules").textContent).not.toContain("a year is paid in");
    });

    it("shows the latest loader data after it changes", () => {
      useFixture(FILLED);
      const view = render(<PensionContainer />);
      useFixture({
        accounts: [
          ...FILLED.accounts,
          {
            id: "w2",
            name: "Old pot",
            type: "Pension",
            balance: 4000,
            interestRate: null,
            monthlyContribution: 25,
            isCurrent: true,
          },
        ],
        accountDetails: [],
        userProfile: {
          ...FILLED.userProfile,
          annualSalary: 110_000,
          pensionPercent: 0,
          pensionEmployerPercent: 5,
          taxRegion: "SCOTLAND",
        },
      });
      view.rerender(<PensionContainer />);
      // 96,000 + 4,000 = £100,000 in the pots.
      expect(document.querySelector("[data-tone='hero']")?.textContent).toContain("£100,000");
      // Employer 5% of 110,000 = 5,500 a year, 458.33 a month, plus the new pot's £25: about £483.
      expect(strip()?.textContent).toContain("Going in each month£483");
      // 110,000 with nothing sacrificed is inside the £100,000 band, with the saved region.
      expect(document.getElementById("pension-trap-note")).not.toBeNull();
      expect(screen.queryByRole("button", { name: "About Tax region" })).toBeNull();
      openDetails();
      expect(
        screen.getByRole("region", { name: "Your details" }).querySelectorAll("[data-list-row]"),
      ).toHaveLength(2);
      openZone();
      expect(slider("Your contribution").value).toBe("0");
    });
  });

  describe("saving your details", () => {
    beforeEach(() => mockUpdateProfile.mockClear());
    const edit = () => {
      render(<PensionContainer />);
      openDetails();
      fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    };
    const save = async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save details/i }));
      await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
      return mockUpdateProfile.mock.calls[0]?.[0] as Record<string, unknown>;
    };

    it("saves no salary when the salary is left blank", async () => {
      edit();
      fireEvent.change(screen.getByLabelText(/Yearly salary before tax/), {
        target: { value: "" },
      });
      const sent = await save();
      expect(sent).not.toHaveProperty("annualSalary");
    });

    it("saves a blank employee rate as not set and a typed employer rate as typed", async () => {
      edit();
      fireEvent.change(screen.getByLabelText(/Your contribution/), { target: { value: "" } });
      fireEvent.change(screen.getByLabelText(/Employer contribution/), {
        target: { value: "3.5" },
      });
      const sent = await save();
      expect(sent.pensionPercent).toBeNull();
      expect(sent.pensionEmployerPercent).toBe(3.5);
    });

    it("saves employer National Insurance as off when only salary sacrifice is ticked", async () => {
      useFixture({
        ...defaultLoaderData,
        userProfile: { ...defaultProfileData, isSalarySacrifice: null },
      });
      edit();
      fireEvent.click(screen.getByLabelText(/Paid by salary sacrifice/i));
      const sent = await save();
      expect(sent.isSalarySacrifice).toBe(true);
      expect(sent.isSalarySacrificeEmployerNi).toBe(false);
    });
  });

  describe("scrolling and the add pot dialog", () => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    it("does not scroll or move focus without the #pension-details link", async () => {
      const scrolled: string[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
      };
      useFixture(FILLED);
      render(<PensionContainer />);
      await nextFrame();
      await nextFrame();
      expect(scrolled).not.toContain("pension-details");
      expect(document.activeElement?.id).not.toBe("pension-details-title");
      // The saved facts stay behind their closed drawer.
      expect(screen.getByRole("region", { name: "Your details" }).querySelector("dl")).toBeNull();
    });

    it("opens the saved facts for the #pension-details link", () => {
      mockHash = "#pension-details";
      try {
        loadFixture(FILLED);
        render(<PensionContainer />);
        expect(
          screen.getByRole("region", { name: "Your details" }).querySelector("dl"),
        ).not.toBeNull();
      } finally {
        mockHash = "";
      }
    });

    it("scrolls to the details when the link arrives after the page has opened", async () => {
      const scrolled: string[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
      };
      useFixture(FILLED);
      const view = render(<PensionContainer />);
      mockHash = "#pension-details";
      try {
        view.rerender(<PensionContainer />);
        await vi.waitFor(() => expect(scrolled).toContain("pension-details"));
      } finally {
        mockHash = "";
      }
    });

    it("follows the #pension-details link without error when nothing is saved yet", async () => {
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => errors.push(event.error);
      window.addEventListener("error", onError);
      mockHash = "#pension-details";
      try {
        loadFixture({ accounts: [], accountDetails: [], userProfile: { annualSalary: null } });
        render(<PensionContainer />);
        await nextFrame();
        await nextFrame();
        expect(errors).toEqual([]);
        expect(
          screen.getByRole("heading", { level: 2, name: "No pension pots yet" }),
        ).toBeDefined();
      } finally {
        mockHash = "";
        window.removeEventListener("error", onError);
      }
    });

    it("scrolls to the scenario zone each time Model this contribution is pressed", () => {
      useFixture({
        ...FILLED,
        userProfile: {
          ...FILLED.userProfile,
          annualSalary: 110_000,
          pensionPercent: 5,
          pensionEmployerPercent: 4,
        },
      });
      render(<PensionContainer />);
      const scrolled: string[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
      };
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));
      expect(scrolled.filter((id) => id === "pension-scenario-zone")).toHaveLength(2);
    });

    it("opens and closes the add pot dialog from the header button", () => {
      useFixture(FILLED);
      render(<PensionContainer />);
      expect(screen.queryByRole("dialog", { name: "Add a pension pot" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add pension pot" }));
      const dialog = screen.getByRole("dialog", { name: "Add a pension pot" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog", { name: "Add a pension pot" })).toBeNull();
    });
  });

  describe("saved versus scenario", () => {
    beforeEach(() => {
      useFixture(FILLED);
      mockSubmit.mockClear();
      mockUpdateProfile.mockClear();
    });

    it("changing every scenario input leaves the hero, strip and details alone and makes no request", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      render(<PensionContainer />);
      const before = savedText();
      openZone();
      fireEvent.change(slider("Your contribution"), { target: { value: "12" } });
      expect(savedText()).toBe(before);
      expect(
        (screen.getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("is one take-home tool with one input, seeded from the saved contribution, and resets", () => {
      render(<PensionContainer />);
      openZone();
      expect(screen.queryByRole("tab")).toBeNull();
      expect(within(zone()).getAllByRole("slider")).toHaveLength(1);
      expect(slider("Your contribution").value).toBe("8");
      fireEvent.change(slider("Your contribution"), { target: { value: "12" } });
      expect(within(zone()).getByText("Change in take-home pay")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect(slider("Your contribution").value).toBe("8");
    });

    it("puts the saved details before the scenario zone, and the zone holds no hero", () => {
      render(<PensionContainer />);
      const details = document.getElementById("pension-details") as HTMLElement;
      expect(
        details.compareDocumentPosition(zone()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(zone().querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    });

    it("has no Sync to profile or Apply control anywhere", () => {
      render(<PensionContainer />);
      expect(screen.queryByText(/sync/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    });
  });
});

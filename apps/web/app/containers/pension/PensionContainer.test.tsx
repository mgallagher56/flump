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

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

vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    profile: testProfileData,
    setProfile: vi.fn(),
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
const zone = () => screen.getByRole("region", { name: "Model a change to your pension" });
const slider = (label: string) =>
  within(screen.getByRole("tabpanel")).getByLabelText(label) as HTMLInputElement;
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
      expectPageRules(container, { maxFigures: 12, maxNotSet: 0, projectionNotices: 1 });
      const hero = container.querySelector("[data-tone='hero']");
      expect(hero?.textContent).toContain("Total in your pots");
      expect(hero?.textContent).toContain("£96,000");
      // No chips, no PLSA bar, no "Employer and growth" sentence in the default view.
      expect(container.textContent).not.toMatch(/PLSA|Living Standards|Employer and growth/);
      expect(screen.queryByRole("button", { name: /^\d+%$/ })).toBeNull();
    });

    it("filled: the first view is the hero plus a strip of three, the estimate first", () => {
      useFixture(FILLED);
      const { container } = render(<PensionContainer />);
      const headings = screen.getAllByRole("heading").map((h) => h.tagName);
      expect(headings[0]).toBe("H1");
      const strip = container.querySelector("[data-density='compact']") as HTMLElement;
      const cards = Array.from(strip.children).map((c) => c.textContent ?? "");
      expect(cards).toHaveLength(3);
      expect(cards[0]).toMatch(
        /^Estimated income at retirement Estimate£[\d,]+A month, in today's money$/,
      );
      expect(cards[1]).toBe("Going in each month£532You and your employer");
      expect(cards[2]).toBe("Retirement age 67Assumed: your State Pension age");
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
        "You pay8% of salary",
        "Employer pays3% of salary",
        "MethodNo salary sacrifice",
      ]);
      const pots = details.querySelectorAll("[data-list-row]");
      expect(pots).toHaveLength(1);
      // The pot row shows its balance and one edit button (R2-8), even with one pot.
      expect(pots[0]?.textContent).toContain("£96,000");
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

  it("scrolls to and focuses the details card for the #pension-details deep link", async () => {
    mockHash = "#pension-details";
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      render(<PensionContainer />);
      await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
      expect(document.activeElement?.id).toBe("pension-details");
    } finally {
      mockHash = "";
    }
  });

  it("edits employer National Insurance, saving to the profile", async () => {
    render(<PensionContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Edit details/i }));
    // The stored true alongside the default 5% / 3% rates is the legacy column default, not a
    // choice, so the method starts unticked until the user picks it.
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
  });

  it("editing only the salary never saves the guessed contribution method", async () => {
    mockUpdateProfile.mockClear();
    render(<PensionContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Edit details/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /Edit details/i }));
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
    openDetails();
    expect(screen.getByText("Method").nextElementSibling?.textContent).toBe("Salary sacrifice");
  });

  it("reads the contribution method as Not set while the pension facts are the defaults", () => {
    render(<PensionContainer />);
    openDetails();
    expect(screen.getByText("Method").nextElementSibling?.textContent).toBe("Not set");
    expect(screen.getAllByText(/Assumed: the auto-enrolment minimum/)).toHaveLength(1);
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
    // The default fixture holds the backend's 5% and 3%: the caption says so, with no figure.
    expect(strip.textContent).toContain("Assumed rates. Edit to match your payslip");
    const rows = container.querySelectorAll("[data-list-row]");
    expect(rows[0]?.textContent).toContain("Current pot");
    expect(rows[1]?.textContent).toContain("Past pot");
  });

  it("without a saved age the estimate and retirement age give one prompt, never a guess", () => {
    render(<PensionContainer />);
    expect(screen.getByText(/Add your year of birth and salary/)).toBeDefined();
    expect(screen.queryByText("Retirement age")).toBeNull();
    // The zone falls back to years until retirement for the illustration only.
    expect(slider("Years until you retire")).toBeDefined();
  });

  it("a pot with no growth rate leaves the estimate Not set; a 0% rate is kept", () => {
    useFixture({
      ...FILLED,
      accounts: [{ id: "p", name: "Pot", type: "Pension", balance: 1000, interestRate: null }],
    });
    const { unmount } = render(<PensionContainer />);
    expect(screen.getByRole("link", { name: "Add a growth rate to a pot" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Assumptions and UK rules" }));
    expect(screen.getByText(/No growth rate is set on your pots/)).toBeDefined();
    unmount();
    useFixture({
      ...FILLED,
      accounts: [{ id: "p", name: "Pot", type: "Pension", balance: 1000, interestRate: 0 }],
    });
    render(<PensionContainer />);
    expect(screen.queryByRole("link", { name: "Add a growth rate to a pot" })).toBeNull();
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

  it("with pots but no salary, the zone asks for the salary instead of projecting", () => {
    useFixture({
      ...FILLED,
      userProfile: { ...FILLED.userProfile, annualSalary: null },
    });
    const { container } = render(<PensionContainer />);
    expect(screen.getByText(/to see a pension estimate/)).toBeDefined();
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

    beforeEach(async () => {
      const { getDefaultStore } = await import("jotai");
      const { financialBaselineAtom, NO_SALARY_BASELINE } = await import("~/state/baseline.store");
      getDefaultStore().set(financialBaselineAtom, {
        ...NO_SALARY_BASELINE,
        pensionContributionPct: 0,
      });
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
      fireEvent.mouseDown(screen.getByRole("tab", { name: "Take-home pay" }), {
        button: 0,
      });
      const scrolled: (string | undefined)[] = [];
      Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
      };
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));
      expect(scrolled).toContain("pension-scenario-zone");
      expect(screen.getByRole("tab", { name: "At retirement" }).getAttribute("aria-selected")).toBe(
        "true",
      );
      expect(Number(slider("Your contribution").value)).toBeGreaterThan(5);
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("seeds a contribution that lands at £100,000 from the saved profile, whatever the baseline says", async () => {
      const { calculate100kTaxTrap } = await import("@flump/finance-engine");
      const { getDefaultStore } = await import("jotai");
      const { financialBaselineAtom, NO_SALARY_BASELINE } = await import("~/state/baseline.store");
      // A stale local baseline that disagrees with the saved profile.
      getDefaultStore().set(financialBaselineAtom, {
        ...NO_SALARY_BASELINE,
        annualGrossSalary: 150_000,
        pensionContributionPct: 20,
      });
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

    it("labels the region assumption unless the baseline is Scottish", async () => {
      const { getDefaultStore } = await import("jotai");
      const { financialBaselineAtom, NO_SALARY_BASELINE } = await import("~/state/baseline.store");
      const store = getDefaultStore();
      store.set(financialBaselineAtom, { ...NO_SALARY_BASELINE, ukRegion: "SCOTLAND" });
      saved(110_000);
      const scottish = render(<PensionContainer />);
      expect(screen.queryByText(/uses England, Wales and Northern Ireland/i)).toBeNull();
      scottish.unmount();
      store.set(financialBaselineAtom, NO_SALARY_BASELINE);
      saved(110_000);
      render(<PensionContainer />);
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
      fireEvent.change(slider("Your contribution"), { target: { value: "12" } });
      fireEvent.change(slider("Retirement age"), { target: { value: "60" } });
      fireEvent.change(slider("Growth a year"), { target: { value: "9" } });
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      fireEvent.click(screen.getByLabelText(/Only pay that counts/));
      fireEvent.click(screen.getByLabelText(/today's money/));
      fireEvent.click(screen.getByLabelText(/full new State Pension/));
      fireEvent.mouseDown(screen.getByRole("tab", { name: "Take-home pay" }), {
        button: 0,
      });
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

    it("Reset to saved figures returns every input to the saved value", () => {
      render(<PensionContainer />);
      const labels = ["Your contribution", "Retirement age", "Growth a year"];
      const before = labels.map((l) => slider(l).value);
      expect(before).toEqual(["8", "67", "5"]);
      fireEvent.change(slider("Your contribution"), { target: { value: "12" } });
      fireEvent.change(slider("Retirement age"), { target: { value: "60" } });
      fireEvent.change(slider("Growth a year"), { target: { value: "9" } });
      fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect(labels.map((l) => slider(l).value)).toEqual(before);
      // At the saved figures the change line is hidden, not "No change".
      expect(screen.queryByText("Change in monthly income")).toBeNull();
    });

    it("keeps the scenario when switching tools and back", () => {
      render(<PensionContainer />);
      fireEvent.change(slider("Your contribution"), { target: { value: "10" } });
      fireEvent.mouseDown(screen.getByRole("tab", { name: "Take-home pay" }), {
        button: 0,
      });
      expect(slider("Your contribution").value).toBe("10");
      fireEvent.mouseDown(screen.getByRole("tab", { name: "At retirement" }), {
        button: 0,
      });
      expect(slider("Your contribution").value).toBe("10");
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

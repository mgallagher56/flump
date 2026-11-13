import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const openTab = (name: RegExp) => fireEvent.click(screen.getByRole("tab", { name }));

describe("PensionContainer", () => {
  it("scrolls to and focuses the details card for the #pension-details deep link", async () => {
    mockHash = "#pension-details";
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      render(<PensionContainer />);
      await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
      expect(document.getElementById("pension-details")).not.toBeNull();
      expect(document.activeElement?.id).toBe("pension-details");
    } finally {
      mockHash = "";
    }
  });

  it("shows saved details and edits employer NI pass-through, saving to the profile", async () => {
    render(<PensionContainer />);

    expect(screen.getByRole("heading", { level: 1, name: "Your pension" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Your details" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Edit details/i }));

    // Both Salary Sacrifice and Pass on Employer NI checkboxes exist
    expect(screen.getByLabelText(/Salary Sacrifice \(saves NI\)/i)).toBeDefined();
    const employerNiCheckbox = screen.getByLabelText(/Pass on Employer NI/i);
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(employerNiCheckbox);
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Save details/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          isSalarySacrifice: true,
          isSalarySacrificeEmployerNi: true,
        }),
      ),
    );
  });

  it("calculates total monthly inflow correctly, taking direct contributions only from current pots", () => {
    render(<PensionContainer />);

    // Going in each month includes the £100 direct contribution from the current pot, not the past pot
    expect(screen.getByText("Going in each month")).toBeDefined();
    expect(screen.getByText("£433")).toBeDefined();
    expect(screen.getByText(/plus payments into your pots/)).toBeDefined();
    expect(screen.getAllByText("Current Workplace Pot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Old Employer Pot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Current pot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Past pot").length).toBeGreaterThan(0);
  });

  it("handles reset financial data state with zero values", () => {
    testLoaderData = {
      accounts: [],
      accountDetails: [],
      userProfile: {
        annualSalary: null,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        hasResetFinancialData: true,
        setupChecklistCompletedSteps: ["pension"],
      },
    };

    testProfileData = {
      annualSalary: null,
      pensionPercent: 0,
      pensionEmployerPercent: 0,
      hasResetFinancialData: true,
      setupChecklistCompletedSteps: ["pension"],
    };

    render(<PensionContainer />);
    // No pots and no salary: honest "not set" states, never a made-up zero or hero block.
    expect(screen.getByText("Add a pension pot to see its value")).toBeDefined();
    expect(screen.getByText("Add a pension pot to see its value")).toBeDefined();
    expect(screen.getByText("Needs your salary and contribution rate")).toBeDefined();
  });

  describe("page shell", () => {
    beforeEach(() => {
      testLoaderData = defaultLoaderData;
      testProfileData = defaultProfileData;
    });

    it("puts the h1 first, uses one hero block and a real tablist with hidden panels", () => {
      const { container } = render(<PensionContainer />);
      const headings = screen.getAllByRole("heading").map((h) => h.tagName);
      expect(headings[0]).toBe("H1");
      expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(1);

      const tabs = screen.getAllByRole("tab");
      expect(tabs.map((t) => t.textContent)).toEqual([
        "Forecast",
        "Your pots (2)",
        "Contributions and allowances",
      ]);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
      expect(tabs[0].getAttribute("tabindex")).toBe("0");
      expect(tabs[1].getAttribute("tabindex")).toBe("-1");
      expect(screen.getByRole("tabpanel", { name: "Forecast" })).toBeDefined();
      // Inactive panels are hidden from the accessibility tree.
      expect(screen.queryByRole("tabpanel", { name: /Your pots/ })).toBeNull();
      openTab(/Your pots/);
      expect(screen.getByRole("tabpanel", { name: /Your pots/ })).toBeDefined();
      expect(screen.queryByRole("tabpanel", { name: "Forecast" })).toBeNull();
    });

    it("moves between tabs with the arrow, Home and End keys", () => {
      render(<PensionContainer />);
      const tabs = screen.getAllByRole("tab");
      tabs[0].focus();
      fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
      expect(tabs[1].getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(tabs[1]);
      fireEvent.keyDown(tabs[1], { key: "End" });
      expect(tabs[2].getAttribute("aria-selected")).toBe("true");
      fireEvent.keyDown(tabs[2], { key: "ArrowRight" });
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
      fireEvent.keyDown(tabs[0], { key: "ArrowLeft" });
      expect(tabs[2].getAttribute("aria-selected")).toBe("true");
      fireEvent.keyDown(tabs[2], { key: "Home" });
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    });

    it("lets the salary field be cleared without snapping back to 0", () => {
      render(<PensionContainer />);
      fireEvent.click(screen.getByRole("button", { name: /Edit details/i }));
      const salary = screen.getByLabelText(/Annual salary/i) as HTMLInputElement;
      fireEvent.change(salary, { target: { value: "" } });
      expect(salary.value).toBe("");
    });
  });

  describe("assumptions", () => {
    const setProfile = (profile: Record<string, unknown>) => {
      testLoaderData = { accounts: [], accountDetails: [], userProfile: profile };
      testProfileData = profile;
    };

    it("no salary shows the add-salary prompt, not a projection", () => {
      setProfile({
        annualSalary: null,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        setupChecklistCompletedSteps: ["pension"],
      });
      const { container } = render(<PensionContainer />);

      const prompt = screen.getByText(/Add your salary in/);
      expect(prompt.textContent).toContain("to project your pension.");
      expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe(
        "/app/profile",
      );
      expect(screen.queryByText(/45,000/)).toBeNull();
      expect(container.querySelector("input[type='range']")).toBeNull();
    });

    it("tax trap callout reads both engine rates and never says 60% alone", () => {
      setProfile({
        annualSalary: 110000,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        setupChecklistCompletedSteps: ["pension"],
      });
      const { container } = render(<PensionContainer />);

      expect(container.textContent).toContain("60% marginal rate (unverified estimate)");
      expect(container.textContent).toContain("60% income tax, 62% including NI");
      expect(container.textContent).not.toContain("effective 60% marginal tax rate");
    });

    it("Model this contribution seeds the extra-contribution lever and makes no save call", () => {
      setProfile({
        annualSalary: 110000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        setupChecklistCompletedSteps: ["pension"],
      });
      mockUpdateProfile.mockClear();
      mockSubmit.mockClear();
      render(<PensionContainer />);
      openTab(/Your pots/);
      const extra = () =>
        screen.getByLabelText("Extra each month range slider") as HTMLInputElement;
      expect(extra().value).toBe("0");

      expect(document.body.textContent).toContain("Adjusted net income above £100,000");
      expect(document.body.textContent).not.toContain("Actionable");
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));

      expect(Number(extra().value)).toBeGreaterThan(0);
      // Back on the forecast tab, which holds the scenario zone.
      expect(screen.getByRole("tab", { name: "Forecast" }).getAttribute("aria-selected")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "Reset to saved figures" })).toBeDefined();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("tax trap callout uses Scottish rates for a Scottish baseline, else labels the assumption", async () => {
      const { getDefaultStore } = await import("jotai");
      const { financialBaselineAtom, NO_SALARY_BASELINE } = await import("~/state/baseline.store");
      const store = getDefaultStore();
      const profile = {
        annualSalary: 110000,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        setupChecklistCompletedSteps: ["pension"],
      };

      store.set(financialBaselineAtom, { ...NO_SALARY_BASELINE, ukRegion: "SCOTLAND" });
      setProfile(profile);
      const scottish = render(<PensionContainer />);
      expect(scottish.container.textContent).toContain("67.5% income tax, 69.5% including NI");
      expect(screen.queryByText(/assuming England, Wales and Northern Ireland/i)).toBeNull();
      scottish.unmount();

      store.set(financialBaselineAtom, NO_SALARY_BASELINE);
      setProfile(profile);
      render(<PensionContainer />);
      expect(screen.getByText(/assuming England, Wales and Northern Ireland/i)).toBeDefined();
      // Region can now be set in profile settings (E23 D-4-C), so the label links there.
      expect(screen.getByRole("link", { name: /set your region/i }).getAttribute("href")).toBe(
        "/app/profile",
      );
    });

    it("backend default rates (5% + 3%) show the default label", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(
        screen.getAllByText("Default: auto-enrolment minimum. Edit to match your payslip").length,
      ).toBe(2);
    });

    it("non-default rates do not show the default label", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 6,
        pensionEmployerPercent: 4,
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(screen.queryByText(/Default: auto-enrolment minimum/)).toBeNull();
    });

    it("a pot with no growth rate is labelled as a placeholder, a 0% rate is kept", () => {
      testLoaderData = {
        accounts: [{ id: "p", name: "Pot", type: "Pension", balance: 1000, interestRate: null }],
        accountDetails: [],
        userProfile: { annualSalary: 50000, setupChecklistCompletedSteps: ["pension"] },
      };
      testProfileData = testLoaderData.userProfile;
      const { unmount } = render(<PensionContainer />);
      expect(screen.getByText(/No growth rate is set on your pots/)).toBeDefined();
      unmount();
      testLoaderData.accounts[0].interestRate = 0;
      render(<PensionContainer />);
      expect(screen.queryByText(/No growth rate is set on your pots/)).toBeNull();
    });

    it("keeps a saved 0% contribution rate as 0%", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt: "2026-11-05T10:30:00.000Z",
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(screen.getByText(/You:/).parentElement?.textContent).toContain("0%");
      expect(screen.queryByText(/Default: auto-enrolment minimum/)).toBeNull();
    });
  });

  describe("scenario zone", () => {
    beforeEach(() => {
      testLoaderData = defaultLoaderData;
      testProfileData = defaultProfileData;
      mockSubmit.mockClear();
      mockUpdateProfile.mockClear();
    });

    const summaryText = () =>
      screen.getAllByText("Total in your pots")[0].closest("[data-density='compact']")?.textContent;
    const detailsText = () => document.getElementById("pension-details")?.textContent;
    const slider = (label: string) =>
      screen.getByLabelText(`${label} range slider`) as HTMLInputElement;

    it("changing every scenario lever leaves the saved KPIs and details alone and makes no request", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      render(<PensionContainer />);
      const kpis = summaryText();
      const details = detailsText();
      expect(kpis).toContain("£30,000");

      fireEvent.change(slider("Extra each month"), { target: { value: "400" } });
      fireEvent.change(slider("Years to retirement"), { target: { value: "10" } });
      fireEvent.change(slider("Growth a year"), { target: { value: "9" } });
      fireEvent.click(screen.getByRole("button", { name: "3%" }));
      fireEvent.click(screen.getByLabelText(/Qualifying earnings only/));
      fireEvent.click(screen.getByLabelText(/today's money/));
      fireEvent.click(screen.getByLabelText(/full new State Pension/));

      expect(screen.getByRole("button", { name: "Reset to saved figures" })).toBeDefined();
      expect(summaryText()).toBe(kpis);
      expect(detailsText()).toBe(details);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("has no Sync to profile or Apply control anywhere", () => {
      render(<PensionContainer />);
      expect(screen.queryByText(/sync/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    });

    it("Reset to saved figures returns every lever to the saved value", () => {
      render(<PensionContainer />);
      const before = ["Extra each month", "Years to retirement", "Growth a year"].map(
        (l) => slider(l).value,
      );
      fireEvent.change(slider("Extra each month"), { target: { value: "400" } });
      fireEvent.change(slider("Years to retirement"), { target: { value: "10" } });
      fireEvent.change(slider("Growth a year"), { target: { value: "9" } });
      fireEvent.click(screen.getByLabelText(/today's money/));
      fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect(
        ["Extra each month", "Years to retirement", "Growth a year"].map((l) => slider(l).value),
      ).toEqual(before);
      expect((screen.getByLabelText(/today's money/) as HTMLInputElement).checked).toBe(false);
      expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    });

    it("keeps the scenario when switching tabs and back", () => {
      render(<PensionContainer />);
      fireEvent.change(slider("Extra each month"), { target: { value: "250" } });
      openTab(/Your pots/);
      openTab(/^Forecast$/);
      expect(slider("Extra each month").value).toBe("250");
    });

    it("puts the saved details before the scenario zone, and uses one hero", () => {
      const { container } = render(<PensionContainer />);
      const details = document.getElementById("pension-details");
      const zone = screen.getByRole("region", { name: "Model a change to your pension" });
      expect(
        details && zone && details.compareDocumentPosition(zone) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(1);
      expect(zone.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    });
  });
});

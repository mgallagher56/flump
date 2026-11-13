import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLoaderData: () => testLoaderData,
  useFetcher: () => ({
    submit: vi.fn(),
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
  it("renders contributions breakdown and toggles inline editing for employer NI", async () => {
    render(<PensionContainer />);

    expect(screen.getByRole("heading", { level: 1, name: "Your pension" })).toBeDefined();
    openTab(/Contributions and allowances/);
    expect(
      screen.getByRole("heading", { name: "Your current contributions (UK auto-enrolment)" }),
    ).toBeDefined();

    // Click Edit rates button
    const editBtn = screen.getByRole("button", { name: /Edit rates/i });
    fireEvent.click(editBtn);

    // Verify both Salary Sacrifice and Pass on Employer NI checkboxes exist
    expect(screen.getByLabelText(/Salary Sacrifice \(saves NI\)/i)).toBeDefined();
    const employerNiCheckbox = screen.getByLabelText(/Pass on Employer NI/i);
    expect(employerNiCheckbox).toBeDefined();
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(false);

    // Toggle employer NI on
    fireEvent.click(employerNiCheckbox);
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(true);

    // Click Save to Profile
    const saveBtn = screen.getByRole("button", { name: /Save to profile/i });
    fireEvent.click(saveBtn);

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
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
    expect(screen.getByText("Current Pot")).toBeDefined();
    expect(screen.getByText("Past Pot")).toBeDefined();
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
    expect(screen.getByText("No pots yet")).toBeDefined();
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
        "Retirement forecast",
        "Your pots (2)",
        "Contributions and allowances",
      ]);
      expect(tabs[0].getAttribute("aria-selected")).toBe("true");
      expect(tabs[0].getAttribute("tabindex")).toBe("0");
      expect(tabs[1].getAttribute("tabindex")).toBe("-1");
      expect(screen.getByRole("tabpanel", { name: "Retirement forecast" })).toBeDefined();
      // Inactive panels are hidden from the accessibility tree.
      expect(screen.queryByRole("tabpanel", { name: /Your pots/ })).toBeNull();
      openTab(/Your pots/);
      expect(screen.getByRole("tabpanel", { name: /Your pots/ })).toBeDefined();
      expect(screen.queryByRole("tabpanel", { name: "Retirement forecast" })).toBeNull();
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

    it("lets the inline salary field be cleared without snapping back to 0", () => {
      render(<PensionContainer />);
      openTab(/Contributions and allowances/);
      fireEvent.click(screen.getByRole("button", { name: /Edit rates/i }));
      const panel = screen.getByRole("tabpanel", { name: /Contributions and allowances/ });
      const salary = within(panel).getByLabelText(/Annual salary/i) as HTMLInputElement;
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
      expect(container.querySelector("#pension-forecast-salary")).toBeNull();
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

    it("Model this contribution pre-fills the what-if and makes no save call", () => {
      setProfile({
        annualSalary: 110000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        setupChecklistCompletedSteps: ["pension"],
      });
      mockUpdateProfile.mockClear();
      const { container } = render(<PensionContainer />);
      const input = container.querySelector("#pension-forecast-employee-pct") as HTMLInputElement;
      expect(input.value).toBe("5");

      expect(container.textContent).toContain("Adjusted net income above £100,000");
      expect(container.textContent).not.toContain("Actionable");
      fireEvent.click(screen.getByRole("button", { name: "Model this contribution" }));

      expect(Number(input.value)).toBeGreaterThan(5);
      expect(mockUpdateProfile).not.toHaveBeenCalled();
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
      expect(screen.getAllByText("Default: auto-enrolment minimum. Change in Profile").length).toBe(
        2,
      );
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
      expect(screen.getByText(/Employee:/).parentElement?.textContent).toContain("0%");
      expect(screen.queryByText(/Default: auto-enrolment minimum/)).toBeNull();
    });
  });
});

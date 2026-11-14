import { countFigures, expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import type { DebtSummary } from "~/utils/debtSummary";
import {
  HomeDashboard,
  type HomeDashboardProps,
  MAX_SECTION_CARDS,
  selectSectionCards,
} from "./HomeDashboard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const mockUpdateProfile = vi.hoisted(() => vi.fn());
const ALL_ENABLED = ["accounts", "budget", "savings", "pension", "mortgage", "tax", "debt"];
const mockEnabledPages = vi.hoisted(() => ({ current: null as string[] | null }));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual: any = await importOriginal();
  const { useState } = await import("react");
  return {
    ...actual,
    useUserProfile: () => {
      const [widgets, setWidgets] = useState<string[]>([
        "accounts",
        "budget",
        "debt",
        "savings",
        "pension",
        "mortgage",
        "tax",
      ]);
      return {
        profile: {
          id: "1",
          userId: "u1",
          firstName: "Alex",
          currency: "GBP",
          enabledPages: mockEnabledPages.current ?? ALL_ENABLED,
          dashboardWidgets: widgets,
          dashboardWidgetOrder: ["tax", "accounts"],
          dashboardWidgetSizes: { accounts: "wide" },
          dashboardWidgetConfig: {},
        },
        updateProfile: async (updates: { dashboardWidgets?: string[] }) => {
          await mockUpdateProfile(updates);
          if (updates.dashboardWidgets) setWidgets(updates.dashboardWidgets);
        },
      };
    },
  };
});

const debtSummary: DebtSummary = {
  totalDebt: 8000,
  debtCount: 2,
  highInterestCount: 1,
  monthlyMinimumTotal: 250,
  monthlyMinimumEstimated: false,
  debtFreeDate: "March 2029",
  debts: [],
};

/** A user with savings, a pension, a mortgage, tax records and no consumer debt. */
const noDebt: HomeDashboardProps = {
  checklistProps: {
    hasAccounts: true,
    hasProfile: true,
    hasBudget: true,
    hasSavings: true,
    hasPension: true,
    hasMortgageAccount: true,
    hasRunForecast: false,
    hasTax: true,
    completedSteps: ["accounts", "budget", "savings", "pension", "mortgage", "tax"],
  },
  checkIn: { currentMonth: "2026-11", lastRecordedMonth: "2026-10" },
  netWorthPrior: { month: "2026-10", netWorth: 49680 },
  accountsData: { netWorth: 50000, homeEstimate: 0, accountsCount: 5 },
  budgetData: {
    budgetKnown: true,
    monthlyIncome: 4000,
    monthlyExpenses: 2500,
    monthlySurplus: 1500,
    monthsOfCover: 6.2,
  },
  savingsData: { totalSavingsBalance: 20000, accountsCount: 2 },
  pensionData: {
    totalPensionBalance: 30000,
    potsCount: 1,
    employeePercent: 5,
    employerPercent: 3,
  },
  mortgageData: { mortgageBalance: 150000, hasMortgageAccount: true },
  taxData: { estimatedTaxDue: 2400, recordsCount: 5 },
  debtData: null,
};

/** The same user paying off cards and a loan. */
const withDebt: HomeDashboardProps = {
  ...noDebt,
  accountsData: { netWorth: -2000, homeEstimate: 0, accountsCount: 4 },
  debtData: debtSummary,
};

/** Straight after onboarding: nothing added yet. */
const nearEmpty: HomeDashboardProps = {
  checklistProps: {
    hasAccounts: false,
    hasProfile: true,
    hasBudget: false,
    hasMortgageAccount: false,
    hasRunForecast: false,
    completedSteps: [],
  },
  checkIn: { currentMonth: "2026-11", lastRecordedMonth: null },
  accountsData: { netWorth: 0, accountsCount: 0 },
  budgetData: { budgetKnown: false, monthlyIncome: 0, monthlyExpenses: 0, monthlySurplus: null },
  savingsData: { totalSavingsBalance: 0, accountsCount: 0 },
  pensionData: {
    totalPensionBalance: 0,
    potsCount: 0,
    employeePercent: null,
    employerPercent: null,
  },
  mortgageData: { mortgageBalance: 0, hasMortgageAccount: false },
  taxData: { estimatedTaxDue: null, recordsCount: 0 },
  debtData: null,
};

const renderDashboard = (props: HomeDashboardProps, sample = false) =>
  render(
    <MemoryRouter>
      <SampleModeProvider value={sample}>
        <HomeDashboard {...props} isSample={sample} persistVisibility={!sample} />
      </SampleModeProvider>
    </MemoryRouter>,
  );

const FORBIDDEN = /module|widget|baseline|Welcome back|bank feeds/i;

/** Every word a person can see or hear: text, aria-labels and titles. */
const userFacingText = (root: HTMLElement): string =>
  [
    root.textContent ?? "",
    ...Array.from(root.querySelectorAll("[aria-label],[title]")).map(
      (el) => `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`,
    ),
  ].join(" ");

/** The h1, the hero and the KPI strip: what fits in the first view. */
const firstViewFigures = (container: HTMLElement): number => {
  const hero = screen.getByTestId("hero-figure");
  const strip = hero.nextElementSibling as HTMLElement;
  const h1 = container.querySelector("h1") as HTMLElement;
  return countFigures(h1) + countFigures(hero) + countFigures(strip);
};

/** Net worth as a figure, and as a label beside a figure. */
const netWorthCount = (container: HTMLElement) =>
  container.querySelectorAll('[data-figure="netWorth"]').length;
const netWorthLabels = () =>
  screen.queryAllByText(/^Net worth(, including your home estimate)?$/).length;

describe.each([
  ["with debt", withDebt],
  ["without debt", noDebt],
])("HomeDashboard, a user %s", (_name, props) => {
  beforeEach(() => window.localStorage.clear());

  it("keeps to the page rules: figure budget, one hero, one notice after the h1", () => {
    const { container } = renderDashboard(props);
    expectPageRules(container, { maxFigures: 10, maxNotSet: 3, projectionNotices: 1 });
    // The hero plus its one delta and three supporting figures.
    expect(firstViewFigures(container)).toBeLessThanOrEqual(5);
  });

  it('is "Your money" with nothing above the h1 and no forbidden words', () => {
    const { container } = renderDashboard(props);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain("Your money");
    expect(container.querySelector("[data-notice]")?.compareDocumentPosition(h1)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
    expect(userFacingText(container)).not.toMatch(FORBIDDEN);
  });

  it("shows net worth once, in the hero, with one delta", () => {
    const { container } = renderDashboard(props);
    expect(netWorthCount(container)).toBe(1);
    expect(netWorthLabels()).toBe(1);
    expect(
      screen
        .getByTestId("hero-figure")
        .contains(container.querySelector('[data-figure="netWorth"]') as HTMLElement),
    ).toBe(true);
    expect(screen.getByTestId("hero-figure").textContent).toMatch(/since October/);
  });

  it("draws at most four section cards, each with one link", () => {
    const { container } = renderDashboard(props);
    const cards = container.querySelectorAll("[data-section-card]");
    expect(cards.length).toBeLessThanOrEqual(MAX_SECTION_CARDS);
    for (const card of Array.from(cards)) {
      expect(within(card as HTMLElement).getAllByRole("link")).toHaveLength(1);
    }
  });

  it("never colours money red or green and never adds a plus sign", () => {
    const { container } = renderDashboard(props);
    for (const el of Array.from(container.querySelectorAll("[data-tone]"))) {
      expect(el.getAttribute("data-tone")).not.toMatch(/danger|positive/);
    }
    expect(container.textContent).not.toMatch(/\+£/);
  });
});

describe("HomeDashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  it("labels the home estimate in the hero, with or without a delta (D3)", () => {
    const withHome = { ...noDebt, accountsData: { ...noDebt.accountsData, homeEstimate: 310000 } };
    const { unmount } = renderDashboard(withHome);
    const hero = screen.getByTestId("hero-figure");
    expect(hero.textContent).toContain("Net worth, including your home estimate");
    expect(hero.textContent).toMatch(/since October/);
    unmount();
    renderDashboard({ ...withHome, netWorthPrior: null });
    expect(screen.getByTestId("hero-figure").textContent).toContain(
      "Net worth, including your home estimate",
    );
  });

  it("shows the debt card instead of a band above the hero, with no judgement", () => {
    const { container } = renderDashboard(withDebt);
    expect(screen.getByTestId("widget-card-debt")).toBeTruthy();
    expect(screen.queryByText(/Unsecured debt/i)).toBeNull();
    expect(container.textContent).not.toMatch(/high APR/i);
    expect(screen.getByText("What you owe")).toBeTruthy();
  });

  it("picks the four most relevant sections the user has figures for", () => {
    renderDashboard(withDebt);
    expect(screen.getByTestId("widget-card-debt")).toBeTruthy();
    expect(screen.getByTestId("widget-card-mortgage")).toBeTruthy();
    expect(screen.getByTestId("widget-card-savings")).toBeTruthy();
    expect(screen.getByTestId("widget-card-pension")).toBeTruthy();
    expect(screen.queryByTestId("widget-card-accounts")).toBeNull();
    expect(selectSectionCards(["accounts", "budget", "tax"])).toEqual([
      "accounts",
      "budget",
      "tax",
    ]);
  });

  it("folds the unverified tax estimate into the one notice", () => {
    renderDashboard({
      ...noDebt,
      savingsData: { totalSavingsBalance: 0, accountsCount: 0 },
      checklistProps: { ...noDebt.checklistProps, hasSavings: false },
    });
    expect(screen.getByTestId("widget-card-tax")).toBeTruthy();
    expect(document.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(
      (document.querySelector('[data-notice="projection"]') as HTMLElement).textContent,
    ).toMatch(/^Unverified estimate\./);
  });

  it("shows no notice when every card is a saved fact", () => {
    renderDashboard({ ...noDebt, taxData: { estimatedTaxDue: null, recordsCount: 0 } });
    expect(document.querySelector('[data-notice="projection"]')).toBeNull();
  });

  it("shows the setup row and the check-in row when they apply", () => {
    renderDashboard({
      ...noDebt,
      checklistProps: { ...noDebt.checklistProps, completedSteps: [], hasSavings: false },
    });
    expect(screen.getByRole("button", { name: /Finish setting up: \d of \d done/ })).toBeTruthy();
    expect(screen.getByTestId("monthly-check-in-card")).toBeTruthy();
  });

  it("hides the check-in row once this month is recorded", () => {
    renderDashboard({
      ...noDebt,
      checkIn: { currentMonth: "2026-11", lastRecordedMonth: "2026-11" },
    });
    expect(screen.queryByTestId("monthly-check-in-card")).toBeNull();
  });

  it("keeps a near-empty dashboard to one hero prompt, one strip prompt and one empty state", () => {
    const { container } = renderDashboard(nearEmpty);
    expectPageRules(container, { maxFigures: 0, maxNotSet: 1, projectionNotices: 0 });
    expect(screen.getByText("Add an account to see your net worth.")).toBeTruthy();
    expect(
      screen.getByText(
        "Add your budget to see what is left over each month and your months of cover",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Nothing to show yet")).toBeTruthy();
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(userFacingText(container)).not.toMatch(FORBIDDEN);
  });

  it("hides a section through Choose what shows here and writes only dashboardWidgets", async () => {
    renderDashboard(withDebt);
    fireEvent.click(screen.getByRole("button", { name: /Choose what shows here/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose what shows here" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Debt/ }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    const payload = mockUpdateProfile.mock.calls[0]?.[0];
    expect(Object.keys(payload)).toEqual(["dashboardWidgets"]);
    expect(payload.dashboardWidgets).not.toContain("debt");
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByTestId("widget-card-debt")).toBeNull());
  });

  it("keeps saved sections for switched-off pages when another section is toggled", async () => {
    mockEnabledPages.current = ["accounts", "budget", "savings", "pension", "tax", "debt"];
    try {
      renderDashboard(withDebt);
      fireEvent.click(screen.getByRole("button", { name: /Choose what shows here/ }));
      const dialog = screen.getByRole("dialog", { name: "Choose what shows here" });
      fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Debt/ }));
      await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
      const payload = mockUpdateProfile.mock.calls[0]?.[0];
      expect(payload.dashboardWidgets).not.toContain("debt");
      // The mortgage page is off, but its saved choice survives for when it is switched back on.
      expect(payload.dashboardWidgets).toContain("mortgage");
    } finally {
      mockEnabledPages.current = null;
    }
  });

  it("restores the choice and says the dashboard is unchanged when saving fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("offline"));
    renderDashboard(withDebt);
    fireEvent.click(screen.getByRole("button", { name: /Choose what shows here/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose what shows here" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Debt/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /We could not save that change\. Your dashboard is unchanged\. Try again\./,
    );
    expect(
      (within(dialog).getByRole("checkbox", { name: /^Debt/ }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("is honest about the cap: at four ticked, the rest are disabled with one hint", async () => {
    renderDashboard(withDebt);
    fireEvent.click(screen.getByRole("button", { name: /Choose what shows here/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose what shows here" });
    // The profile has all seven ticked: untick three to reach the cap.
    for (const name of [/^Accounts/, /^Budget/, /^Self Assessment/]) {
      fireEvent.click(within(dialog).getByRole("checkbox", { name }));
    }
    await waitFor(() =>
      expect(within(dialog).getByText("Up to 4 sections show here.")).toBeTruthy(),
    );
    const accounts = within(dialog).getByRole("checkbox", {
      name: /^Accounts/,
    }) as HTMLInputElement;
    expect(accounts.disabled).toBe(true);
  });

  it("shows the all-hidden empty state that reopens the choices", async () => {
    renderDashboard(noDebt);
    fireEvent.click(screen.getByRole("button", { name: /Choose what shows here/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose what shows here" });
    for (const box of within(dialog).getAllByRole("checkbox")) fireEvent.click(box);
    await waitFor(() => expect(screen.getByText(/Every section is hidden/)).toBeTruthy());
  });
});

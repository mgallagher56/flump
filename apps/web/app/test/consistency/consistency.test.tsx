/**
 * Cross-page consistency harness (E23 section 9.2), web half. For every persona fixture it runs
 * the real loaders on the persona's saved rows, renders the pages that show a derived figure and
 * collects every `[data-figure]` element. Each figure must equal the engine's financial picture,
 * on every surface it appears. The MCP half is packages/mcp/src/__tests__/consistency.test.ts.
 *
 * A page that computes one of these figures locally (or reads it from the browser) drifts from
 * the picture for at least one persona and fails here.
 *
 * Shared test infrastructure, not a component, so the colocation law does not apply.
 */
import { buildFinancialPicture, type FinancialPicture, isFigureKnown } from "@flump/finance-engine";
import { PERSONAS, type PersonaFixture, type PersonaName } from "@flump/finance-engine/testing";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { LoaderFunctionArgs } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loaderState = vi.hoisted(() => ({ data: null as unknown }));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    Link: ({ children }: { children: unknown }) => children,
    useLoaderData: () => loaderState.data,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("~/services/backend-client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/backend-client.server")>();
  return { ...actual, loadWorkspaceSnapshot: vi.fn() };
});

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  const pages = ["accounts", "budget", "savings", "pension", "mortgage", "tax", "debt"];
  return {
    ...actual,
    useUserProfile: () => ({
      profile: { id: "p", userId: "u", enabledPages: pages, dashboardWidgets: pages },
      setProfile: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue({}),
      markChecklistStep: vi.fn().mockResolvedValue({}),
    }),
  };
});

vi.mock("recharts", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: unknown }) => (
      <div style={{ width: 500, height: 300 }}>{children as never}</div>
    ),
  };
});

import BudgetContainer from "~/containers/budget/BudgetContainer";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import { loader as dashboardLoader } from "~/routes/_index";
import { loader as debtLoader } from "~/routes/app.debt";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

const NAMES = Object.keys(PERSONAS) as PersonaName[];

/** The persona's rows as the backend returns them to a loader. */
function workspace(fixture: PersonaFixture) {
  return {
    user: { id: "persona-user", email: "persona@example.test" },
    userProfile: {
      ...fixture.profile,
      onboardingCompleted: true,
      setupChecklistCompletedSteps: [],
      enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "tax", "debt"],
    },
    accounts: fixture.accounts,
    accountDetails: fixture.details,
    budgetEntries: fixture.budget.map((b) => ({
      ...b,
      userId: "persona-user",
      isPrimaryIncome: false,
      isDefault: false,
      notes: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    })),
    taxRecords: fixture.taxRecords,
    portfolioSnapshot: null,
  };
}

const args = (path = "/") =>
  ({
    request: new Request(`http://localhost${path}`),
    params: {},
    context: {},
  }) as LoaderFunctionArgs;

async function payload(result: unknown): Promise<any> {
  if (result instanceof Response) return result.json();
  if (result && typeof result === "object" && "data" in result && "init" in result) {
    return (result as { data: unknown }).data;
  }
  return result;
}

/** The picture's value for each data-figure key, or null when the figure is unknown. */
function expectedFigures(picture: FinancialPicture): Record<string, number | null> {
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  return {
    netWorth: picture.netWorth.netWorth,
    liquidCash: picture.netWorth.liquidCash,
    "debt.total": picture.debt.consumerDebt,
    "budget.income": budget?.income ?? null,
    "budget.outgoings": budget?.outgoings ?? null,
    "budget.savings": budget?.savings ?? null,
    "budget.surplus": budget?.surplus ?? null,
    "safeToSpend.weekly": isFigureKnown(picture.safeToSpend)
      ? picture.safeToSpend.value.weekly
      : null,
    monthsOfCover: isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value.months : null,
  };
}

interface Reading {
  key: string;
  surface: string;
  text: string;
  value: number;
  decimals: number;
}

/** Reads en-GB figures: "£1,888", "+£800", "minus £300", "4.7 months", "£264.69". */
function parseFigure(el: Element): { value: number; decimals: number } {
  const text = el.textContent ?? "";
  const match = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) throw new Error(`no number in figure text "${text}"`);
  const negative = /minus|−|-£|^-/.test(text) || el.getAttribute("data-figure-sign") === "-1";
  const n = Number(match[0]);
  return { value: negative ? -n : n, decimals: match[1] ? match[1].length - 1 : 0 };
}

function collect(container: HTMLElement, surface: string): Reading[] {
  return Array.from(container.querySelectorAll("[data-figure]")).map((el) => ({
    key: el.getAttribute("data-figure") as string,
    surface,
    text: el.textContent ?? "",
    ...parseFigure(el),
  }));
}

/** A displayed figure matches when it equals the engine value at the precision shown. */
function matches(reading: Reading, expected: number): boolean {
  const factor = 10 ** reading.decimals;
  return Math.round(expected * factor) / factor === reading.value;
}

beforeEach(() => {
  vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(NAMES)("persona %s: one figure, every surface", (name) => {
  const { fixture } = PERSONAS[name];
  const picture = buildFinancialPicture(fixture);
  const expected = expectedFigures(picture);

  beforeEach(() => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValue(workspace(fixture) as never);
  });

  it("dashboard loader returns the picture's figures", async () => {
    const data = await payload(await dashboardLoader(args()));
    expect(data.accountsData.netWorth).toBe(expected.netWorth);
    expect(data.accountsData.liquidCash).toBe(expected.liquidCash);
    expect(data.budgetData.safeToSpendWeekly).toBe(expected["safeToSpend.weekly"]);
    expect(data.budgetData.monthsOfCover).toBe(expected.monthsOfCover);
    if (expected["budget.income"] !== null) {
      expect(data.budgetData.monthlyIncome).toBe(expected["budget.income"]);
      expect(data.budgetData.monthlyExpenses).toBe(expected["budget.outgoings"]);
      expect(data.budgetData.budgetedSavings).toBe(expected["budget.savings"]);
      expect(data.budgetData.monthlySurplus).toBe(expected["budget.surplus"]);
    } else {
      expect(data.budgetData.budgetKnown).toBe(false);
    }
    expect(data.debtData?.totalDebt ?? 0).toBe(expected["debt.total"]);
  });

  it("debt loader returns the picture's figures", async () => {
    const data = await payload(await debtLoader(args("/app/debt")));
    expect(data.debtInputs.totalDebt).toBe(expected["debt.total"]);
    expect(data.debtInputs.liquidSavings).toBe(expected.liquidCash);
    expect(data.debtInputs.monthlySurplus).toBe(expected["budget.surplus"]);
  });

  it("every rendered figure on the dashboard and Budget page equals the picture", async () => {
    const readings: Reading[] = [];

    const dashboard = await payload(await dashboardLoader(args()));
    const home = render(
      <HomeDashboard
        {...dashboard}
        checklistProps={{
          hasAccounts: dashboard.hasAccounts,
          hasBudget: dashboard.hasBudget,
          hasMortgageAccount: dashboard.hasMortgageAccount,
          hasPension: dashboard.hasPension,
          hasProfile: dashboard.hasProfile,
          hasRunForecast: dashboard.hasRunForecast,
          hasSavings: dashboard.hasSavings,
          hasTax: false,
          completedSteps: [],
        }}
        persistVisibility={false}
      />,
    );
    readings.push(...collect(home.container, "dashboard"));
    home.unmount();

    if (fixture.budget.length > 0) {
      loaderState.data = workspace(fixture);
      const budget = render(<BudgetContainer />);
      readings.push(...collect(budget.container, "budget overview"));
      fireEvent.click(screen.getByTestId("budget-tab-runway"));
      readings.push(
        ...collect(budget.container, "months of cover").filter((r) => r.key === "monthsOfCover"),
      );
      budget.unmount();
    }

    // Every key the harness knows about, and nothing it does not.
    for (const r of readings) expect(Object.keys(expected)).toContain(r.key);

    const mismatches = readings.filter((r) => {
      const want = expected[r.key];
      return want === null || want === undefined || !matches(r, want);
    });
    expect(
      mismatches.map((r) => `${r.surface} ${r.key}: shows "${r.text}", engine ${expected[r.key]}`),
    ).toEqual([]);

    // Known figures must actually be on screen somewhere (a page cannot pass by hiding them).
    const shown = new Set(readings.map((r) => r.key));
    if (fixture.accounts.length > 0) expect(shown).toContain("netWorth");
    if (expected["safeToSpend.weekly"] !== null) expect(shown).toContain("safeToSpend.weekly");
    if (expected.monthsOfCover !== null) expect(shown).toContain("monthsOfCover");
    if (expected["budget.income"] !== null) expect(shown).toContain("budget.surplus");
  });
});

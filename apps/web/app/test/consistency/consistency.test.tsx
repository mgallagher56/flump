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
import {
  buildFinancialPicture,
  categorizeAccountType,
  countsTowardNetWorth,
  type FinancialPicture,
  financialPictureInputFromRows,
  isFigureKnown,
  type NetWorthBasis,
  resolveNetWorthScope,
} from "@flump/finance-engine";
import { PERSONAS, type PersonaFixture, type PersonaName } from "@flump/finance-engine/testing";
import { cleanup, render } from "@testing-library/react";
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
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useFetcher: () => ({ state: "idle", data: undefined, submit: vi.fn(), load: vi.fn() }),
    useRevalidator: () => ({ state: "idle", revalidate: vi.fn() }),
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

import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { isLiabilityType } from "~/containers/accounts/utils";
import BudgetContainer from "~/containers/budget/BudgetContainer";
import { DebtContainer } from "~/containers/debt/DebtContainer";
import MortgageContainer from "~/containers/mortgage/MortgageContainer";
import { buildAccountRows } from "~/features/accounts/accountRows";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import {
  addMonths,
  buildCheckInRows,
  buildSnapshotHistory,
  londonMonth,
} from "~/features/snapshot/snapshotModel";
import { loader as dashboardLoader } from "~/routes/_index";
import { loader as historyLoader } from "~/routes/app.accounts.history";
import { loader as debtLoader } from "~/routes/app.debt";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

/** The four net worth choice combinations; the first is the default (today's figures). */
const ALL_BASES: NetWorthBasis[] = [
  { countProperty: true, countStudentLoan: false },
  { countProperty: true, countStudentLoan: true },
  { countProperty: false, countStudentLoan: false },
  { countProperty: false, countStudentLoan: true },
];

type CaseName = PersonaName | "noIncomeRows";

/** The nine personas, plus one budget with essentials but no income row (suggested-rows shape). */
const CASES = {
  ...Object.fromEntries(Object.entries(PERSONAS).map(([k, v]) => [k, v.fixture])),
  noIncomeRows: {
    ...PERSONAS.sam.fixture,
    budget: PERSONAS.sam.fixture.budget.filter((b) => !b.isIncome),
  },
} as Record<CaseName, PersonaFixture>;
const NAMES = Object.keys(CASES) as CaseName[];

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
    "budget.income": budget?.hasIncome ? budget.income : null,
    "budget.outgoings": budget?.outgoings ?? null,
    "budget.savings": budget?.savings ?? null,
    "budget.surplus": budget?.hasIncome ? budget.surplus : null,
    "safeToSpend.weekly": isFigureKnown(picture.safeToSpend)
      ? picture.safeToSpend.value.weekly
      : null,
    monthsOfCover: isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value.months : null,
    "tax.estimatedDue": isFigureKnown(picture.estimatedTaxDue)
      ? picture.estimatedTaxDue.value.amount
      : null,
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
  // "10+ years" is any figure over 120 months: read it as its lower bound, marked with -1.
  const years = text.match(/^(\d+)\+ years$/);
  if (years) return { value: Number(years[1]) * 12, decimals: -1 };
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
  if (reading.decimals === -1) return expected > 120 && expected >= reading.value;
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
  const fixture = CASES[name];
  // Built through the shared row mapper from the rows the loaders get, so a mapping bug shows up.
  const rows = workspace(fixture);
  const picture = buildFinancialPicture(
    financialPictureInputFromRows({
      profile: rows.userProfile,
      accounts: rows.accounts,
      accountDetails: rows.accountDetails,
      budgetEntries: rows.budgetEntries,
      taxRecords: rows.taxRecords,
    }),
  );
  const expected = expectedFigures(picture);

  it("the shared row mapper gives the same picture as the fixture input", () => {
    expect(picture).toEqual(buildFinancialPicture(fixture));
  });

  beforeEach(() => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValue(workspace(fixture) as never);
  });

  it("dashboard loader returns the picture's figures", async () => {
    const data = await payload(await dashboardLoader(args()));
    expect(data.accountsData.netWorth).toBe(expected.netWorth);
    expect(data.accountsData.liquidCash).toBe(expected.liquidCash);
    expect(data.budgetData.safeToSpendWeekly).toBe(expected["safeToSpend.weekly"]);
    expect(data.budgetData.monthsOfCover).toBe(expected.monthsOfCover);
    const totals = isFigureKnown(picture.budget) ? picture.budget.value : null;
    expect(data.budgetData.budgetKnown).toBe(totals !== null);
    if (totals) {
      expect(data.budgetData.monthlyIncome).toBe(totals.income);
      expect(data.budgetData.monthlyExpenses).toBe(totals.outgoings);
      expect(data.budgetData.budgetedSavings).toBe(totals.savings);
      // A surplus needs an income row; without one it is unknown, as in MCP.
      expect(data.budgetData.monthlySurplus).toBe(totals.hasIncome ? totals.surplus : null);
    }
    expect(data.debtData?.totalDebt ?? 0).toBe(expected["debt.total"]);
  });

  it("debt loader returns the picture's figures", async () => {
    const data = await payload(await debtLoader(args("/app/debt")));
    expect(data.debtInputs.totalDebt).toBe(expected["debt.total"]);
    expect(data.debtInputs.liquidSavings).toBe(expected.liquidCash);
    const totals = isFigureKnown(picture.budget) ? picture.budget.value : null;
    expect(data.debtInputs.monthlySurplus).toBe(totals?.hasIncome ? totals.surplus : null);
  });

  it("the Debt page shows the picture's total debt", async () => {
    if (expected["debt.total"] === 0) return;
    loaderState.data = await payload(await debtLoader(args("/app/debt")));
    const page = render(<DebtContainer />);
    const readings = collect(page.container, "debt page").filter((r) => r.key === "debt.total");
    expect(readings.length).toBeGreaterThan(0);
    for (const r of readings) expect(matches(r, expected["debt.total"] as number)).toBe(true);
    page.unmount();
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
      // Months of cover now sits inline in the page's scenario zone, so one pass reads it.
      readings.push(...collect(budget.container, "budget overview"));
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
    // Safe to spend left the dashboard (E16 PR 4; the plan keeps it on budget), and the budget
    // shows it under its hero, which needs an income row. Follow-up: show it without one.
    if (expected["safeToSpend.weekly"] !== null && expected["budget.surplus"] !== null)
      expect(shown).toContain("safeToSpend.weekly");
    if (expected.monthsOfCover !== null) expect(shown).toContain("monthsOfCover");
    if (expected["budget.surplus"] !== null) expect(shown).toContain("budget.surplus");
  });

  it("dashboard loader: net worth with the home estimate, take-home and estimated tax due", async () => {
    const data = await payload(await dashboardLoader(args()));
    expect(data.accountsData.homeEstimate).toBe(picture.netWorth.homeEstimate);
    expect(data.accountsData.totalAssets).toBe(picture.netWorth.totalAssets);
    expect(data.budgetData.takeHomeMonthly).toBe(
      isFigureKnown(picture.takeHome) ? picture.takeHome.value.monthly : null,
    );
    expect(data.forecastData.estimatedTakeHome).toBe(data.budgetData.takeHomeMonthly);
    expect(data.taxData.estimatedTaxDue).toBe(expected["tax.estimatedDue"]);
  });

  it("the Mortgage page shows the picture's loan to value, or none when it is unknown", () => {
    loaderState.data = {
      accounts: rows.accounts,
      accountDetails: rows.accountDetails,
      userProfile: rows.userProfile,
    };
    const page = render(<MortgageContainer />);
    // E16 PR 6: loan to value is a KPI in the saved strip, shown once balance, rate and term are
    // saved. With any of them missing the page shows one prompt and no loan to value at all.
    const strip = page.container.querySelector("#mortgage-saved")?.textContent ?? "";
    // R2-7: with no mortgage at all the page shows its EmptyState instead of the prompt.
    const prompt =
      page.container.querySelector("#mortgage-prompt") ??
      page.container.querySelector("#mortgage-empty");
    expect(strip !== "" || prompt !== null).toBe(true);
    if (strip !== "" && isFigureKnown(picture.loanToValue)) {
      // R2-7: shown as entered, at most one decimal and no trailing zero ("60%", "62.5%").
      const ltv = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(
        picture.loanToValue.value.percent,
      );
      expect(strip).toMatch(new RegExp(`Loan to value[^\\d]*${ltv.replace(".", "\\.")}%`));
    }
    if (!isFigureKnown(picture.loanToValue)) {
      expect(strip).not.toMatch(/Loan to value\d/);
    }
    page.unmount();
  });
});

describe("renter and homeowner: the figures E16 PR 3 fixed", () => {
  const pictureOf = (name: PersonaName) => buildFinancialPicture(PERSONAS[name].fixture);

  it("the homeowner's net worth counts the home once, 241,000, and LTV is 60%", () => {
    const p = pictureOf("homeowner");
    expect(p.netWorth.netWorth).toBe(241000);
    expect(p.netWorth.homeEstimate).toBe(310000);
    expect(isFigureKnown(p.loanToValue) && p.loanToValue.value.percent).toBe(60);
  });

  it("the renter (Sam) has no home estimate and no LTV; neither has tax due", () => {
    const p = pictureOf("sam");
    expect(p.netWorth.homeEstimate).toBe(0);
    expect(p.loanToValue.status).toBe("unknown");
    expect(p.estimatedTaxDue.status).toBe("unknown");
    expect(pictureOf("homeowner").estimatedTaxDue.status).toBe("unknown");
  });
});

/**
 * One balance source (R2-1, D22): the saved account balance is the current balance on every
 * surface. Recorded months are history, and their values differ from today's balances here, so a
 * surface that reads the latest recorded month instead of the saved balance fails.
 *
 * Each case is a persona, whether the current month is recorded, and a net worth basis, so the
 * net worth choices can loop the same checks over every basis by adding cases.
 */
const TODAY = new Date(2026, 10, 14); // 14 November 2026
const CURRENT_MONTH = "2026-11";

type MonthState = "current month not recorded" | "current month recorded";

interface BalanceCase {
  name: PersonaName;
  month: MonthState;
  basis: NetWorthBasis;
}

const BALANCE_CASES: BalanceCase[] = (["homeowner", "sam"] as const).flatMap((name) =>
  (["current month not recorded", "current month recorded"] as const).flatMap((month) =>
    ALL_BASES.map((basis) => ({ name, month, basis })),
  ),
);

/**
 * September and October rows whose values differ from the saved balance, plus a November row
 * equal to it when the current month is recorded (a check-in writes both, snapshot-write.ts).
 */
function historyFor(fixture: PersonaFixture, month: MonthState) {
  return fixture.accounts.flatMap((a) => {
    const balance = Number(a.balance);
    const rows = [
      { accountId: a.id, year: 2026, month: 9, value: Math.round(balance * 0.9) },
      { accountId: a.id, year: 2026, month: 10, value: Math.round(balance * 0.95) },
    ];
    if (month === "current month recorded") {
      rows.push({ accountId: a.id, year: 2026, month: 11, value: balance });
    }
    return rows;
  });
}

/** Signed sum of the accounts the basis counts: assets add, amounts owed subtract. */
function countedSum(
  accounts: readonly { type?: string | null }[],
  amount: (index: number) => number,
  basis: NetWorthBasis,
): number {
  return accounts.reduce((sum, a, i) => {
    const type = String(a.type ?? "");
    if (!countsTowardNetWorth(categorizeAccountType(type), basis)) return sum;
    const value = amount(i);
    return sum + (isLiabilityType(type) ? -Math.abs(value) : value);
  }, 0);
}

/** The hero figure in whole pounds: "£21,000", "minus £186,000". */
const heroPounds = (container: HTMLElement): number => {
  const text = container.querySelector('[data-testid="hero-figure"]')?.textContent ?? "";
  const match = text.replace(/,/g, "").match(/£(\d+)/);
  if (!match) throw new Error(`no pounds in hero "${text}"`);
  return Number(match[1]);
};

describe.each(BALANCE_CASES)(
  "$name, $month, $basis: one balance per account, one net worth",
  ({ name, month, basis }) => {
    const fixture = PERSONAS[name].fixture;
    const details = historyFor(fixture, month);
    const picture = buildFinancialPicture({ ...fixture, details, netWorthBasis: basis });
    const netWorth = picture.netWorth.netWorth;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(TODAY);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("the recorded history differs from the saved balances, so the checks below can fail", () => {
      const latestRecorded = countedSum(
        fixture.accounts,
        (i) => Math.round(Number(fixture.accounts[i]?.balance) * 0.95),
        basis,
      );
      expect(latestRecorded).not.toBe(netWorth);
    });

    it("the account rows show the saved balances and sum to the picture's net worth", () => {
      const rows = buildAccountRows(fixture.accounts, details, TODAY);
      rows.forEach((row, i) => {
        const saved = Number(fixture.accounts[i]?.balance);
        expect(row.balance).toBe(isLiabilityType(row.type) ? Math.abs(saved) : saved);
      });
      expect(countedSum(rows, (i) => rows[i]?.balance ?? 0, basis)).toBe(netWorth);
    });

    it("the history chart ends on the picture's net worth", () => {
      const history = buildSnapshotHistory(fixture.accounts, details, CURRENT_MONTH, basis);
      expect(history.latest?.month).toBe(CURRENT_MONTH);
      expect(history.latest?.netWorth).toBe(netWorth);
      expect(history.latest?.allCarried).toBe(month === "current month not recorded");
    });

    it("each account page hero shows the saved balance, and they sum to the picture's net worth", () => {
      const heroes = fixture.accounts.map((account) => {
        loaderState.data = {
          account,
          accountDetails: details.filter((d) => d.accountId === account.id),
        };
        const page = render(<AccountDetailContainer />);
        const value = heroPounds(page.container);
        const text = page.container.textContent ?? "";
        if (month === "current month not recorded") {
          // R2-5: an unrecorded month says when the history was last updated, not a change.
          expect(text).toContain("Last updated");
        } else {
          expect(text).not.toContain("Last updated");
        }
        page.unmount();
        return value;
      });
      fixture.accounts.forEach((account, i) => {
        expect(heroes[i]).toBe(Math.abs(Number(account.balance)));
      });
      expect(countedSum(fixture.accounts, (i) => heroes[i] ?? 0, basis)).toBe(netWorth);
    });
  },
);

/**
 * Net worth choices: under each of the four combinations, every surface that shows net worth
 * equals the picture's figure, for every persona. The choices travel as profile fields, so the
 * loaders must read them from the saved profile, not a default.
 */
const BASIS_CASES = (Object.keys(PERSONAS) as PersonaName[]).flatMap((name) =>
  ALL_BASES.map((basis) => ({ name, basis })),
);

describe.each(BASIS_CASES)(
  "persona $name, $basis: net worth under the choice",
  ({ name, basis }) => {
    const fixture = PERSONAS[name].fixture;
    const base = workspace(fixture);
    const rows = {
      ...base,
      userProfile: {
        ...base.userProfile,
        netWorthCountsProperty: basis.countProperty,
        netWorthCountsStudentLoan: basis.countStudentLoan,
      },
    };
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: rows.userProfile,
        accounts: rows.accounts,
        accountDetails: rows.accountDetails,
        budgetEntries: rows.budgetEntries,
        taxRecords: rows.taxRecords,
      }),
    );
    const netWorth = picture.netWorth.netWorth;
    const leftOut = resolveNetWorthScope(fixture.accounts, basis).leftOut;

    beforeEach(() => {
      vi.mocked(loadWorkspaceSnapshot).mockResolvedValue(rows as never);
    });

    it("the picture is computed under the saved choice", () => {
      expect(picture.netWorth.basis).toEqual(basis);
      expect(picture.netWorth.leftOut).toEqual(leftOut);
    });

    it("the dashboard hero shows the picture's net worth, with the line only when something is left out", async () => {
      const data = await payload(await dashboardLoader(args()));
      expect(data.accountsData.netWorth).toBe(netWorth);
      expect(data.accountsData.leftOut).toEqual(leftOut);
      const home = render(
        <HomeDashboard
          {...data}
          checklistProps={{
            hasAccounts: data.hasAccounts,
            hasBudget: data.hasBudget,
            hasMortgageAccount: data.hasMortgageAccount,
            hasPension: data.hasPension,
            hasProfile: data.hasProfile,
            hasRunForecast: data.hasRunForecast,
            hasSavings: data.hasSavings,
            hasTax: false,
            completedSteps: [],
          }}
          persistVisibility={false}
        />,
      );
      const figures = collect(home.container, "dashboard").filter((r) => r.key === "netWorth");
      if (fixture.accounts.length > 0) expect(figures.length).toBeGreaterThan(0);
      for (const r of figures) expect(matches(r, netWorth)).toBe(true);
      const line = home.container.querySelector("#dashboard-net-worth-basis");
      expect(line !== null).toBe(fixture.accounts.length > 0 && leftOut.length > 0);
      expect(line?.textContent ?? "").not.toMatch(/\d|£/);
      home.unmount();
    });

    it("the accounts totals show the picture's net worth and always link to the choices", () => {
      if (fixture.accounts.length === 0) return;
      loaderState.data = {
        accounts: rows.accounts,
        accountDetails: rows.accountDetails,
        userProfile: rows.userProfile,
        bankConnections: [],
        bankConnectionsEnabled: false,
      };
      const page = render(<AccountsContainer />);
      // R2-5: net worth is the accounts page's hero; its value is the paragraph after the label.
      const total = page.container.querySelector("#accounts-net-worth p:not([id])");
      expect(total).not.toBeNull();
      const reading = {
        key: "netWorth",
        surface: "accounts",
        text: "",
        ...parseFigure(total as Element),
      };
      expect(matches(reading, netWorth)).toBe(true);
      const line = page.container.querySelector("#accounts-net-worth-basis");
      expect(line?.textContent).toContain("Change what counts");
      page.unmount();
    });

    it("the history loader passes the choice and the latest point equals the picture", async () => {
      const data = await payload(await historyLoader(args("/app/accounts/history")));
      expect(data.basis).toEqual(basis);
      // Last month recorded at other values, so the series has a current-month point to check.
      const current = londonMonth();
      const [year, month] = addMonths(current, -1).split("-").map(Number);
      const lastMonth = fixture.accounts.map((a) => ({
        accountId: a.id,
        year,
        month,
        value: Math.round(Number(a.balance) * 0.9),
      }));
      const history = buildSnapshotHistory(fixture.accounts, lastMonth, current, data.basis);
      if (fixture.accounts.length > 0) {
        expect(history.latest?.month).toBe(current);
        expect(history.latest?.netWorth).toBe(netWorth);
      }
    });

    it("the check-in counts exactly the accounts the picture counts", () => {
      const month = londonMonth();
      const checkIn = buildCheckInRows(fixture.accounts, fixture.details, month, month, basis);
      const counted = new Set(checkIn.filter((r) => !r.outsideNetWorth).map((r) => r.accountId));
      const sum = fixture.accounts.reduce((total, a) => {
        if (!counted.has(String(a.id).toLowerCase())) return total;
        const value = Number(a.balance);
        return total + (isLiabilityType(String(a.type)) ? -Math.abs(value) : value);
      }, 0);
      expect(sum).toBe(netWorth);
    });
  },
);

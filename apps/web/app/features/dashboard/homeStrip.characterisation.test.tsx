import { buildFinancialPicture, financialPictureInputFromRows } from "@flump/finance-engine";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { loader } from "~/routes/_index";
import { loadWorkspacePicture } from "~/services/backend-client.server";
import { HomeDashboard } from "./components/HomeDashboard";

/**
 * Home's two-figure strip end to end, as web builds it: the loader's budget rules (spending only
 * from a real amount, no left over without an income row), the dashboard's income-only rule and
 * the strip's one prompt when half or more cards are unset. Written before those rules moved into
 * the engine (E12 S5b) and run against the old web code first, so the move is pinned to give the
 * same strip in every case below.
 */

// The global test setup stubs Link to its children; the strip's links need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/services/backend-client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/backend-client.server")>();
  return { ...actual, loadWorkspacePicture: vi.fn(actual.loadWorkspacePicture) };
});

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: { id: "1", userId: "u1", currency: "GBP" },
      updateProfile: vi.fn(),
      markChecklistStep: vi.fn(),
    }),
  };
});

const TAKE_HOME_ROW = {
  id: "row-take-home",
  category: "income",
  name: "Salary after tax",
  amount: 1,
  isIncome: true,
  linkKind: "take_home",
};
const INCOME = {
  id: "row-income",
  category: "income",
  name: "Salary after tax",
  amount: 2085,
  isIncome: true,
};
const RENT = { id: "row-rent", category: "housing", name: "Rent", amount: 950, isEssential: true };
const GROCERIES = {
  id: "row-groceries",
  category: "expenses",
  name: "Groceries",
  amount: 250,
  isEssential: true,
};
const EATING_OUT = { id: "row-eating-out", category: "expenses", name: "Eating out", amount: 90 };
const SAVINGS = { id: "row-savings", category: "savings", name: "Easy access", amount: 150 };
const SPENDING = [RENT, GROCERIES, EATING_OUT, SAVINGS];

const EMPLOYEE = {
  onboardingCompleted: true,
  annualSalary: 36000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};

const CURRENT = { id: "acc-current", name: "Current account", type: "Current", balance: 1200 };
const CARD = { id: "acc-card", name: "Credit card", type: "Credit Card", balance: 1800 };
const PENSION = { id: "acc-pension", name: "Workplace pension", type: "Pension", balance: 24000 };

interface Case {
  profile?: Record<string, unknown>;
  budgetEntries?: Record<string, unknown>[];
  accounts?: Record<string, unknown>[];
  today?: string;
}

/** What the strip shows: the prompt, or each card's label, figure and caption. */
async function homeStrip({
  profile = EMPLOYEE,
  budgetEntries = [],
  accounts = [CURRENT],
  today = "2026-11-27T12:00:00Z",
}: Case) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(today));
  const rows = {
    user: { id: "u1", email: "person@example.com" },
    accounts,
    accountDetails: [],
    budgetEntries,
    taxRecords: [],
    userProfile: profile,
  };
  const picture = buildFinancialPicture(
    financialPictureInputFromRows({
      profile: rows.userProfile as never,
      accounts: rows.accounts as never,
      budgetEntries: rows.budgetEntries,
    }),
  );
  vi.mocked(loadWorkspacePicture).mockResolvedValueOnce({ ...rows, picture } as never);
  const data = (await loader({
    request: new Request("http://localhost/"),
    params: {},
    context: {},
  } as never)) as any;
  const { container } = render(
    <MemoryRouter>
      <SampleModeProvider value={false}>
        <HomeDashboard
          accountsData={data.accountsData}
          budgetData={data.budgetData}
          checklistProps={{ hasAccounts: true, completedSteps: [] } as never}
          debtData={data.debtData}
          mortgageData={data.mortgageData}
          pensionData={data.pensionData}
          savingsData={data.savingsData}
          taxData={data.taxData}
        />
      </SampleModeProvider>
    </MemoryRouter>,
  );
  // The strip's grid of cards (absent when the prompt stands in for it); section cards below the
  // strip repeat some words, so every reading is taken inside the grid.
  const strip = [...container.querySelectorAll('[data-density="compact"]')].find((el) =>
    /each month|Income in your budget|What you owe|Pension pots/.test(el.textContent ?? ""),
  );
  const text = strip?.textContent ?? "";
  const figure = (name: string) =>
    strip?.querySelector(`[data-figure="${name}"]`)?.textContent ?? null;
  const firstLabel =
    ["Left over each month", "Short each month", "Income in your budget"].find((l) =>
      text.includes(l),
    ) ?? null;
  const secondLabel = ["What you owe", "Pension pots"].find((l) => text.includes(l)) ?? null;
  return {
    prompt: container.querySelector('[data-kpi-strip="empty"]') !== null,
    first: firstLabel,
    leftOver: figure("budget.surplus"),
    income: figure("budget.income"),
    caption: text.includes("From your budget"),
    addSpending: text.includes("Add your spending to see what is left over each month"),
    second: secondLabel,
    owed: figure("debt.total"),
    rates:
      container.querySelector('[data-testid="tax-rates-status-banner"] span')?.textContent ?? null,
  };
}

const PROMPT = {
  prompt: true,
  first: null,
  leftOver: null,
  income: null,
  caption: false,
  addSpending: false,
  second: null,
  owed: null,
  rates: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Home's strip on web (characterisation)", () => {
  it("an employee with a linked take-home row: left over from the budget", async () => {
    // Take-home 2,333 (36,000 less 1,800 pension, 4,326 tax and 1,874.40 NI is 27,999.60 a
    // year). Left over 2,333 - 950 - 250 - 90 - 150 = 893. No debt and no pension: one card.
    expect(await homeStrip({ budgetEntries: [TAKE_HOME_ROW, ...SPENDING] })).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£893",
      caption: true,
    });
  });

  it("income only: the income and the link to add spending", async () => {
    expect(await homeStrip({ budgetEntries: [INCOME] })).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Income in your budget",
      income: "£2,085",
      addSpending: true,
    });
  });

  it("zero-amount suggested rows are not spending, so it stays income only", async () => {
    expect(
      await homeStrip({
        budgetEntries: [INCOME, { ...RENT, amount: 0 }, { ...GROCERIES, amount: 0 }],
      }),
    ).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Income in your budget",
      income: "£2,085",
      addSpending: true,
    });
  });

  it("a savings row alone counts as spending", async () => {
    // 2,085 - 150 = 1,935.
    expect(await homeStrip({ budgetEntries: [INCOME, SAVINGS] })).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£1,935",
      caption: true,
    });
  });

  it("a stored amount on a line linked to a £0 monthly payment counts as spending", async () => {
    // The card's saved monthly payment is £0, so the linked line counts £0 and outgoings are 0,
    // but the row's stored 60 is a real amount: left over is 2,085 - 0 = 2,085, not income only.
    expect(
      await homeStrip({
        accounts: [CURRENT, { ...CARD, monthlyContribution: 0 }],
        budgetEntries: [
          INCOME,
          {
            id: "row-card",
            category: "debt",
            name: "Card payment",
            amount: 60,
            isEssential: true,
            linkKind: "debt",
            linkAccountId: "acc-card",
          },
        ],
      }),
    ).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£2,085",
      caption: true,
      second: "What you owe",
      owed: "£1,800",
    });
  });

  it("spending with no income row and no take-home: no left over, so the one prompt", async () => {
    // With no income row a known take-home would be added as the income, so no salary here.
    expect(
      await homeStrip({ profile: { onboardingCompleted: true }, budgetEntries: SPENDING }),
    ).toEqual(PROMPT);
  });

  it("short: the label changes", async () => {
    // 2,085 - 1,700 - 250 - 150 = -15.
    expect(
      await homeStrip({ budgetEntries: [INCOME, { ...RENT, amount: 1700 }, GROCERIES, SAVINGS] }),
    ).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Short each month",
      // The minus is drawn as a hyphen and spoken as "minus".
      leftOver: "-£15minus £15",
      caption: true,
    });
  });

  it("no budget: the one prompt", async () => {
    expect(await homeStrip({})).toEqual(PROMPT);
  });

  it("no budget hides what you owe too (one of two cards unset)", async () => {
    expect(await homeStrip({ accounts: [CURRENT, CARD, PENSION] })).toEqual(PROMPT);
  });

  it("a credit card beside a pension: what you owe, not the pension", async () => {
    // Typed income 2,085 - 950 - 250 - 90 - 150 = 645.
    expect(
      await homeStrip({ accounts: [CURRENT, CARD, PENSION], budgetEntries: [INCOME, ...SPENDING] }),
    ).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£645",
      caption: true,
      second: "What you owe",
      owed: "£1,800",
    });
  });

  it("a pension and no debt: the pension pots", async () => {
    const strip = await homeStrip({
      accounts: [CURRENT, PENSION],
      budgetEntries: [INCOME, ...SPENDING],
    });
    expect(strip).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£645",
      caption: true,
      second: "Pension pots",
    });
  });

  it("Scotland in 2027/28 with no Scottish rates: the prompt, with the provisional banner", async () => {
    expect(
      await homeStrip({
        profile: { ...EMPLOYEE, taxRegion: "SCOTLAND" },
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        today: "2027-06-01T12:00:00Z",
      }),
    ).toEqual({
      ...PROMPT,
      rates: "2027/28 rates are provisional: announced but not yet confirmed. Figures may change.",
    });
  });

  it("Plan 1 in 2027/28: the leaves-out notice replaces the caption", async () => {
    const strip = await homeStrip({
      profile: { ...EMPLOYEE, studentLoanPlans: ["PLAN_1"] },
      budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
      today: "2027-06-01T12:00:00Z",
    });
    expect(strip).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£893",
      rates: "2027/28 rates are provisional: announced but not yet confirmed. Figures may change.",
    });
  });

  it("a date after the latest supported year: the fallback banner over the figure", async () => {
    expect(
      await homeStrip({
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        today: "2028-06-01T12:00:00Z",
      }),
    ).toEqual({
      ...PROMPT,
      prompt: false,
      first: "Left over each month",
      leftOver: "£893",
      caption: true,
      rates:
        "Using 2027/28 rates. The 2028/29 rates are not in Flump yet, so figures may be out of date.",
    });
  });
});

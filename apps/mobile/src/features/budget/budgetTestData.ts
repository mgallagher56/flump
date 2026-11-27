/**
 * Tests only: the renter of `apps/e2e/support/personas.ts` as the API answers for the Budget tab
 * (E12 S10), the same rows as `packages/finance-engine/src/budget-page.parity.test.ts`'s `RENTER`
 * and the fixture server's `renter` scenario.
 */
import type { BudgetEntryListResponse } from "@flump/api-contract";
import { type BudgetSeed, type Household, household } from "../check-in/checkInTestData";

/** personas.ts `RENTER.budget`. */
export const RENTER_BUDGET: readonly BudgetSeed[] = [
  { name: "Salary after tax", category: "income", amount: 2085, isIncome: true },
  { name: "Rent", category: "housing", amount: 950, isEssential: true },
  { name: "Council tax", category: "bills", amount: 115, isEssential: true },
  { name: "Energy", category: "bills", amount: 80, isEssential: true },
  { name: "Phone and broadband", category: "bills", amount: 40, isEssential: true },
  { name: "Groceries", category: "expenses", amount: 250, isEssential: true },
  { name: "Travel", category: "expenses", amount: 120, isEssential: true },
  { name: "Eating out", category: "expenses", amount: 90 },
  { name: "Subscriptions", category: "expenses", amount: 25 },
  { name: "Everything else", category: "expenses", amount: 80 },
  { name: "Credit card payment", category: "bills", amount: 60, isEssential: true },
  { name: "Easy access savings", category: "savings", amount: 150 },
];

/** personas.ts `RENTER.profile`'s answers. */
export const RENTER_FACTS = {
  employmentType: "employed",
  annualSalary: 32000,
  monthlyTakeHome: 2085,
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  housingStatus: "renting",
  monthlyHousingCost: 950,
  pensionPercent: 5,
  isSalarySacrifice: false,
} as const;

/** The renter's household: its accounts recorded this month, its budget and its profile. */
export function renterHousehold(budget: readonly BudgetSeed[] = RENTER_BUDGET): Household {
  const h = household(
    [
      { name: "Current account", type: "Current", balance: 1300, nov: 1300 },
      {
        name: "Easy access savings",
        type: "Saving",
        balance: 3200,
        monthlyContribution: 150,
        nov: 3200,
      },
      { name: "Workplace pension", type: "Pension", balance: 9000, nov: 9000 },
      {
        name: "Credit card",
        type: "Credit Card",
        balance: -1800,
        monthlyContribution: 60,
        nov: -1800,
      },
    ],
    undefined,
    budget,
  );
  return {
    ...h,
    profile: {
      ...h.profile,
      ...RENTER_FACTS,
      studentLoanPlans: [...RENTER_FACTS.studentLoanPlans],
    },
  };
}

/** A saved row made joint (a partner's share), as the API sends it. */
export function withJoint(
  rows: BudgetEntryListResponse,
  name: string,
  sharePercent = 50,
): BudgetEntryListResponse {
  return rows.map((r) => (r.name === name ? { ...r, ownership: "joint", sharePercent } : r));
}

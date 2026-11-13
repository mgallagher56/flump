import type { RawAccountDetail } from "../../../portfolio.js";
import type { TaxRecord } from "../../../tax-calculator.js";
import { budgetEntry, taxRecord } from "../builders.js";
import type { PersonaFixture } from "../types.js";

/**
 * Heavy: the E16 journeys dataset (docs/audit/plans/E16-journeys.md). GBP 118,000 employee with
 * salary sacrifice and Plan 2 loan, GBP 400 a month side income, a home and a buy-to-let
 * (GBP 260,000, GBP 150,000 interest-only mortgage, GBP 1,200 a month rent). 17 accounts, 22
 * budget entries (GBP 7,950 income) and 28 tax records over four tax years.
 */

/** Tax years of the heavy records, with the once-a-year amounts filed in each. */
const YEARS = [
  { start: 2023, interest: 6000, insurance: 380, office: 240, savings: 410, dividends: 300 },
  { start: 2024, interest: 6250, insurance: 400, office: 240, savings: 520, dividends: 420 },
  { start: 2025, interest: 6750, insurance: 420, office: 260, savings: 690, dividends: 510 },
  { start: 2026, interest: 7000, insurance: 430, office: 260, savings: 710, dividends: 480 },
] as const;

const annualRecords: TaxRecord[] = YEARS.flatMap((y) => {
  const n = y.start;
  return [
    taxRecord({
      id: `heavy-int-${n}`,
      type: "expense",
      source: "rental",
      category: "mortgage_interest",
      name: `BTL mortgage interest ${n}/${(n + 1) % 100}`,
      amount: y.interest,
      frequency: "annual",
      date: `${n}-06-01`,
    }),
    taxRecord({
      id: `heavy-ins-${n}`,
      type: "expense",
      source: "rental",
      category: "rent_rates_insurance",
      name: `Landlord insurance ${n}/${(n + 1) % 100}`,
      amount: y.insurance,
      frequency: "annual",
      date: `${n}-09-15`,
    }),
    taxRecord({
      id: `heavy-fee-${n}`,
      type: "expense",
      source: "rental",
      category: "legal_management_fees",
      name: `Agent fees ${n}/${(n + 1) % 100}`,
      amount: 1440,
      frequency: "annual",
      date: `${n}-04-30`,
    }),
    taxRecord({
      id: `heavy-off-${n}`,
      type: "expense",
      source: "self-employed",
      category: "office_costs",
      name: `Office costs ${n}/${(n + 1) % 100}`,
      amount: y.office,
      frequency: "annual",
      date: `${n}-10-01`,
    }),
    // Dated in the January to March half, so it still files under the year starting in April n.
    taxRecord({
      id: `heavy-sav-${n}`,
      type: "income",
      source: "savings",
      category: "savings_interest",
      name: `Savings interest ${n}/${(n + 1) % 100}`,
      amount: y.savings,
      frequency: "annual",
      date: `${n + 1}-03-20`,
    }),
    taxRecord({
      id: `heavy-div-${n}`,
      type: "income",
      source: "savings",
      category: "dividend_income",
      name: `Dividends ${n}/${(n + 1) % 100}`,
      amount: y.dividends,
      frequency: "annual",
      date: `${n}-12-10`,
    }),
  ];
});

export const heavy: PersonaFixture = {
  profile: {
    annualSalary: 118000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_2"],
    pensionPercent: 8,
    isSalarySacrifice: true,
  },
  accounts: [
    { id: "heavy-current", name: "Main current", type: "Current", balance: 3850 },
    { id: "heavy-joint", name: "Joint current", type: "Current", balance: -640 },
    { id: "heavy-saver", name: "Instant saver", type: "Saving", balance: 9200, interestRate: 4.2 },
    { id: "heavy-cash-isa", name: "Cash ISA", type: "Saving", balance: 14000, interestRate: 4.5 },
    { id: "heavy-isa", name: "Stocks and shares ISA", type: "Investment", balance: 36000 },
    {
      id: "heavy-pension",
      name: "Workplace pension",
      type: "Pension",
      balance: 88000,
      monthlyContribution: 786.67,
    },
    { id: "heavy-sipp", name: "SIPP", type: "Pension", balance: 34000, monthlyContribution: 400 },
    { id: "heavy-home", name: "Home", type: "Property", balance: 380000 },
    { id: "heavy-btl", name: "Buy-to-let flat", type: "Property", balance: 260000 },
    {
      id: "heavy-home-mortgage",
      name: "Home mortgage",
      type: "Mortgage",
      balance: 205000,
      interestRate: 4.2,
      termMonths: 240,
      monthlyContribution: 1150,
    },
    {
      id: "heavy-btl-mortgage",
      name: "BTL interest-only mortgage",
      type: "Mortgage",
      balance: 150000,
      interestRate: 4.5,
      monthlyContribution: 560,
    },
    {
      id: "heavy-pcp",
      name: "Car PCP",
      type: "Loan",
      balance: 9800,
      interestRate: 7.9,
      monthlyContribution: 265,
    },
    { id: "heavy-student-loan", name: "Student loan Plan 2", type: "Student Loan", balance: 38200 },
    {
      id: "heavy-card-a",
      name: "Card A",
      type: "Credit Card",
      balance: 2300,
      interestRate: 22.9,
      monthlyContribution: 70,
    },
    {
      id: "heavy-card-b",
      name: "Card B (0% balance transfer)",
      type: "Credit Card",
      balance: 4000,
      interestRate: 0,
      monthlyContribution: 50,
    },
    {
      id: "heavy-overdraft",
      name: "Arranged overdraft",
      type: "Overdraft",
      balance: 700,
      interestRate: 39.9,
    },
    { id: "heavy-owed", name: "Owed by my brother", type: "Owed", balance: 1500 },
  ],
  details: [
    // Main current: gaps in Jul, Sep and Oct carry forward. The first Aug row is replaced by the
    // second (a later row for the same account and month wins).
    { accountId: "heavy-current", year: 2026, month: 6, value: 3000 },
    { accountId: "heavy-current", year: 2026, month: 8, value: 3100 },
    { accountId: "heavy-current", year: 2026, month: 8, value: 3400 },
    { accountId: "heavy-current", year: 2026, month: 11, value: 3850 },
    // Instant saver.
    { accountId: "heavy-saver", year: 2026, month: 6, value: 8000 },
    { accountId: "heavy-saver", year: 2026, month: 9, value: 9200 },
    // SIPP: first row in July, so June has nothing before it.
    { accountId: "heavy-sipp", year: 2026, month: 7, value: 30000 },
    { accountId: "heavy-sipp", year: 2026, month: 10, value: 34000 },
    // Home mortgage (liability).
    { accountId: "heavy-home-mortgage", year: 2026, month: 6, value: 207000 },
    { accountId: "heavy-home-mortgage", year: 2026, month: 9, value: 205000 },
    // Overdrawn joint account: a negative asset counts as a liability.
    { accountId: "heavy-joint", year: 2026, month: 6, value: -300 },
    { accountId: "heavy-joint", year: 2026, month: 10, value: -640 },
    // Student loan history is never part of net worth history.
    { accountId: "heavy-student-loan", year: 2026, month: 6, value: 39000 },
  ] satisfies RawAccountDetail[],
  budget: [
    budgetEntry("heavy-b01", "income", "Salary (net)", 6350, { isIncome: true }),
    budgetEntry("heavy-b02", "income", "Side income", 400, { isIncome: true }),
    budgetEntry("heavy-b03", "income", "Rent received", 1200, { isIncome: true }),
    budgetEntry("heavy-b04", "housing", "Home mortgage", 1150, { isEssential: true }),
    budgetEntry("heavy-b05", "housing", "BTL mortgage interest", 560, { isEssential: true }),
    budgetEntry("heavy-b06", "housing", "Council tax", 190, { isEssential: true }),
    budgetEntry("heavy-b07", "bills", "Energy", 140, { isEssential: true }),
    budgetEntry("heavy-b08", "bills", "Water", 45, { isEssential: true }),
    budgetEntry("heavy-b09", "bills", "Broadband", 35, { isEssential: true }),
    budgetEntry("heavy-b10", "bills", "Mobile", 30, { isEssential: true }),
    budgetEntry("heavy-b11", "food", "Groceries", 520, { isEssential: true }),
    budgetEntry("heavy-b12", "transport", "Car PCP", 265, { isEssential: true }),
    budgetEntry("heavy-b13", "transport", "Car insurance", 70, { isEssential: true }),
    budgetEntry("heavy-b14", "transport", "Fuel", 120, { isEssential: true }),
    budgetEntry("heavy-b15", "debt", "Card payments", 120, { isEssential: true }),
    budgetEntry("heavy-b16", "savings", "ISA", 500),
    budgetEntry("heavy-b17", "savings", "SIPP", 400),
    budgetEntry("heavy-b18", "leisure", "Holidays", 250),
    budgetEntry("heavy-b19", "leisure", "Eating out", 220),
    budgetEntry("heavy-b20", "leisure", "Subscriptions", 55),
    budgetEntry("heavy-b21", "leisure", "Gym", 45),
    budgetEntry("heavy-b22", "leisure", "Clothing", 80),
  ],
  taxRecords: [
    // Monthly rent and side income run from April 2023 with no end date: every month of all four years.
    taxRecord({
      id: "heavy-rent",
      type: "income",
      source: "rental",
      category: "rental_income",
      name: "Rent",
      amount: 1200,
      date: "2023-04-01",
    }),
    taxRecord({
      id: "heavy-side",
      type: "income",
      source: "self-employed",
      category: "self_employed_income",
      name: "Side income",
      amount: 400,
      date: "2023-04-01",
    }),
    ...annualRecords,
    taxRecord({
      id: "heavy-repair-2023",
      type: "expense",
      source: "rental",
      category: "repairs_maintenance",
      name: "Roof repair",
      amount: 1150,
      frequency: "one-off",
      date: "2024-02-12",
    }),
    taxRecord({
      id: "heavy-repair-2025",
      type: "expense",
      source: "rental",
      category: "repairs_maintenance",
      name: "Boiler repair",
      amount: 890,
      frequency: "one-off",
      date: "2025-10-03",
    }),
  ],
};

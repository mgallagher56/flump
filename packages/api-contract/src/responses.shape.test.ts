import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { AccountDetailDto, AccountWithDetailsDto } from "./domains/accounts.js";
import { UserProfileResponse } from "./domains/profile.js";

/**
 * System audit slice 9: a pinned list of the fields the profile and account reads return. Each
 * column the plan drops leaves these lists in its own pull request, so a field disappearing (or a
 * new one appearing) is a reviewed change to this snapshot, never a side effect.
 */
const keys = (schema: { shape: z.ZodRawShape }): string[] => Object.keys(schema.shape).sort();

describe("response shapes", () => {
  it("GET /user-profile", () => {
    expect(keys(UserProfileResponse)).toMatchInlineSnapshot(`
      [
        "annualSalary",
        "avatarUrl",
        "birthYear",
        "buyToLetCount",
        "buyToLetMonthlyRental",
        "buyToLetMortgageBalance",
        "buyToLetMortgageRate",
        "buyToLetMortgageType",
        "buyToLetPropertyValue",
        "checkInDay",
        "country",
        "createdAt",
        "currency",
        "customBudgetCategories",
        "dashboardWidgetConfig",
        "dashboardWidgetOrder",
        "dashboardWidgetSizes",
        "dashboardWidgets",
        "displayName",
        "email",
        "employmentType",
        "enabledPages",
        "firstName",
        "hasBuyToLet",
        "hasMortgage",
        "hasRentalIncome",
        "hasResetFinancialData",
        "hasSecondIncome",
        "housingStatus",
        "id",
        "isSalarySacrifice",
        "isSalarySacrificeEmployerNi",
        "lastName",
        "monthlyHousingCost",
        "monthlyOtherOutgoings",
        "monthlySavingsTarget",
        "monthlyTakeHome",
        "mortgageType",
        "netWorthCountsProperty",
        "netWorthCountsStudentLoan",
        "onboardingCompleted",
        "pensionEmployerPercent",
        "pensionPercent",
        "propertyOwnershipShare",
        "rentalIncomeMonthly",
        "savingsAllocationMode",
        "savingsDefaultInterestRate",
        "secondIncomeMonthly",
        "setupChecklistCompletedSteps",
        "studentLoanPlans",
        "taxRegion",
        "updatedAt",
        "userId",
      ]
    `);
  });

  it("GET /accounts, one account", () => {
    expect(keys(AccountWithDetailsDto)).toMatchInlineSnapshot(`
      [
        "accountSubtype",
        "balance",
        "connectionId",
        "createdAt",
        "creditLimit",
        "currency",
        "details",
        "fixedRateEndDate",
        "id",
        "interestRate",
        "isCurrent",
        "linkedAccountId",
        "monthlyContribution",
        "name",
        "ownership",
        "promoZeroPercentUntil",
        "repaymentType",
        "sharePercent",
        "studentLoanPlan",
        "termMonths",
        "type",
        "updatedAt",
      ]
    `);
  });

  it("GET /accounts, one month of an account's history", () => {
    expect(keys(AccountDetailDto)).toMatchInlineSnapshot(`
      [
        "accountId",
        "asOfDate",
        "id",
        "importBatchId",
        "month",
        "source",
        "updatedAt",
        "userId",
        "value",
        "year",
      ]
    `);
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildOnboardingSeedJobs } from "~/services/onboarding-seed";
import { missingWizardCommonItems, WIZARD_COMMON_ITEMS } from "./wizardCommonItems";

const labels = (items: ReadonlyArray<{ label: string }>) => items.map((item) => item.label);

/** The budget rows onboarding saves for a renter paying £900 with £400 of other spending. */
const onboardingSeedRows = () =>
  buildOnboardingSeedJobs({
    cash: 0,
    pensionPot: 0,
    mortgageBalance: 0,
    propertyValue: 0,
    unsecuredDebt: 0,
    monthlyTakeHome: 2500,
    housingStatus: "renting",
    monthlyHousing: 900,
    otherOutgoings: 400,
  })
    .filter((job) => job.endpoint === "/budget-entries")
    .map((job) => job.payload as { name: string; category: string; isIncome: boolean });

describe("missingWizardCommonItems", () => {
  it("offers all six common items to a budget with none of them", () => {
    expect(labels(missingWizardCommonItems([]))).toEqual([
      "Rent or mortgage",
      "Council tax",
      "Gas and electricity",
      "Water",
      "Broadband",
      "Groceries",
    ]);
  });

  it("leaves out the housing row onboarding saved, so rent is never added twice", () => {
    const seed = onboardingSeedRows();
    // Take-home, "Rent Payment" and "General living and outgoings".
    expect(seed.map((row) => row.name)).toEqual([
      "Monthly Take-Home Income",
      "Rent Payment",
      "General living and outgoings",
    ]);
    expect(labels(missingWizardCommonItems(seed))).toEqual([
      "Council tax",
      "Gas and electricity",
      "Water",
      "Broadband",
      "Groceries",
    ]);
  });

  it.each([["Mortgage Payment"], ["Household contribution"]])(
    "counts the seed's %s as the rent or mortgage item",
    (name) => {
      expect(labels(missingWizardCommonItems([{ name, category: "housing" }]))).not.toContain(
        "Rent or mortgage",
      );
    },
  );

  it("offers nothing once the budget has every common item, under any synonym", () => {
    const entries = [
      { name: "Rent", category: "housing" },
      { name: "Council tax", category: "bills" },
      { name: "Energy", category: "bills" },
      { name: "Water", category: "bills" },
      { name: "Phone and broadband", category: "bills" },
      { name: "Food shop", category: "expenses" },
    ];
    expect(missingWizardCommonItems(entries)).toEqual([]);
  });

  it.each([
    ["Rent or mortgage", "housing", ["Rent", "Mortgage", "Mortgage payment", "Rent payment"]],
    ["Council tax", "bills", ["Council tax bill", "Council Tax", "council TAX"]],
    [
      "Gas and electricity",
      "bills",
      ["Energy", "Gas", "Electricity", "Gas and electricity", "Gas & Electricity", "Energy bill"],
    ],
    ["Water", "bills", ["Water bill", "Water rates", "  water  "]],
    [
      "Broadband",
      "bills",
      ["Internet", "Broadband and phone", "Broadband & phone", "Wi-Fi", "WiFi"],
    ],
    ["Groceries", "expenses", ["Food shop", "Food", "Food shopping", "Supermarket"]],
  ])("counts everyday names for %s as that item", (label, category, names) => {
    for (const name of names) {
      expect(labels(missingWizardCommonItems([{ name, category }]))).not.toContain(label);
    }
  });

  it("matches the whole name only, so a longer name is not read as a common item", () => {
    const entries = [
      { name: "Rent for parking", category: "housing" },
      { name: "Water softener", category: "bills" },
      { name: "Supermarket loyalty", category: "expenses" },
      { name: "Wi-Fi extender", category: "bills" },
    ];
    expect(labels(missingWizardCommonItems(entries))).toEqual([
      "Rent or mortgage",
      "Council tax",
      "Gas and electricity",
      "Water",
      "Broadband",
      "Groceries",
    ]);
  });

  it("adds names only: every item starts at £0, monthly, so no invented figure reaches a total", () => {
    for (const { entry } of WIZARD_COMMON_ITEMS) {
      expect(entry.amount).toBe(0);
      expect(entry.frequency).toBe("monthly");
      expect(entry.isIncome).toBe(false);
    }
  });
});

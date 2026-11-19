// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildOnboardingSeedJobs, type OnboardingSeedInput } from "./onboarding-seed";

const input: OnboardingSeedInput = {
  cash: 4000,
  pensionPot: 25000,
  mortgageBalance: 180000,
  unsecuredDebt: 2500,
  monthlyTakeHome: 3200,
  housingStatus: "mortgage",
  monthlyHousing: 1100,
  otherOutgoings: 900,
};

describe("buildOnboardingSeedJobs", () => {
  it("builds every account and budget entry with stable keys", () => {
    const jobs = buildOnboardingSeedJobs(input);

    expect(jobs.map((j) => j.key)).toEqual([
      "account:Cash and emergency savings",
      "account:Workplace and personal pension",
      "account:Residential Mortgage",
      "account:Cards and loans baseline",
      "entry:Monthly Take-Home Income",
      "entry:Mortgage Payment",
      "entry:General living and outgoings",
    ]);
    expect(jobs.every((j) => j.enabled)).toBe(true);
  });

  it("sends budget entries with `name`, never `title`, and accounts with isCurrent", () => {
    const jobs = buildOnboardingSeedJobs(input);
    for (const job of jobs.filter((j) => j.endpoint === "/budget-entries")) {
      expect(job.payload).toHaveProperty("name");
      expect(job.payload).not.toHaveProperty("title");
      expect(job.payload).toMatchObject({ frequency: "monthly" });
    }
    expect(jobs[0].payload).toEqual({
      name: "Cash and emergency savings",
      type: "Saving",
      balance: 4000,
      isCurrent: true,
    });
  });

  it("disables zero-value jobs and omits optional ones", () => {
    const jobs = buildOnboardingSeedJobs({
      ...input,
      cash: 0,
      mortgageBalance: 0,
      unsecuredDebt: 0,
      monthlyHousing: 0,
      otherOutgoings: 0,
      housingStatus: "renting",
    });

    expect(jobs.find((j) => j.key === "account:Cash and emergency savings")?.enabled).toBe(false);
    expect(jobs.some((j) => j.key.includes("Mortgage") || j.key.includes("Cards"))).toBe(false);
    expect(jobs.filter((j) => j.enabled).map((j) => j.key)).toEqual([
      "account:Workplace and personal pension",
      "entry:Monthly Take-Home Income",
    ]);
  });

  it("saves the home estimate as a Property account, only for an owner (E16 D3)", () => {
    const outright = buildOnboardingSeedJobs({
      ...input,
      housingStatus: "own_outright",
      mortgageBalance: 0,
      propertyValue: 310000,
    });
    const home = outright.find((j) => j.key === "account:Home (your estimate)");
    expect(home?.payload).toEqual({
      name: "Home (your estimate)",
      type: "Property",
      accountSubtype: "home",
      balance: 310000,
      isCurrent: true,
    });
    expect(home?.enabled).toBe(true);
    const renter = buildOnboardingSeedJobs({
      ...input,
      housingStatus: "renting",
      propertyValue: 310000,
    });
    expect(renter.some((j) => j.key === "account:Home (your estimate)")).toBe(false);
    expect(renter.some((j) => j.endpoint === "/accounts/mortgage-with-property")).toBe(false);
    expect(
      buildOnboardingSeedJobs(input).some((j) => j.key === "account:Home (your estimate)"),
    ).toBe(false);
  });

  it("seeds a mortgage and a home as one linked pair, keyed by the mortgage (slice 4)", () => {
    const jobs = buildOnboardingSeedJobs({ ...input, propertyValue: 310000 });
    const pairs = jobs.filter((j) => j.endpoint === "/accounts/mortgage-with-property");
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({
      key: "account:Residential Mortgage",
      endpoint: "/accounts/mortgage-with-property",
      payload: {
        mortgage: {
          name: "Residential Mortgage",
          accountSubtype: "residential_mortgage",
          balance: 180000,
          isCurrent: true,
        },
        property: { name: "Home (your estimate)", balance: 310000 },
      },
      enabled: true,
    });
    // No separate home or mortgage job beside it, so nothing is created twice.
    expect(jobs.filter((j) => j.endpoint === "/accounts").map((j) => j.key)).toEqual([
      "account:Cash and emergency savings",
      "account:Workplace and personal pension",
      "account:Cards and loans baseline",
    ]);
  });

  it("names the housing entry after the housing status", () => {
    const renting = buildOnboardingSeedJobs({ ...input, housingStatus: "renting" });
    expect(renting.some((j) => j.key === "entry:Rent Payment")).toBe(true);
    const family = buildOnboardingSeedJobs({
      ...input,
      housingStatus: "living_with_family",
      propertyValue: 250000,
      mortgageBalance: 0,
    });
    expect(family.some((j) => j.key === "entry:Household contribution")).toBe(true);
    expect(
      family.some(
        (j) => j.endpoint === "/accounts/mortgage-with-property" || j.payload.type === "Property",
      ),
    ).toBe(false);
  });

  it("names no housing entry as rent when housing is not answered", () => {
    const unset = buildOnboardingSeedJobs({ ...input, housingStatus: null });
    expect(
      unset.some((j) => j.endpoint === "/budget-entries" && j.payload.category === "housing"),
    ).toBe(false);
  });

  // Audit slice 5: the housing line is linked to the saved housing payment (the profile figure
  // onboarding saves, or the mortgage account's payment once saved), not a copy of it.
  it("creates the housing line linked to the saved housing payment, storing no amount", () => {
    for (const housingStatus of ["renting", "mortgage", "living_with_family"] as const) {
      const job = buildOnboardingSeedJobs({ ...input, housingStatus, monthlyHousing: 950 }).find(
        (j) => j.endpoint === "/budget-entries" && j.payload.category === "housing",
      );
      expect(job?.payload).toMatchObject({ category: "housing", amount: 0, linkKind: "housing" });
      expect(job?.enabled).toBe(true);
    }
  });
});

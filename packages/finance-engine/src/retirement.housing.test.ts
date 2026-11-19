import { describe, expect, it } from "vitest";
import { resolveRetirementHousing } from "./retirement.js";

/** Annual costs from a schedule, in order. */
const annualCosts = (result: ReturnType<typeof resolveRetirementHousing>) =>
  result.yearlySchedule.map((p) => p.annualCostGbp);

describe("Retirement housing: saved status", () => {
  it("own outright costs nothing even with a saved monthly figure, with a zero schedule", () => {
    const housing = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "own_outright",
      monthlyHousingCostGbp: 500,
    });
    expect(housing.kind).toBe("own-outright");
    expect(housing.overridden).toBe(false);
    expect(housing.annualCostAtRetirementGbp).toBe(0);
    expect(housing.mortgageEndAge).toBeNull();
    expect(housing.yearlySchedule).toEqual([
      { age: 65, yearOfRetirement: 1, annualCostGbp: 0 },
      { age: 66, yearOfRetirement: 2, annualCostGbp: 0 },
    ]);
  });

  it("living with family keeps the saved figure, even when it is £0", () => {
    const housing = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "living_with_family",
      monthlyHousingCostGbp: 0,
    });
    expect(housing.kind).toBe("custom");
    expect(housing.overridden).toBe(false);
  });

  it("no status and no saved figure is treated as owning outright", () => {
    const housing = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 67,
    });
    expect(housing.kind).toBe("own-outright");
    expect(housing.overridden).toBe(false);
  });

  it("no status with a saved figure keeps it flat for every year of retirement", () => {
    const housing = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 68,
      monthlyHousingCostGbp: 250,
    });
    // £250 × 12 = £3,000 a year for 3 years = £9,000.
    expect(housing.kind).toBe("custom");
    expect(housing.overridden).toBe(false);
    expect(housing.monthlyCostAtRetirementGbp).toBe(250);
    expect(housing.averageAnnualCostGbp).toBe(3_000);
    expect(housing.totalRetirementHousingCostGbp).toBe(9_000);
    expect(housing.yearlySchedule).toEqual([
      { age: 65, yearOfRetirement: 1, annualCostGbp: 3_000 },
      { age: 66, yearOfRetirement: 2, annualCostGbp: 3_000 },
      { age: 67, yearOfRetirement: 3, annualCostGbp: 3_000 },
    ]);
  });

  it("a mortgage with no saved details uses the saved monthly payment, or nothing without one", () => {
    const withPayment = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "mortgage",
      monthlyHousingCostGbp: 900,
    });
    expect(withPayment.kind).toBe("custom");
    expect(withPayment.overridden).toBe(false);
    // £900 × 12 = £10,800.
    expect(withPayment.annualCostAtRetirementGbp).toBe(10_800);

    const withoutPayment = resolveRetirementHousing({
      currentAge: 60,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "mortgage",
    });
    expect(withoutPayment.kind).toBe("own-outright");
    expect(withoutPayment.overridden).toBe(false);
  });
});

describe("Retirement housing: rent", () => {
  it("rent with no growth rate given grows with inflation, so it is flat in today's prices", () => {
    const housing = resolveRetirementHousing({
      currentAge: 65,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "renting",
      monthlyHousingCostGbp: 1_000,
    });
    expect(housing.kind).toBe("rent-for-life");
    expect(housing.overridden).toBe(false);
    // £1,000 × 12 = £12,000 each year.
    expect(annualCosts(housing)).toEqual([12_000, 12_000]);
  });

  it("real rent growth compounds from today, not from the retirement age", () => {
    const housing = resolveRetirementHousing({
      currentAge: 63,
      retirementAge: 65,
      planToAge: 67,
      housingStatus: "renting",
      monthlyHousingCostGbp: 1_000,
      realRentGrowthRate: 0.1,
    });
    // Age 65 is 2 years away: 12,000 × 1.1² = 14,520. Age 66: 12,000 × 1.1³ = 15,972.
    // Monthly at retirement 14,520 ÷ 12 = 1,210. Total 30,492; average 15,246.
    expect(housing.yearlySchedule).toEqual([
      { age: 65, yearOfRetirement: 1, annualCostGbp: 14_520 },
      { age: 66, yearOfRetirement: 2, annualCostGbp: 15_972 },
    ]);
    expect(housing.annualCostAtRetirementGbp).toBe(14_520);
    expect(housing.monthlyCostAtRetirementGbp).toBe(1_210);
    expect(housing.totalRetirementHousingCostGbp).toBe(30_492);
    expect(housing.averageAnnualCostGbp).toBe(15_246);
  });
});

describe("Retirement housing: overrides", () => {
  const renting = {
    currentAge: 64,
    retirementAge: 65,
    planToAge: 66,
    housingStatus: "renting" as const,
    monthlyHousingCostGbp: 1_000,
  };

  it("an own-outright override replaces saved rent", () => {
    const housing = resolveRetirementHousing({ ...renting, override: { kind: "own-outright" } });
    expect(housing.kind).toBe("own-outright");
    expect(housing.overridden).toBe(true);
    expect(housing.annualCostAtRetirementGbp).toBe(0);
    expect(housing.mortgageEndAge).toBeNull();
  });

  it("a mortgage-ends override replaces saved rent and ends at the retirement age", () => {
    const housing = resolveRetirementHousing({
      ...renting,
      override: { kind: "mortgage-ends-before-retirement" },
    });
    expect(housing.kind).toBe("mortgage-ends-before-retirement");
    expect(housing.overridden).toBe(true);
    expect(housing.annualCostAtRetirementGbp).toBe(0);
    expect(housing.mortgageEndAge).toBe(65);
  });

  it("a custom override replaces saved rent", () => {
    const housing = resolveRetirementHousing({
      ...renting,
      override: { kind: "custom", monthlyAmountGbp: 400 },
    });
    // £400 × 12 = £4,800.
    expect(housing.kind).toBe("custom");
    expect(housing.overridden).toBe(true);
    expect(housing.annualCostAtRetirementGbp).toBe(4_800);
  });

  it("a rent override with no growth rate uses the plan's rent growth rate", () => {
    const housing = resolveRetirementHousing({
      ...renting,
      realRentGrowthRate: 0.1,
      override: { kind: "rent-for-life", monthlyRentGbp: 1_000 },
    });
    // 1 year away at 10% real: 12,000 × 1.1 = 13,200.
    expect(housing.overridden).toBe(true);
    expect(housing.annualCostAtRetirementGbp).toBe(13_200);
  });

  it("a rent override's own growth rate wins over the plan's", () => {
    const housing = resolveRetirementHousing({
      ...renting,
      realRentGrowthRate: 0,
      override: { kind: "rent-for-life", monthlyRentGbp: 1_000, realRentGrowthRate: 0.1 },
    });
    // 12,000 × 1.1 = 13,200.
    expect(housing.annualCostAtRetirementGbp).toBe(13_200);
  });

  it("a continuing-mortgage override with no years left ends at the retirement age", () => {
    const housing = resolveRetirementHousing({
      ...renting,
      override: {
        kind: "mortgage-continues",
        monthlyPaymentGbp: 600,
        remainingYearsInRetirement: 0,
      },
    });
    expect(housing.kind).toBe("mortgage-ends-before-retirement");
    expect(housing.overridden).toBe(true);
    expect(housing.mortgageEndAge).toBe(65);
  });

  it("a continuing-mortgage override runs for the typed years from the retirement age", () => {
    const housing = resolveRetirementHousing({
      currentAge: 65,
      retirementAge: 65,
      planToAge: 80,
      inflationRate: 0,
      override: {
        kind: "mortgage-continues",
        monthlyPaymentGbp: 600,
        remainingYearsInRetirement: 10,
      },
    });
    // 10 years from 65 ends at 75. With 0% inflation each of those years costs 600 × 12 = 7,200,
    // and the 5 years after cost nothing.
    expect(housing.kind).toBe("mortgage-continues");
    expect(housing.overridden).toBe(true);
    expect(housing.mortgageEndAge).toBe(75);
    expect(housing.mortgageYearsInRetirement).toBe(10);
    expect(annualCosts(housing)).toEqual([...Array(10).fill(7_200), ...Array(5).fill(0)]);
  });
});

describe("Retirement housing: saved mortgage details", () => {
  // Retire today so the first retirement year is not deflated, plan for 3 years.
  const base = {
    currentAge: 60,
    retirementAge: 60,
    planToAge: 63,
    housingStatus: "mortgage" as const,
  };

  it("uses the saved monthly payment over the saved term", () => {
    const housing = resolveRetirementHousing({
      ...base,
      inflationRate: 0,
      mortgage: {
        remainingTermMonths: 24,
        monthlyPaymentGbp: 700,
        balanceGbp: 12_000,
        interestRateApr: 0,
      },
    });
    // The saved £700 wins over the £12,000 ÷ 24 = £500 it would work out.
    // 24 months: 700 × 12 = 8,400 in years 1 and 2, nothing in year 3. Ends at 60 + 2 = 62.
    expect(housing.kind).toBe("mortgage-continues");
    expect(housing.overridden).toBe(false);
    expect(housing.monthlyCostAtRetirementGbp).toBe(700);
    expect(housing.mortgageEndAge).toBe(62);
    expect(housing.mortgageYearsInRetirement).toBe(2);
    expect(housing.yearlySchedule).toEqual([
      { age: 60, yearOfRetirement: 1, annualCostGbp: 8_400 },
      { age: 61, yearOfRetirement: 2, annualCostGbp: 8_400 },
      { age: 62, yearOfRetirement: 3, annualCostGbp: 0 },
    ]);
    // 8,400 × 2 = 16,800; ÷ 3 years = 5,600.
    expect(housing.totalRetirementHousingCostGbp).toBe(16_800);
    expect(housing.averageAnnualCostGbp).toBe(5_600);
  });

  it("works out the payment from balance and rate when no payment is saved (0% here)", () => {
    const housing = resolveRetirementHousing({
      ...base,
      inflationRate: 0,
      mortgage: {
        remainingTermMonths: 24,
        monthlyPaymentGbp: 0,
        balanceGbp: 12_000,
        interestRateApr: 0,
      },
    });
    // At 0%: 12,000 ÷ 24 = £500 a month, so 6,000 in each of years 1 and 2.
    expect(housing.kind).toBe("mortgage-continues");
    expect(annualCosts(housing)).toEqual([6_000, 6_000, 0]);
  });

  it("does not work out a payment from a negative rate, and uses the saved payment instead", () => {
    const housing = resolveRetirementHousing({
      ...base,
      monthlyHousingCostGbp: 300,
      mortgage: { remainingTermMonths: 24, balanceGbp: 12_000, interestRateApr: -1 },
    });
    expect(housing.kind).toBe("custom");
    expect(housing.overridden).toBe(false);
    expect(housing.monthlyCostAtRetirementGbp).toBe(300);
  });

  it("uses the saved payment when the worked-out payment rounds to nothing", () => {
    const housing = resolveRetirementHousing({
      ...base,
      monthlyHousingCostGbp: 300,
      // 0.004 ÷ 120 is far below a penny a month, so it rounds to £0.
      mortgage: { remainingTermMonths: 120, balanceGbp: 0.004, interestRateApr: 0 },
    });
    expect(housing.kind).toBe("custom");
    expect(housing.monthlyCostAtRetirementGbp).toBe(300);
  });

  it("works out the months left from balance and payment at 0% when no term is saved", () => {
    const housing = resolveRetirementHousing({
      ...base,
      inflationRate: 0,
      mortgage: { balanceGbp: 12_000, monthlyPaymentGbp: 1_000, interestRateApr: 0 },
    });
    // 12,000 ÷ 1,000 = 12 months: 12,000 in year 1, then nothing. Ends at 60 + 1 = 61.
    expect(housing.kind).toBe("mortgage-continues");
    expect(housing.mortgageEndAge).toBe(61);
    expect(housing.mortgageYearsInRetirement).toBe(1);
    expect(annualCosts(housing)).toEqual([12_000, 0, 0]);
  });

  it("uses the saved payment when there is no balance left to work months from", () => {
    const housing = resolveRetirementHousing({
      ...base,
      monthlyHousingCostGbp: 400,
      mortgage: { balanceGbp: 0, monthlyPaymentGbp: 500, interestRateApr: 3 },
    });
    expect(housing.kind).toBe("custom");
    expect(housing.monthlyCostAtRetirementGbp).toBe(400);
  });

  it("does not work out months from a negative rate", () => {
    const housing = resolveRetirementHousing({
      ...base,
      monthlyHousingCostGbp: 400,
      mortgage: { balanceGbp: 12_000, monthlyPaymentGbp: 1_000, interestRateApr: -12 },
    });
    expect(housing.kind).toBe("custom");
    expect(housing.monthlyCostAtRetirementGbp).toBe(400);
  });

  it("uses the saved payment when the mortgage payment only covers the interest", () => {
    const housing = resolveRetirementHousing({
      ...base,
      monthlyHousingCostGbp: 350,
      // 6% a year is 0.5% a month: 100,000 × 0.005 = £500 interest, the whole payment.
      mortgage: { balanceGbp: 100_000, monthlyPaymentGbp: 500, interestRateApr: 6 },
    });
    expect(housing.kind).toBe("custom");
    expect(housing.monthlyCostAtRetirementGbp).toBe(350);
  });

  it("stops counting months at 100 years when the balance would take longer to clear", () => {
    const housing = resolveRetirementHousing({
      currentAge: 30,
      retirementAge: 65,
      planToAge: 90,
      housingStatus: "mortgage",
      inflationRate: 0,
      // At 0%, 1,000,000 ÷ 100 = 10,000 months, capped at 1,200 months (100 years).
      mortgage: { balanceGbp: 1_000_000, monthlyPaymentGbp: 100, interestRateApr: 0 },
    });
    // Ends at 30 + 100 = 130. Months in retirement 1,200 − 35 × 12 = 780, which is 65 years.
    expect(housing.mortgageEndAge).toBe(130);
    expect(housing.mortgageYearsInRetirement).toBe(65);
    // Every one of the 25 retirement years has 12 payments of £100 = £1,200.
    expect(annualCosts(housing)).toEqual(Array(25).fill(1_200));
  });

  it("a mortgage ending exactly at the retirement age ends before retirement", () => {
    const housing = resolveRetirementHousing({
      currentAge: 55,
      retirementAge: 65,
      planToAge: 90,
      housingStatus: "mortgage",
      // 120 months from 55 is exactly 10 years, ending at 65.
      mortgage: { remainingTermMonths: 120, monthlyPaymentGbp: 800 },
    });
    expect(housing.kind).toBe("mortgage-ends-before-retirement");
    expect(housing.overridden).toBe(false);
    expect(housing.mortgageEndAge).toBe(65);
    expect(housing.annualCostAtRetirementGbp).toBe(0);
  });
});

describe("Retirement housing: inflation rate for a fixed mortgage payment", () => {
  const mortgage = {
    currentAge: 60,
    retirementAge: 60,
    planToAge: 63,
    housingStatus: "mortgage" as const,
    mortgage: { remainingTermMonths: 24, monthlyPaymentGbp: 700 },
  };

  it("uses 2% when the inflation rate is -100% or below, or not finite", () => {
    // 700 × 12 = 8,400 in year 1 (today). Year 2 is 1 year away: 8,400 ÷ 1.02 = 8,235.29.
    for (const inflationRate of [-1, -2, Number.POSITIVE_INFINITY, Number.NaN]) {
      const housing = resolveRetirementHousing({ ...mortgage, inflationRate });
      expect(annualCosts(housing)).toEqual([8_400, 8_235.29, 0]);
    }
  });

  it("uses a typed inflation rate of 0%, so the payment stays at its pounds", () => {
    const housing = resolveRetirementHousing({ ...mortgage, inflationRate: 0 });
    expect(annualCosts(housing)).toEqual([8_400, 8_400, 0]);
  });
});

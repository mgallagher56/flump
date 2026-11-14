import { describe, expect, it } from "vitest";
import { calculateMonthlyMortgagePayment } from "../../mortgage.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import {
  fixedRateEnd,
  MORTGAGE_ESTIMATE_NOTE,
  selectFixedRateEnds,
  selectHousingCost,
} from "./housing-cost.js";
import type { TakeHome } from "./take-home.js";

const facts = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  annualSalary: 40000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
  housingStatus: null,
  monthlyHousingCost: null,
  mortgageType: null,
  ...over,
});

const takeHome = (monthly: number): Figure<TakeHome> =>
  figureKnown<TakeHome>({
    monthly,
    annual: monthly * 12,
    incomeTax: 0,
    nationalInsurance: 0,
    studentLoan: 0,
    pension: 0,
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
  });

const run = (profile: ProfileFacts, th: Figure<TakeHome>, accounts: RawAccount[] = []) =>
  selectHousingCost(profile, th, new PortfolioSnapshot(accounts, []), accounts);

const mortgage = (over: Partial<RawAccount> = {}): RawAccount => ({
  id: "m1",
  name: "Home mortgage",
  type: "Mortgage",
  balance: 200000,
  interestRate: 4.5,
  termMonths: 300,
  ...over,
});

describe("selectHousingCost: renting", () => {
  it("uses the saved monthly rent and its share of take-home, to one decimal place", () => {
    const fig = run(facts({ housingStatus: "renting", monthlyHousingCost: 900 }), takeHome(2700));
    expect(fig).toEqual({
      status: "known",
      provenance: "user",
      value: {
        kind: "rent",
        monthly: 900,
        takeHomeMonthly: 2700,
        sharePct: 33.3,
        paymentEstimated: false,
      },
    });
  });

  it("is unknown without a saved rent, never a share of 0", () => {
    for (const cost of [null, 0, -50]) {
      const fig = run(
        facts({ housingStatus: "renting", monthlyHousingCost: cost }),
        takeHome(2700),
      );
      expect(fig).toEqual(figureUnknown(["monthlyHousingCost"], "not-set"));
    }
  });
});

describe("selectHousingCost: mortgage", () => {
  it("estimates a repayment payment from the stored balance, rate and term", () => {
    const fig = run(facts({ housingStatus: "mortgage" }), takeHome(3000), [mortgage()]);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    const expected = calculateMonthlyMortgagePayment(200000, 4.5, 300);
    expect(fig.value).toEqual({
      kind: "mortgage",
      monthly: expected,
      takeHomeMonthly: 3000,
      sharePct: Math.round((expected / 3000) * 1000) / 10,
      paymentEstimated: true,
    });
    expect(fig.provenance).toBe("assumption");
    expect(fig.assumptions).toEqual([MORTGAGE_ESTIMATE_NOTE]);
  });

  it("sums every complete mortgage account and ignores other account types", () => {
    const accounts = [
      mortgage(),
      mortgage({ id: "m2", balance: 50000, interestRate: 5, termMonths: 120 }),
      { id: "c", name: "Card", type: "Credit Card", balance: 400, interestRate: 20 },
    ];
    const fig = run(facts({ housingStatus: "mortgage" }), takeHome(4000), accounts);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    const expected =
      calculateMonthlyMortgagePayment(200000, 4.5, 300) +
      calculateMonthlyMortgagePayment(50000, 5, 120);
    expect(fig.value.monthly).toBeCloseTo(expected, 2);
  });

  it("falls back to the saved monthly cost when an account is incomplete", () => {
    const fig = run(
      facts({ housingStatus: "mortgage", monthlyHousingCost: 1100 }),
      takeHome(3000),
      [mortgage({ termMonths: null })],
    );
    expect(fig).toMatchObject({
      status: "known",
      provenance: "user",
      value: { kind: "mortgage", monthly: 1100, paymentEstimated: false },
    });
  });

  it("falls back to the saved monthly cost with no mortgage account at all", () => {
    const fig = run(facts({ housingStatus: "mortgage", monthlyHousingCost: 1000 }), takeHome(2500));
    expect(fig).toMatchObject({ status: "known", value: { monthly: 1000, sharePct: 40 } });
  });

  it("uses the saved monthly cost for an interest-only mortgage, never the repayment estimate", () => {
    const fig = run(
      facts({ housingStatus: "mortgage", mortgageType: "interest-only", monthlyHousingCost: 750 }),
      takeHome(3000),
      [mortgage()],
    );
    expect(fig).toMatchObject({
      status: "known",
      value: { monthly: 750, paymentEstimated: false },
    });
  });

  it("is unknown with incomplete details and no saved monthly cost", () => {
    const fig = run(facts({ housingStatus: "mortgage" }), takeHome(3000), [
      mortgage({ interestRate: null }),
    ]);
    expect(fig).toEqual(figureUnknown(["mortgageDetails"], "not-set"));
    const interestOnly = run(
      facts({ housingStatus: "mortgage", mortgageType: "interest-only" }),
      takeHome(3000),
      [mortgage()],
    );
    expect(interestOnly).toEqual(figureUnknown(["mortgageDetails"], "not-set"));
  });
});

describe("selectHousingCost: unknowns", () => {
  it("is unknown when housing status is not answered or the home is owned outright", () => {
    for (const housingStatus of [null, "own_outright"] as const) {
      const fig = run(facts({ housingStatus, monthlyHousingCost: 900 }), takeHome(2700));
      expect(fig).toEqual(figureUnknown(["housingStatus"], "not-set"));
    }
  });

  it("propagates take-home's missing facts", () => {
    const fig = run(
      facts({ housingStatus: "renting", monthlyHousingCost: 900 }),
      figureUnknown(["annualSalary", "pensionPercent"], "not-set"),
    );
    expect(fig).toEqual(figureUnknown(["annualSalary", "pensionPercent"], "not-set"));
  });

  it("names both housing and take-home facts when both are missing", () => {
    const fig = run(
      facts({ housingStatus: "renting" }),
      figureUnknown(["annualSalary"], "not-set"),
    );
    expect(fig).toEqual(figureUnknown(["monthlyHousingCost", "annualSalary"], "not-set"));
  });

  it("is unknown when take-home is not above zero", () => {
    const fig = run(facts({ housingStatus: "renting", monthlyHousingCost: 900 }), takeHome(0));
    expect(fig.status).toBe("unknown");
  });

  it("carries take-home's assumptions", () => {
    const th: Figure<TakeHome> = {
      ...(takeHome(2000) as Extract<Figure<TakeHome>, { status: "known" }>),
      provenance: "assumption",
      assumptions: ["Assuming no student loan."],
    };
    const fig = run(facts({ housingStatus: "renting", monthlyHousingCost: 500 }), th);
    expect(fig).toMatchObject({
      status: "known",
      provenance: "assumption",
      assumptions: ["Assuming no student loan."],
    });
  });
});

describe("fixedRateEnd", () => {
  const asOf = new Date("2026-11-14T12:00:00Z");

  it("counts whole calendar months remaining", () => {
    expect(fixedRateEnd("2027-05-14", asOf)).toEqual({
      date: "2027-05-14",
      monthsRemaining: 6,
      ended: false,
    });
    expect(fixedRateEnd("2027-05-13", asOf)?.monthsRemaining).toBe(5);
    expect(fixedRateEnd("2026-12-01", asOf)?.monthsRemaining).toBe(0);
  });

  it("is not ended on the day itself, and ended the day after", () => {
    expect(fixedRateEnd("2026-11-14", asOf)).toEqual({
      date: "2026-11-14",
      monthsRemaining: 0,
      ended: false,
    });
    expect(fixedRateEnd("2026-11-13", asOf)).toEqual({
      date: "2026-11-13",
      monthsRemaining: 0,
      ended: true,
    });
  });

  it("is null for a missing or malformed date", () => {
    for (const bad of [null, undefined, "", "14/11/2026", "2026-13-01", "2026-02-30", "soon"]) {
      expect(fixedRateEnd(bad, asOf)).toBeNull();
    }
  });
});

describe("selectFixedRateEnds", () => {
  it("lists mortgage accounts with a valid stored fix-end date only", () => {
    const asOf = new Date("2026-11-14T00:00:00Z");
    const accounts: RawAccount[] = [
      mortgage({ fixedRateEndDate: "2027-02-01" }),
      mortgage({ id: "m2", fixedRateEndDate: "not a date" }),
      mortgage({ id: "m3", fixedRateEndDate: null }),
      { id: "s", type: "Saving", balance: 10, fixedRateEndDate: "2027-01-01" },
    ];
    expect(selectFixedRateEnds(accounts, asOf)).toEqual([
      { accountId: "m1", date: "2027-02-01", monthsRemaining: 2, ended: false },
    ]);
  });
});

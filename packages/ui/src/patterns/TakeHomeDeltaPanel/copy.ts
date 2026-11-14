/**
 * Every user-facing string of the take-home delta panel and the marginal-rate explorer (E25 T9/T10).
 * Kept in one place so the explorer and the web app reuse it, and so the copy guard test can check
 * all of it against the advice lexicon. No engine import here: patterns stay presentational.
 */

export type DeltaComponentKey =
  | "incomeTax"
  | "nationalInsurance"
  | "studentLoan"
  | "hicbc"
  | "pension";

/** Breakdown table row labels, in order. */
export const DELTA_TABLE_ROWS: readonly { key: DeltaComponentKey; label: string }[] = [
  { key: "incomeTax", label: "Income Tax" },
  { key: "nationalInsurance", label: "National Insurance" },
  { key: "studentLoan", label: "Student loan" },
  { key: "hicbc", label: "Child Benefit charge" },
  { key: "pension", label: "Pension" },
];

export const ASSUMPTION_COPY = {
  annualMethod: "Worked out on a full year's pay, not pay period by pay period.",
  regionAssumed: "Uses England, Wales and Northern Ireland rates because no region is set.",
  childBenefitExcluded: "Take-home does not include the Child Benefit you receive.",
  hicbcIndividualBasis:
    "The Child Benefit charge assumes you are the higher earner in your household.",
  hicbcPartnerNotModelled:
    "The Child Benefit charge would fall on your partner, so it is not included.",
  childBenefitWeeks: "Child Benefit is counted for 52 weeks a year.",
  pensionPctOfSalary: "A pension percentage is taken from salary, not bonus.",
  pensionCappedAtEarnings: "The pension contribution is limited to your pay.",
  pensionMethodAssumed: "The pension contribution is modelled as salary sacrifice.",
  reliefAtSourceBandExtension:
    "Relief at source widens the basic rate band by the contribution plus its tax relief.",
  reliefAtSourceScotland: "Relief at source for Scottish rates is not yet confirmed.",
  multipleUndergraduatePlans:
    "With more than one undergraduate plan, repayments are worked out once, on the lowest threshold.",
  scheduledRuleIllustration: "Illustration: the April 2029 change is not yet law and may change.",
  studentLoanUnderScheduledCap:
    "How student loans work under the April 2029 change is not yet known.",
} as const;

export type AssumptionCode = keyof typeof ASSUMPTION_COPY;

export const STUDENT_LOAN_PLAN_LABELS = {
  plan1: "Plan 1",
  plan2: "Plan 2",
  plan4: "Plan 4",
  plan5: "Plan 5",
  postgrad: "Postgraduate loan",
} as const;

export type StudentLoanPlanLabelKey = keyof typeof STUDENT_LOAN_PLAN_LABELS;

export interface ThresholdLabelInput {
  kind: string;
  plan?: string;
  band?: { name: string; rate: number };
}

const ratePct = (rate: number): string =>
  `${(rate <= 1 ? rate * 100 : rate).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;

/** Chart label for an engine threshold. */
export function thresholdLabel(t: ThresholdLabelInput): string {
  switch (t.kind) {
    case "incomeTaxStarts":
      return "Income Tax starts";
    case "higherRate":
      return `Higher rate (${t.band ? ratePct(t.band.rate) : "40%"})`;
    case "additionalRate":
      return `Additional rate (${t.band ? ratePct(t.band.rate) : "45%"})`;
    case "scottishBand":
      return t.band ? `${t.band.name} rate (${ratePct(t.band.rate)})` : "Scottish rate";
    case "taperStart":
      return "Personal Allowance starts to reduce";
    case "taperEnd":
      return "Personal Allowance fully reduced";
    case "niPrimaryThreshold":
      return "National Insurance starts";
    case "niUpperEarningsLimit":
      return "National Insurance upper limit";
    case "studentLoan": {
      const plan =
        STUDENT_LOAN_PLAN_LABELS[t.plan as StudentLoanPlanLabelKey] ??
        STUDENT_LOAN_PLAN_LABELS.plan2;
      return `${plan} repayments start`;
    }
    case "hicbcStart":
      return "Child Benefit charge starts";
    case "hicbcEnd":
      return "Child Benefit charge reaches 100%";
    default:
      return "Threshold";
  }
}

export const STEPPED_ZONE_LABEL = "Child Benefit charge, in steps";

export const DELTA_PANEL_COPY = {
  heading: "The next £1,000 of pay",
  tableCaption: "Where the next £1,000 goes",
  amountColumn: "Amount",
  partColumn: "Part",
  takeHomeRow: "Take-home",
  estimateBadge: "Estimate",
  unverifiedBadge: "Unverified estimate",
  unverifiedBanner:
    "Unverified estimate. These tax figures have not yet been checked and signed off. Check them with HMRC before you rely on them.",
  assumptionsHeading: "How this is worked out",
  notConfirmed: "(not yet confirmed)",
} as const;

export const asAtTaxYear = (year: string): string => `As at tax year ${year}`;

export function pensionPreviewSentence(
  contribution: string,
  takeHomeChange: string,
  reachesPension: string,
): string {
  return `An extra ${contribution} a year into your pension would lower take-home by an estimated ${takeHomeChange}, and ${reachesPension} would reach your pension.`;
}

export const EXPLORER_COPY = {
  controlsLabel: "Your pay details",
  contentLabel: "The next £1,000",
  grossPay: "Pay before tax a year",
  bonus: "Bonus a year",
  region: "Where you pay tax",
  regionOptions: {
    ENGLAND_NI_WALES: "England, Wales or Northern Ireland",
    SCOTLAND: "Scotland",
  },
  pensionMethod: "Pension contribution type",
  pensionMethodOptions: {
    none: "None",
    "salary-sacrifice": "Salary sacrifice",
    "net-pay": "Net pay arrangement",
    "relief-at-source": "Relief at source",
  },
  pensionAmount: "Pension contribution a year",
  moreDetails: "More options",
  studentLoans: "Student loan plans",
  childBenefit: "Include Child Benefit",
  children: "Children receiving Child Benefit",
  taxYear: "Tax year",
  kpiNextThousand: "Estimated take-home from the next £1,000",
  kpiNextPound: "Estimated share deducted from the next £1,000",
  kpiTaxYear: "Tax year",
  chartTitle: "Estimated share deducted from the next £1,000, by pay before tax",
  chartXAxis: "Pay before tax",
  /** Drawn at the end of the line (direct label, P10.2), so the title is not repeated. */
  chartLineLabel: "Share deducted",
  chartThresholdsNote:
    "Each dashed line marks a threshold, such as where higher rate Income Tax starts.",
  yourPay: "Your pay",
  tableGross: "Pay before tax",
  tableRate: "Estimated share deducted from the next £1,000",
  modelPension: "Model a pension contribution",
  extraPension: "Extra pension contribution",
  tabYourTakeHome: "Your take-home",
  tabNextThousand: "The next £1,000",
  tabsLabel: "Take-home tools",
  defaultBasis: "No salary saved, so this uses an example: £39,000 a year before tax",
} as const;

/**
 * Chart text alternative and visible summary: at most two figures (P10.1). The range of the axis
 * is left to the chart itself.
 */
export function chartSummary(yourRate: string | null, maxGross: string): string {
  return yourRate
    ? `At your pay, an estimated ${yourRate} of the next £1,000 is deducted.`
    : `Your pay is above the ${maxGross} the chart goes up to.`;
}

export const thresholdTooltip = (label: string, gross: string): string =>
  `${label}: ${gross} pay before tax`;

export const liveTakeHomeMessage = (takeHome: string): string =>
  `Take-home from the next £1,000: an estimated ${takeHome}`;

/** Every string above, flattened, for the copy guard test. */
export function allCopyStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk([
    DELTA_TABLE_ROWS,
    ASSUMPTION_COPY,
    STUDENT_LOAN_PLAN_LABELS,
    STEPPED_ZONE_LABEL,
    DELTA_PANEL_COPY,
    EXPLORER_COPY,
  ]);
  for (const kind of [
    "incomeTaxStarts",
    "higherRate",
    "additionalRate",
    "taperStart",
    "taperEnd",
    "niPrimaryThreshold",
    "niUpperEarningsLimit",
    "hicbcStart",
    "hicbcEnd",
  ]) {
    out.push(thresholdLabel({ kind }));
  }
  out.push(thresholdLabel({ kind: "scottishBand", band: { name: "Intermediate", rate: 0.21 } }));
  for (const plan of Object.keys(STUDENT_LOAN_PLAN_LABELS)) {
    out.push(thresholdLabel({ kind: "studentLoan", plan }));
  }
  out.push(
    asAtTaxYear("2026/27"),
    pensionPreviewSentence("£1,000", "£550", "£1,000"),
    chartSummary("28%", "£150,000"),
    chartSummary(null, "£150,000"),
    thresholdTooltip("Higher rate (40%)", "£50,270"),
    liveTakeHomeMessage("£720"),
  );
  return out;
}

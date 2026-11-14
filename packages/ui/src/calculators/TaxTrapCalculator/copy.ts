/**
 * Every user-facing string of the £100k taper calculator (E25 T11). Facts and estimates only: no
 * verdicts, no "escape", "reclaim" or "save tax" wording (E29 R2, R5, R6, R8). The copy guard test
 * checks all of it against the advice lexicon.
 */

export const TAX_TRAP_COPY = {
  title: "Pensions and the Personal Allowance",
  intro:
    "Estimate how a pension contribution changes adjusted net income, the Personal Allowance and take-home pay. Figures are estimates.",
  controlsLabel: "Your figures",
  contentLabel: "Estimated outcome",
  grossIncome: "Pay before tax a year",
  contribution: "Pension contribution a year",
  contributionHelp: "Modelled as salary sacrifice.",
  region: "Where you pay tax",
  regionOptions: {
    ENGLAND_NI_WALES: "England, Wales or Northern Ireland",
    SCOTLAND: "Scotland",
  },
  /** Headline label when take-home pay goes down; the value is the reduction as a positive amount. */
  kpiTakeHomeReduction: "Estimated reduction in take-home pay",
  /** Headline label when take-home pay does not go down (value £0). */
  kpiTakeHomeChange: "Estimated change in take-home pay",
  kpiTakeHomeSubtext: "The whole contribution goes into your pension.",
  noContribution: "With no pension contribution, take-home pay stays the same.",
  /** Supporting card, shown as a positive amount so no minus sign appears. */
  kpiTaxAndNiReduction: "Estimated reduction in Income Tax and National Insurance",
  kpiTaxAndNiChange: "Estimated change in Income Tax and National Insurance",
  kpiPersonalAllowance: "Estimated Personal Allowance with this contribution",
  details: "Show details",
  factsHeading: "Before and with this contribution",
  factsCaption: "Estimated figures before and with this contribution",
  factColumn: "Figure",
  beforeColumn: "Before",
  afterColumn: "With this contribution",
  factAdjustedNetIncome: "Adjusted net income",
  factPersonalAllowance: "Personal Allowance",
  factTakeHome: "Take-home pay a year",
  factNextThousand: "Share deducted from the next £1,000",
  childcareHeading: "Childcare support",
  childcareNote:
    "Tax-Free Childcare and the extended funded childcare hours for working parents in England are not available if either parent's adjusted net income is over £100,000. The universal 15 hours for 3- and 4-year-olds are not income-tested.",
  childcareSource: "Childcare rules on GOV.UK (opens in a new tab)",
  assumptionsHeading: "How this is worked out",
} as const;

export const TAX_TRAP_DEFAULT_CTA = "Continue to sign up";

/** The one factual line outside the details. `threshold` is the taper start from the engine rules. */
export const factLine = (threshold: string): string =>
  `Above ${threshold} of adjusted net income, the Personal Allowance goes down as adjusted net income rises. A pension contribution lowers adjusted net income.`;

/** How the taper works. `threshold` is the taper start from the engine rules. */
export const taperNote = (threshold: string): string =>
  `The Personal Allowance goes down by £1 for every £2 of adjusted net income over ${threshold}, until it reaches £0.`;

/** The taper start and end, from the engine rules. */
export const taperRange = (start: string, end: string): string =>
  `Taper: adjusted net income from ${start} to ${end}.`;

export const childcareStatus = (ani: string, over: boolean): string =>
  over
    ? `With this contribution, adjusted net income is an estimated ${ani}: over £100,000.`
    : `With this contribution, adjusted net income is an estimated ${ani}: £100,000 or less.`;

/** Every string above, flattened, for the copy guard test. */
export function allTaxTrapCopyStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(TAX_TRAP_COPY);
  out.push(
    TAX_TRAP_DEFAULT_CTA,
    taperRange("£100,000", "£125,140"),
    factLine("£100,000"),
    taperNote("£100,000"),
    childcareStatus("£105,000", true),
    childcareStatus("£95,000", false),
  );
  return out;
}

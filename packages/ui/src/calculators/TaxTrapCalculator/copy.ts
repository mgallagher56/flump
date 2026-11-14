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
  kpiReachesPension: "Reaches your pension",
  kpiTakeHome: "Estimated change in take-home pay",
  kpiTaxAndNi: "Estimated change in Income Tax and NI",
  factsHeading: "Before and with this contribution",
  factsCaption: "Estimated figures before and with this contribution",
  factColumn: "Figure",
  beforeColumn: "Before",
  afterColumn: "With this contribution",
  factAdjustedNetIncome: "Adjusted net income",
  factPersonalAllowance: "Personal Allowance",
  factTakeHome: "Take-home pay a year",
  factNextThousand: "Share deducted from the next £1,000",
  taperNote:
    "The Personal Allowance goes down by £1 for every £2 of adjusted net income over the taper start, until it reaches £0.",
  childcareHeading: "Childcare support",
  childcareNote:
    "Tax-Free Childcare and the extended funded childcare hours for working parents in England are not available if either parent's adjusted net income is over £100,000. The universal 15 hours for 3- and 4-year-olds are not income-tested.",
  childcareSource: "Childcare rules on GOV.UK (opens in a new tab)",
  assumptionsHeading: "How this is worked out",
  unverifiedBadge: "Unverified estimate",
} as const;

export const TAX_TRAP_DEFAULT_CTA = "Continue to sign up";

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
    childcareStatus("£105,000", true),
    childcareStatus("£95,000", false),
  );
  return out;
}

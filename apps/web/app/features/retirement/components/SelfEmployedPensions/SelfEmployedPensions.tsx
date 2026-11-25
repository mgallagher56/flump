import {
  getUkPensionAllowances,
  getUkStatePensionRules,
  reliefAtSourceGross,
  UK_SELF_EMPLOYED_PENSION_RULES,
  type UkSelfEmployedPensionRules,
} from "@flump/finance-engine";
import { CollapsibleDrawer } from "@repo/ui";
import type { FC } from "react";
import { group, link, note, srOnly, stack, text } from "./SelfEmployedPensions.styles";

export interface SelfEmployedPensionsProps {
  /** The engine's rules (one home for every figure). Injectable for stories and tests. */
  rules?: UkSelfEmployedPensionRules;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const gbpPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "2026/27" as "2026 to 2027". */
function taxYearWords(year: string): string {
  const [start, end] = year.split("/");
  return `${start} to ${start?.slice(0, 2)}${end}`;
}

/** The example payment for relief at source: £80 paid. */
const EXAMPLE_PAYMENT_GBP = 80;

/** Every line, built from the engine's rules, so a change in the law is one edit there. */
export function selfEmployedPensionLines(rules: UkSelfEmployedPensionRules) {
  const grossed = reliefAtSourceGross(EXAMPLE_PAYMENT_GBP, rules.taxYear);
  const minYears = getUkStatePensionRules(rules.taxYear).minQualifyingYears;
  const annualAllowance = getUkPensionAllowances(rules.taxYear).pensionAnnualAllowance;
  return {
    intro: `Shown because your employment type is self-employed. UK rules for the ${taxYearWords(rules.taxYear)} tax year.`,
    facts: [
      "There is no employer paying in and no automatic enrolment. A self-employed person can set up their own pension.",
      `In most personal pensions, the provider adds basic rate tax relief. A payment of ${gbp.format(EXAMPLE_PAYMENT_GBP)} becomes ${gbp.format(grossed)} in the pension.`,
      "Higher and additional rate relief is claimed through Self Assessment. Scottish income tax rates give different amounts.",
      `Tax relief covers contributions up to a year's UK earnings. Where earnings are lower, it covers up to ${gbp.format(rules.basicAmountGbp)} a year, including the relief.`,
      `Contributions above the annual allowance, ${gbp.format(annualAllowance)} for most people, can lead to a tax charge.`,
      "Pension contributions do not reduce Class 4 National Insurance.",
      `With profits of ${gbp.format(rules.class2SmallProfitsThresholdGbp)} or more, Class 2 National Insurance is treated as paid. That adds a qualifying year for the State Pension.`,
      `Below that, voluntary Class 2 contributions cost ${gbpPence.format(rules.class2VoluntaryWeeklyGbp)} a week. Any new State Pension takes at least ${minYears} qualifying years.`,
    ],
  };
}

/**
 * "Pensions when you are self-employed" (E33 S7, the self-employed view): UK facts on pension
 * saving without an employer, shown only when the saved employment type is self-employed (R4: a
 * fact the user gave chooses a module with fixed content). No figures of the user's.
 */
export const SelfEmployedPensions: FC<SelfEmployedPensionsProps> = ({
  rules = UK_SELF_EMPLOYED_PENSION_RULES,
}) => {
  const lines = selfEmployedPensionLines(rules);
  return (
    <CollapsibleDrawer
      title="Pensions when you are self-employed"
      openLabel="Hide rules"
      closedLabel="Show rules"
    >
      <div className={stack()}>
        <p className={note()}>{lines.intro}</p>
        <div className={group()}>
          {lines.facts.map((line) => (
            <p key={line} className={text()}>
              {line}
            </p>
          ))}
        </div>
        <a
          className={link()}
          href={rules.sources.taxRelief}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tax relief on pension contributions on GOV.UK
          <span className={srOnly()}> (opens in a new tab)</span>
        </a>
      </div>
    </CollapsibleDrawer>
  );
};

export default SelfEmployedPensions;

import {
  arePensionInheritanceRulesInForce,
  UK_PENSION_INHERITANCE_RULES,
  type UkPensionInheritanceRules,
} from "@flump/finance-engine";
import { CollapsibleDrawer } from "@repo/ui";
import { type FC, useId } from "react";
import {
  group,
  heading,
  link,
  links,
  note,
  srOnly,
  stack,
  text,
} from "./UnusedPensionSavings.styles";

export interface UnusedPensionSavingsProps {
  /** Today in the UK as an ISO date (yyyy-mm-dd): the "not before" line shows until the rules apply. */
  todayIso: string;
  /** The engine's rules (one home for every figure and date). Injectable for stories and tests. */
  rules?: UkPensionInheritanceRules;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** "2027-04-06" as "6 April 2027". */
export function formatRuleDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** 1 -> "first", up to 12; the payment deadline is the sixth month. */
const ORDINALS = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];

/** "£2,000,000" as "£2 million" when it is whole millions. */
function millions(amount: number): string {
  return amount % 1_000_000 === 0 ? `£${amount / 1_000_000} million` : gbp.format(amount);
}

/** Every line, built from the rules object, so a change in the law is one edit in the engine. */
export function unusedPensionSavingsLines(rules: UkPensionInheritanceRules) {
  const from = formatRuleDate(rules.appliesToDeathsFrom);
  return {
    intro:
      "UK rules for pension savings left when someone dies. This is general information, the same for everyone, and does not use your figures.",
    notYetLaw: `These rules are proposed and not yet law. They may change before ${from}.`,
    notBefore: `These rules apply to deaths on or after ${from}. They do not apply before that date.`,
    inheritanceTax: [
      `From ${from}, most unused pension savings and pension death benefits count as part of a person's estate for inheritance tax.`,
      "An estate is everything a person owns when they die.",
      "Anything left to a spouse or civil partner, or to charity, is free of inheritance tax.",
      "Death in service benefits and scheme pensions paid to dependants are not counted.",
      "The people dealing with the estate report the pension and pay any tax. They can usually ask the pension scheme to pay its share.",
      `Inheritance tax is due by the end of the ${ORDINALS[rules.paymentDueMonthAfterDeath] ?? `${rules.paymentDueMonthAfterDeath}th`} month after the death.`,
    ],
    thresholds: [
      `Inheritance tax is usually charged at ${Math.round(rules.rate * 100)}% on the part of an estate above its tax-free thresholds.`,
      `The standard threshold is ${gbp.format(rules.nilRateBandGbp)}. A further ${gbp.format(rules.residenceNilRateBandGbp)} can apply when a home passes to children or grandchildren.`,
      `The further threshold reduces by £1 for every £${rules.residenceTaperDivisor} of estate above ${millions(rules.residenceTaperThresholdGbp)}.`,
      `Unused thresholds can pass to a surviving spouse or civil partner. These figures are fixed until ${formatRuleDate(rules.thresholdsFixedUntil)}.`,
    ],
    incomeTax: [
      `After a death before age ${rules.incomeTaxFreeBeforeAge}, the pension is usually free of income tax. Lump sums are tax-free up to the lump sum and death benefit allowance, ${gbp.format(rules.lumpSumAndDeathBenefitAllowanceGbp)} for most people.`,
      `After a death at ${rules.incomeTaxFreeBeforeAge} or over, the pension is taxed as income of the person who receives it.`,
      "Inheritance tax paid on the pension is taken off the amount taxed as income.",
    ],
    noEstimate:
      "Flump does not estimate inheritance tax. It does not hold details of a will, gifts or other belongings.",
    checked: `Rules checked on ${formatRuleDate(rules.checkedOn)}.`,
  };
}

/**
 * "What happens to unused pension savings" (E33 S7): UK rules on pensions and inheritance tax
 * from 6 April 2027, as facts the same for every user, closed by default. No estimate: Flump holds
 * no will, gifts or other belongings, and the apportionment and taper points are not confirmed.
 */
export const UnusedPensionSavings: FC<UnusedPensionSavingsProps> = ({
  todayIso,
  rules = UK_PENSION_INHERITANCE_RULES,
}) => {
  const lines = unusedPensionSavingsLines(rules);
  // Unique per instance: Storybook shows light and dark side by side.
  const baseId = useId();
  const ihtId = `${baseId}-iht`;
  const thresholdsId = `${baseId}-thresholds`;
  const incomeTaxId = `${baseId}-income-tax`;
  const isLaw = rules.status === "enacted";
  const inForce = arePensionInheritanceRulesInForce(todayIso, rules);
  return (
    <CollapsibleDrawer
      title="What happens to unused pension savings"
      openLabel="Hide rules"
      closedLabel="Show rules"
    >
      <div className={stack()}>
        <div className={group()}>
          <p className={text()}>{lines.intro}</p>
          {!isLaw && (
            <p className={text()} id="pension-iht-not-law" data-testid="pension-iht-not-law">
              {lines.notYetLaw}
            </p>
          )}
          {isLaw && !inForce && <p className={text()}>{lines.notBefore}</p>}
        </div>
        <section className={group()} aria-labelledby={ihtId}>
          <h3 className={heading()} id={ihtId}>
            Inheritance tax
          </h3>
          {lines.inheritanceTax.map((line) => (
            <p key={line} className={text()}>
              {line}
            </p>
          ))}
        </section>
        <section className={group()} aria-labelledby={thresholdsId}>
          <h3 className={heading()} id={thresholdsId}>
            Thresholds
          </h3>
          {lines.thresholds.map((line) => (
            <p key={line} className={text()}>
              {line}
            </p>
          ))}
        </section>
        <section className={group()} aria-labelledby={incomeTaxId}>
          <h3 className={heading()} id={incomeTaxId}>
            Income tax for the person who inherits
          </h3>
          {lines.incomeTax.map((line) => (
            <p key={line} className={text()}>
              {line}
            </p>
          ))}
        </section>
        <div className={group()}>
          <p className={note()}>{lines.noEstimate}</p>
          <p className={note()}>{lines.checked}</p>
          <div className={links()}>
            <a
              className={link()}
              href={rules.sources.inheritanceTax}
              target="_blank"
              rel="noopener noreferrer"
            >
              Inheritance tax on GOV.UK
              <span className={srOnly()}> (opens in a new tab)</span>
            </a>
            <a
              className={link()}
              href={rules.sources.inheritedPensionTax}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tax on a pension you inherit on GOV.UK
              <span className={srOnly()}> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </CollapsibleDrawer>
  );
};

export default UnusedPensionSavings;

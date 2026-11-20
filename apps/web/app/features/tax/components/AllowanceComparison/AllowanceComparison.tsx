import type {
  AllowanceComparison as AllowanceComparisonResult,
  PropertyAllowanceExclusion,
  TradingAllowanceExclusion,
} from "@flump/finance-engine";
import { CollapsibleDrawer, Money, PageSection, VisuallyHidden } from "@repo/ui";
import { Scale } from "lucide-react";
import type { FC, ReactNode } from "react";
import {
  exclusions,
  figure,
  figureLabel,
  figureNote,
  figures,
  figureValue,
  line,
  lines,
  root,
  sourceLink,
} from "./AllowanceComparison.styles";

/** Who cannot use each allowance, from GOV.UK's guidance (read 18 November 2026). */
const ALLOWANCE_EXCLUSION_TEXT: Record<
  TradingAllowanceExclusion | PropertyAllowanceExclusion,
  string
> = {
  partnership: "Income from a partnership you are a partner in.",
  "employer-or-connected":
    "A year with trading or property income from your employer, or your spouse's or civil partner's employer. The same goes for income from a company or partnership you, or someone connected to you, owns, controls or is a partner in.",
  "rent-a-room": "Income from letting a room in your own home under the Rent a Room Scheme.",
  "finance-cost-relief":
    "A year you claim the tax reduction for finance costs, such as mortgage interest, on residential property.",
};

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const poundsFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export interface AllowanceComparisonProps {
  /** The engine's comparison for one source and tax year (`compareExpensesWithAllowance`). */
  comparison: AllowanceComparisonResult;
  /**
   * The allowance the page's estimate used for this source: the calculation's
   * `tradingAllowanceUsed` or `propertyAllowanceUsed`, so the words match the estimate. null when
   * the estimate cannot be worked out (a fact it depends on is not set).
   */
  allowanceUsedInEstimate: number | null;
  /** Said in place of which deduction the estimate uses, when it cannot be worked out. */
  unknownEstimate?: ReactNode;
  /** Rental: the person's share of the property, 0 to 100. */
  ownershipSharePct?: number;
  /**
   * Rental: the calculation's `propertyRoutesTie`. When both routes give the same total tax the
   * estimate keeps the recorded expenses, and the words say the total is the same either way.
   */
  routesTie?: boolean;
}

/**
 * The expenses recorded for a self-employed or rental source beside the trading or property
 * allowance for the year, side by side and neutrally. It says which is larger and which one the
 * estimate uses, that the allowance replaces expenses, and who cannot use it. Guidance only: it
 * never says which to claim.
 */
export const AllowanceComparison: FC<AllowanceComparisonProps> = ({
  comparison,
  allowanceUsedInEstimate,
  ownershipSharePct,
  routesTie = false,
  unknownEstimate,
}) => {
  const rental = comparison.source === "rental";
  const allowanceName = rental ? "property allowance" : "trading allowance";
  const AllowanceName = rental ? "Property allowance" : "Trading allowance";
  const limited = comparison.usableAllowance < comparison.allowance;
  const estimateKnown = allowanceUsedInEstimate !== null;
  const usesAllowance = (allowanceUsedInEstimate ?? 0) > 0;
  const showShare = rental && ownershipSharePct !== undefined && ownershipSharePct < 100;

  const largerLine =
    comparison.larger === "allowance"
      ? `The ${allowanceName} is larger than the expenses you have recorded.`
      : comparison.larger === "expenses"
        ? `The expenses you have recorded are larger than the ${allowanceName}.`
        : `The expenses you have recorded and the ${allowanceName} are the same.`;
  const used = usesAllowance ? allowanceName : "expenses you have recorded";
  // Said only when it is true: the deduction the estimate used is the larger of the two.
  const usedIsLarger = usesAllowance
    ? comparison.larger === "allowance"
    : comparison.larger === "expenses";
  const estimateLine = rental
    ? routesTie && !usesAllowance
      ? "The total tax is the same either way. Your Self Assessment estimate uses the expenses you have recorded."
      : `Your Self Assessment estimate compares the total tax each way and uses the ${used}, which gives the lower total.`
    : `Your Self Assessment estimate compares the two deductions and uses the ${used}${
        usedIsLarger ? ", which is larger" : ""
      }.`;

  return (
    <PageSection
      description={`You can deduct the expenses you have recorded or the ${allowanceName}, not both.`}
      domain="tax"
      icon={Scale}
      id={`allowance-${comparison.source}`}
      title={`Expenses and the ${allowanceName}`}
    >
      <div className={root()}>
        <dl className={figures()}>
          <div className={figure()}>
            <dt className={figureLabel()}>Expenses you have recorded</dt>
            <dd className={figureValue()}>
              <Money fractionDigits={0} size="lg" value={comparison.recordedExpenses} />
            </dd>
          </div>
          <div className={figure()}>
            <dt className={figureLabel()}>{AllowanceName}</dt>
            <dd className={figureValue()}>
              <Money fractionDigits={0} size="lg" value={comparison.usableAllowance} />
            </dd>
            {limited ? (
              <dd className={figureNote()}>
                Up to your income, from an allowance of{" "}
                <Money fractionDigits={0} size="sm" value={comparison.allowance} />
              </dd>
            ) : null}
          </div>
        </dl>

        <div className={lines()}>
          {showShare ? (
            <p className={line()}>
              {`These figures are your ${percentFormat.format(ownershipSharePct ?? 100)}% share of the property.`}
            </p>
          ) : null}
          {estimateKnown ? (
            <p className={line()}>
              {largerLine} {estimateLine}
            </p>
          ) : (
            <>
              <p className={line()}>{largerLine}</p>
              {unknownEstimate ? <p className={line()}>{unknownEstimate}</p> : null}
            </>
          )}
          <p className={line()}>The allowance replaces your expenses. It is not added to them.</p>
          {/* Only when it is true of the estimate: the allowance was used, not the expenses. */}
          {comparison.withinFullRelief && usesAllowance ? (
            <p className={line()}>
              {`Income of ${poundsFormat.format(comparison.allowance)} or less is covered in full by the allowance. You usually do not need to report it. HMRC still asks you to keep records.`}
            </p>
          ) : null}
          {comparison.financeCostsExcluded ? (
            <p className={line()}>
              Mortgage interest is not in these expenses. It gets its own tax reduction, which
              cannot be used with the allowance.
            </p>
          ) : null}
        </div>

        <CollapsibleDrawer title={`Who cannot use the ${allowanceName}`} variant="quiet">
          <ul className={exclusions()}>
            {comparison.exclusions.map((id) => (
              <li key={id}>{ALLOWANCE_EXCLUSION_TEXT[id]}</li>
            ))}
          </ul>
        </CollapsibleDrawer>

        <a
          className={sourceLink()}
          href={comparison.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Tax-free allowances on property and trading income on GOV.UK
          <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
        </a>
      </div>
    </PageSection>
  );
};

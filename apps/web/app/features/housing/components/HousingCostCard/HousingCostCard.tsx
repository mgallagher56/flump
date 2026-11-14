import type { Figure, FixedRateEndFact, HousingCost, MissingKey } from "@flump/finance-engine";
import { Button, CurrencyInput, controlProps, FormField, Heading } from "@repo/ui";
import { type FC, type FormEvent, useEffect, useId, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  housingCard,
  housingFigure,
  housingFigures,
  housingFixEnd,
  housingLabel,
  housingNote,
  housingShare,
  housingUnknown,
  housingValue,
  rentError,
  rentForm,
} from "./HousingCostCard.styles";

export interface HousingCostCardProps {
  /** The picture's housing cost. The card never recomputes it. */
  housingCost: Figure<HousingCost>;
  /** The picture's fix-end fact for the mortgage shown, when one is stored. */
  fixedRateEnd?: FixedRateEndFact | null;
  /** Saved monthly rent, to fill the rent field. */
  savedRent?: number | null;
  /** Saves the monthly rent to the profile. When absent, no rent field is shown. */
  onSaveRent?: (monthly: number) => Promise<void>;
  /** Heading level, so the card fits the page outline. */
  headingLevel?: "h2" | "h3";
  id?: string;
}

const shareFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

const formatDate = (iso: string): string => {
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? iso : dateFormat.format(parsed);
};

export const RENT_MISSING_TEXT = "Not known yet. Add your monthly rent to see this.";
export const SALARY_MISSING_TEXT = "Not known yet. Add your salary to see this.";
export const MORTGAGE_MISSING_TEXT =
  "Not known yet. Add your mortgage balance, rate and term to see this.";

/** The one line that says what is missing, housing facts first. */
function unknownText(missing: readonly MissingKey[]): string {
  if (missing.includes("mortgageDetails")) return MORTGAGE_MISSING_TEXT;
  if (missing.includes("monthlyHousingCost") || missing.includes("housingStatus")) {
    return RENT_MISSING_TEXT;
  }
  // Anything else missing is a take-home fact (salary, employment, pension or sacrifice).
  return SALARY_MISSING_TEXT;
}

export function fixedRateEndText(fact: FixedRateEndFact): string {
  const date = formatDate(fact.date);
  if (fact.ended) return `Fixed rate ended on ${date}.`;
  const unit = fact.monthsRemaining === 1 ? "month" : "months";
  return `Fixed rate ends on ${date}. ${fact.monthsRemaining} ${unit} remaining.`;
}

/**
 * Monthly housing cost and its share of estimated take-home pay (E32). Facts only: no target,
 * no benchmark and no status colour on the share.
 */
export const HousingCostCard: FC<HousingCostCardProps> = ({
  housingCost,
  fixedRateEnd,
  savedRent = null,
  onSaveRent,
  headingLevel = "h2",
  id = "housing-cost-card",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const headingId = useId();
  const [rent, setRent] = useState<number | null>(savedRent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRent(savedRent);
  }, [savedRent]);

  const known = housingCost.status === "known" ? housingCost.value : null;
  const missing = housingCost.status === "unknown" ? housingCost.missing : [];
  const showRentForm =
    !!onSaveRent &&
    (known?.kind === "rent" ||
      missing.includes("monthlyHousingCost") ||
      missing.includes("housingStatus"));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSaveRent || rent === null || !(rent > 0)) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveRent(rent);
    } catch {
      setError("Could not save your rent. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  let label = "Monthly rent";
  if (known?.kind === "mortgage") {
    label = known.paymentEstimated
      ? "Monthly mortgage payment (estimate)"
      : "Monthly mortgage payment";
  }

  return (
    <section aria-labelledby={headingId} className={housingCard()} data-testid={id} id={id}>
      <Heading as={headingLevel} id={headingId} size="sm">
        Housing cost
      </Heading>

      {known ? (
        <dl className={housingFigures()}>
          <div className={housingFigure()}>
            <dt className={housingLabel()}>{label}</dt>
            <dd
              className={housingValue()}
              data-testid="housing-cost-monthly"
              id="housing-cost-monthly"
            >
              {formatCurrency(known.monthly, {
                maximumFractionDigits: known.paymentEstimated ? 2 : 0,
              })}
            </dd>
            <dd className={housingShare()} data-testid="housing-cost-share" id="housing-cost-share">
              {`${shareFormat.format(known.sharePct)}% of your estimated take-home pay`}
            </dd>
          </div>
          {fixedRateEnd ? (
            <div className={housingFigure()}>
              <dt className={housingLabel()}>Fixed rate ends</dt>
              <dd className={housingFixEnd()} data-testid="housing-fix-end" id="housing-fix-end">
                {fixedRateEndText(fixedRateEnd)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <>
          <p
            className={housingUnknown()}
            data-testid="housing-cost-unknown"
            id="housing-cost-unknown"
          >
            {unknownText(missing)}
          </p>
          {fixedRateEnd ? (
            <p className={housingFixEnd()} data-testid="housing-fix-end" id="housing-fix-end">
              {fixedRateEndText(fixedRateEnd)}
            </p>
          ) : null}
        </>
      )}

      {known?.paymentEstimated ? (
        <p className={housingNote()}>Estimate based on a repayment mortgage at your saved rate.</p>
      ) : null}
      {known && !known.paymentEstimated ? (
        <p className={housingNote()}>From your saved details.</p>
      ) : null}

      {showRentForm ? (
        <form className={rentForm()} onSubmit={submit}>
          <FormField label="Monthly rent">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                value={rent}
                onValueChange={(value) => setRent(value)}
              />
            )}
          </FormField>
          <Button disabled={saving || rent === null || !(rent > 0)} size="sm" type="submit">
            Save rent
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className={rentError()} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export default HousingCostCard;

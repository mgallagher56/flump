import {
  calculatePropertyTransactionTax,
  PROPERTY_TAX_REGIME_META,
  type PropertyTransactionTaxResult,
  type UkPropertyTaxJurisdiction,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  LiveRegion,
  RadioCardGroup,
} from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, useId, useMemo, useState } from "react";
import {
  stampDutyFigure,
  stampDutyLine,
  stampDutyNote,
  stampDutyPanel,
  stampDutyRoot,
} from "./StampDutyEstimate.styles";

export interface StampDutyInputs {
  /** Property price typed in the scenario, in pounds. `null` until typed. */
  propertyPriceGbp: number | null;
  /** Where the property is. `null` until the user chooses: never prefilled (E39 MA7). */
  jurisdiction: UkPropertyTaxJurisdiction | null;
  /** Whether every buyer is a first-time buyer buying this as their main home. `null` until answered. */
  allFirstTimeBuyersMainHome: boolean | null;
}

export interface StampDutyEstimateProps extends StampDutyInputs {
  onPropertyPriceChange: (value: number | null) => void;
  onJurisdictionChange: (value: UkPropertyTaxJurisdiction) => void;
  onAllFirstTimeBuyersMainHomeChange: (value: boolean) => void;
  /** Opens the section on first render (stories and tests). */
  defaultOpen?: boolean;
}

const LOCATION_OPTIONS = [
  { value: "ENGLAND_NI", label: "England or Northern Ireland" },
  { value: "SCOTLAND", label: "Scotland" },
  { value: "WALES", label: "Wales" },
] as const satisfies readonly { value: UkPropertyTaxJurisdiction; label: string }[];

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

/** True when the regime for this place has first-time buyer relief, so the question is asked. */
export const asksFirstTimeBuyerQuestion = (
  jurisdiction: UkPropertyTaxJurisdiction | null,
): boolean =>
  jurisdiction !== null && PROPERTY_TAX_REGIME_META[jurisdiction].hasFirstTimeBuyerRelief;

/**
 * The engine's estimate once every needed answer is in, or `null`. No rate, band or formula lives
 * here: the figure is `calculatePropertyTransactionTax` only (AGENTS.md section 16).
 */
export const estimateStampDuty = ({
  propertyPriceGbp,
  jurisdiction,
  allFirstTimeBuyersMainHome,
}: StampDutyInputs): PropertyTransactionTaxResult | null => {
  if (propertyPriceGbp === null || !(propertyPriceGbp > 0) || jurisdiction === null) return null;
  const asksFtb = asksFirstTimeBuyerQuestion(jurisdiction);
  if (asksFtb && allFirstTimeBuyersMainHome === null) return null;
  return calculatePropertyTransactionTax({
    propertyPriceGbp,
    jurisdiction,
    isFirstTimeBuyer: asksFtb ? allFirstTimeBuyersMainHome === true : false,
  });
};

/** "1 April 2025": the full en-GB date for prose (copy guide 4.3). */
const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const formatLongDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return longDate.format(Date.UTC(y, m - 1, d));
};

/** The engine's figure as returned: whole pounds stay whole, pence stay (SDLT is floored by the engine). */
const formatTax = (value: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

/** "stamp duty" in England and Northern Ireland; the tax's own name in Scotland and Wales (MA7). */
const taxLabel = (result: PropertyTransactionTaxResult): string =>
  result.regime === "SDLT" ? "stamp duty" : result.taxName;

/**
 * Estimated stamp duty for a typed property price (E39 S2, section 10a MA7). Asks where the property
 * is with no prefill, and whether every buyer is a first-time buyer buying their main home where the
 * regime has a relief. Scenario only: values come from and go to `useScenarioState` in the page.
 */
export const StampDutyEstimate: FC<StampDutyEstimateProps> = ({
  propertyPriceGbp,
  jurisdiction,
  allFirstTimeBuyersMainHome,
  onPropertyPriceChange,
  onJurisdictionChange,
  onAllFirstTimeBuyersMainHomeChange,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const result = useMemo(
    () => estimateStampDuty({ propertyPriceGbp, jurisdiction, allFirstTimeBuyersMainHome }),
    [propertyPriceGbp, jurisdiction, allFirstTimeBuyersMainHome],
  );
  const asksFtb = asksFirstTimeBuyerQuestion(jurisdiction);

  const emptyPrompt =
    propertyPriceGbp === null || !(propertyPriceGbp > 0)
      ? "Enter a property price to see an estimate."
      : jurisdiction === null
        ? "Choose where the property is to see an estimate."
        : "Answer the first-time buyer question to see an estimate.";

  const figure = result ? `~${formatTax(result.taxGbp)}` : null;
  const lineLabel = result ? `Estimated ${taxLabel(result)}` : null;

  return (
    <div className={stampDutyRoot()} data-testid="stamp-duty-estimate" id="stamp-duty-estimate">
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        size="sm"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
      >
        Stamp duty estimate
        <Icon aria-hidden icon={open ? ChevronUp : ChevronDown} size="sm" />
      </Button>

      {open ? (
        <div className={stampDutyPanel} id={panelId}>
          <FormField label="Property price">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                placeholder="0"
                value={propertyPriceGbp}
                onValueChange={onPropertyPriceChange}
              />
            )}
          </FormField>

          <RadioCardGroup
            legend="Where is the property?"
            name="stamp-duty-location"
            options={LOCATION_OPTIONS}
            value={jurisdiction ?? ""}
            onValueChange={(value) => onJurisdictionChange(value as UkPropertyTaxJurisdiction)}
          />

          {asksFtb ? (
            <RadioCardGroup
              hint="A first-time buyer has never owned a home, in the UK or anywhere else."
              legend="Are all the buyers first-time buyers, buying this as their main home?"
              name="stamp-duty-first-time"
              options={YES_NO_OPTIONS}
              value={
                allFirstTimeBuyersMainHome === null ? "" : allFirstTimeBuyersMainHome ? "yes" : "no"
              }
              onValueChange={(value) => onAllFirstTimeBuyersMainHomeChange(value === "yes")}
            />
          ) : null}

          {result && figure && lineLabel ? (
            <div data-testid="stamp-duty-result" id="stamp-duty-result">
              <p className={stampDutyLine}>
                {lineLabel}: <span className={stampDutyFigure}>{figure}</span>
              </p>
              <p className={stampDutyNote}>
                Rates in effect from {formatLongDate(result.ratesEffectiveFrom)}. Sources checked on{" "}
                {formatLongDate(result.sourcesCheckedOn)}.
              </p>
            </div>
          ) : (
            <p className={stampDutyNote} data-testid="stamp-duty-empty" id="stamp-duty-empty">
              {emptyPrompt}
            </p>
          )}

          <p className={stampDutyNote}>
            This is for a main home where no buyer owns another home. Higher rates for additional
            homes and for buyers who are not UK residents are not included.
          </p>

          <LiveRegion message={figure && lineLabel ? `Illustration: ${lineLabel} ${figure}` : ""} />
        </div>
      ) : null}
    </div>
  );
};

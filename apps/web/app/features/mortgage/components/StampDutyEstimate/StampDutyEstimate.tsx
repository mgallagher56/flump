import {
  calculatePropertyTransactionTax,
  PROPERTY_TAX_REGIME_META,
  type PropertyPriceSolution,
  type PropertyPriceTaxAnswers,
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
import { type FC, useMemo, useState } from "react";
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

/**
 * The solver's results for the property price the active loan tool works out (E39 S1c). `low` and
 * `high` are the two ends of the tool's range, the same result when it has one figure, and `null`
 * until the place and first-time buyer answers are in.
 */
export interface StampDutyFromEstimate {
  low: PropertyPriceSolution | null;
  high: PropertyPriceSolution | null;
}

export interface StampDutyEstimateProps extends StampDutyInputs {
  /**
   * Set when the active loan tool supplies the property price. The section then shows the tax the
   * solver took off the deposit and asks for no price of its own.
   */
  fromEstimate?: StampDutyFromEstimate | null;
  onPropertyPriceChange: (value: number | null) => void;
  onJurisdictionChange: (value: UkPropertyTaxJurisdiction) => void;
  onAllFirstTimeBuyersMainHomeChange: (value: boolean) => void;
  /** Opens the section on first render (stories and tests). */
  defaultOpen?: boolean;
}

/** Paired `id` and `data-testid` (web tests read `id`, stories read `data-testid`). One per page. */
const TOGGLE_ID = "stamp-duty-toggle";
const PANEL_ID = "stamp-duty-panel";

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
 * The place and first-time buyer answers the engine needs, once every needed answer is in, or `null`.
 * The container passes these to the loan tools so the solver takes the tax off the deposit.
 */
export const stampDutyTaxAnswers = ({
  jurisdiction,
  allFirstTimeBuyersMainHome,
}: Pick<
  StampDutyInputs,
  "jurisdiction" | "allFirstTimeBuyersMainHome"
>): PropertyPriceTaxAnswers | null => {
  if (jurisdiction === null) return null;
  const asksFtb = asksFirstTimeBuyerQuestion(jurisdiction);
  if (asksFtb && allFirstTimeBuyersMainHome === null) return null;
  return { jurisdiction, isFirstTimeBuyer: asksFtb ? allFirstTimeBuyersMainHome === true : false };
};

/** The tax figure a solver result shows: at the solved price, or at a price equal to the loan when the deposit is short. */
const solutionTax = (
  solution: PropertyPriceSolution | null,
): PropertyTransactionTaxResult | null => {
  if (solution?.status === "solved") return solution.propertyTax;
  if (solution?.status === "deposit-short") return solution.propertyTaxAtLoan;
  return null;
};

/**
 * The engine's estimate once every needed answer is in, or `null`. No rate, band or formula lives
 * here: the figure is `calculatePropertyTransactionTax` only (AGENTS.md section 16).
 */
export const estimateStampDuty = ({
  propertyPriceGbp,
  jurisdiction,
  allFirstTimeBuyersMainHome,
}: StampDutyInputs): PropertyTransactionTaxResult | null => {
  if (propertyPriceGbp === null || !(propertyPriceGbp > 0)) return null;
  const answers = stampDutyTaxAnswers({ jurisdiction, allFirstTimeBuyersMainHome });
  if (answers === null) return null;
  return calculatePropertyTransactionTax({ propertyPriceGbp, ...answers });
};

/**
 * What the section shows for the solver's results: the low and high tax figures (the same when the
 * tool has one figure) and whether the deposit falls short at the high end. `null` until both ends
 * have a result. A short deposit at the low end means it is short at the high end too, as tax
 * never falls when the loan rises.
 */
export const stampDutyFromEstimateFigures = (
  fromEstimate: StampDutyFromEstimate,
): {
  low: PropertyTransactionTaxResult;
  high: PropertyTransactionTaxResult;
  lowIsShort: boolean;
  highIsShort: boolean;
} | null => {
  const low = solutionTax(fromEstimate.low);
  const high = solutionTax(fromEstimate.high);
  if (low === null || high === null) return null;
  return {
    low,
    high,
    lowIsShort: fromEstimate.low?.status === "deposit-short",
    highIsShort: fromEstimate.high?.status === "deposit-short",
  };
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
 * Estimated stamp duty (E39 S2 and S1c, section 10a MA7). Asks where the property is with no
 * prefill, and whether every buyer is a first-time buyer buying their main home where the regime has
 * a relief. When the active loan tool supplies a property price, shows the tax the solver took off
 * the deposit; otherwise asks for a typed price. Scenario only: values come from and go to
 * `useScenarioState` in the page.
 */
export const StampDutyEstimate: FC<StampDutyEstimateProps> = ({
  propertyPriceGbp,
  jurisdiction,
  allFirstTimeBuyersMainHome,
  onPropertyPriceChange,
  onJurisdictionChange,
  onAllFirstTimeBuyersMainHomeChange,
  fromEstimate = null,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const usesEstimate = fromEstimate !== null;
  const typed = useMemo(
    () =>
      usesEstimate
        ? null
        : estimateStampDuty({ propertyPriceGbp, jurisdiction, allFirstTimeBuyersMainHome }),
    [usesEstimate, propertyPriceGbp, jurisdiction, allFirstTimeBuyersMainHome],
  );
  const solved = fromEstimate ? stampDutyFromEstimateFigures(fromEstimate) : null;
  const asksFtb = asksFirstTimeBuyerQuestion(jurisdiction);
  // The result whose regime and dates the line uses: one place, so both ends share them.
  const result = solved ? solved.high : typed;

  const emptyPrompt =
    !usesEstimate && (propertyPriceGbp === null || !(propertyPriceGbp > 0))
      ? "Enter a property price to see an estimate."
      : jurisdiction === null
        ? "Choose where the property is to see an estimate."
        : "Answer the first-time buyer question to see an estimate.";

  let figure: string | null = null;
  if (solved) {
    figure =
      solved.low.taxGbp === solved.high.taxGbp
        ? `~${formatTax(solved.high.taxGbp)}`
        : `~${formatTax(solved.low.taxGbp)} to ~${formatTax(solved.high.taxGbp)}`;
  } else if (typed) {
    figure = `~${formatTax(typed.taxGbp)}`;
  }
  const lineLabel = result ? `Estimated ${taxLabel(result)}` : null;
  let shortNote: string | null = null;
  if (solved?.lowIsShort) {
    shortNote =
      "Your deposit, less other buying costs, does not cover this, so no property price is shown.";
  } else if (solved?.highIsShort) {
    shortNote =
      "At the higher estimate, your deposit, less other buying costs, does not cover this, so no property price is shown.";
  }

  return (
    <div className={stampDutyRoot()} data-testid="stamp-duty-estimate" id="stamp-duty-estimate">
      {/* A hand-built toggle, not CollapsibleDrawer: the drawer takes no id or data-testid for its
          trigger or body, so the paired test ids (component guidelines 5.1) would need an API change. */}
      <Button
        aria-controls={open ? PANEL_ID : undefined}
        aria-expanded={open}
        data-testid={TOGGLE_ID}
        id={TOGGLE_ID}
        size="sm"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
      >
        Stamp duty estimate
        <Icon aria-hidden icon={open ? ChevronUp : ChevronDown} size="sm" />
      </Button>

      {open ? (
        <div className={stampDutyPanel} data-testid={PANEL_ID} id={PANEL_ID}>
          {usesEstimate ? (
            <p className={stampDutyNote} data-testid="stamp-duty-basis" id="stamp-duty-basis">
              Worked out on the property price in your estimate above, and taken off your deposit
              with other buying costs.
            </p>
          ) : (
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
          )}

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
              {shortNote ? (
                <p className={stampDutyNote} data-testid="stamp-duty-short" id="stamp-duty-short">
                  {shortNote}
                </p>
              ) : null}
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

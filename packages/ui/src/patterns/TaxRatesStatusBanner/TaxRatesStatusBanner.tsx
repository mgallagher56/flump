import { type FC, useState } from "react";
import { taxRatesBanner, taxRatesBannerDismiss } from "./TaxRatesStatusBanner.styles";

/** Subset of the engine's UkTaxYearContext, so this pattern needs no engine import. */
export interface TaxRatesStatusBannerProps {
  /** Tax year the calendar is in, e.g. "2027/28". */
  calendarYear: string;
  /** Tax year whose rates are actually used, e.g. "2026/27". */
  ratesYear: string;
  /** True when the calendar year's rates are not loaded, so the latest supported year's are used. */
  isFallback: boolean;
  /** "provisional": the rates for calendarYear are loaded but not yet confirmed. */
  kind?: "fallback" | "provisional";
}

/**
 * Says which tax year's rates the figures use when that is not the current year: when the
 * engine falls back past its latest supported year, or when `ratesYear` is not `calendarYear`
 * for any other reason. Renders nothing when the rates match the calendar. Dismissible for the
 * session.
 */
export const TaxRatesStatusBanner: FC<TaxRatesStatusBannerProps> = ({
  calendarYear,
  ratesYear,
  isFallback,
  kind = "fallback",
}) => {
  const [dismissed, setDismissed] = useState(false);
  // Out of date means the rates in use are not the calendar year's: the fallback flag, or a
  // figure worked out at another year's rates (its own `ratesYear`), whatever the flag says.
  const outOfDate = isFallback || ratesYear !== calendarYear;
  if (dismissed || (!outOfDate && kind === "fallback")) return null;

  const message =
    kind === "provisional"
      ? `${calendarYear} rates are provisional: announced but not yet confirmed. Figures may change.`
      : isFallback
        ? `Using ${ratesYear} rates. The ${calendarYear} rates are not in Flump yet, so figures may be out of date.`
        : `Using ${ratesYear} rates, not ${calendarYear} rates, so figures may be out of date.`;

  return (
    <div role="status" className={taxRatesBanner({ kind })} data-testid="tax-rates-status-banner">
      <span>{message}</span>
      <button type="button" className={taxRatesBannerDismiss()} onClick={() => setDismissed(true)}>
        Dismiss notice
      </button>
    </div>
  );
};

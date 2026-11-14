import { type FC, useState } from "react";
import { taxRatesBanner, taxRatesBannerDismiss } from "./TaxRatesStatusBanner.styles";

/** Subset of the engine's UkTaxYearContext, so this pattern needs no engine import. */
export interface TaxRatesStatusBannerProps {
  /** Tax year the calendar is in, e.g. "2027/28". */
  calendarYear: string;
  /** Tax year whose rates are actually used, e.g. "2026/27". */
  ratesYear: string;
  /** True when ratesYear differs from calendarYear because the newer rates are not loaded. */
  isFallback: boolean;
  /** "provisional": the rates for calendarYear are loaded but not yet confirmed. */
  kind?: "fallback" | "provisional";
}

/**
 * Says which tax year's rates the figures use when that is not the current year.
 * Renders nothing when the rates match the calendar. Dismissible for the session.
 */
export const TaxRatesStatusBanner: FC<TaxRatesStatusBannerProps> = ({
  calendarYear,
  ratesYear,
  isFallback,
  kind = "fallback",
}) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || (!isFallback && kind === "fallback")) return null;

  const message =
    kind === "provisional"
      ? `${calendarYear} rates are provisional: announced but not yet confirmed. Figures may change.`
      : `Using ${ratesYear} rates. The ${calendarYear} rates are not in Flump yet, so figures may be out of date.`;

  return (
    <div role="status" className={taxRatesBanner({ kind })} data-testid="tax-rates-status-banner">
      <span>{message}</span>
      <button type="button" className={taxRatesBannerDismiss()} onClick={() => setDismissed(true)}>
        Dismiss notice
      </button>
    </div>
  );
};

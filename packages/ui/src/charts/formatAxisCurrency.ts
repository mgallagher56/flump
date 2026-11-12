export type FormatAxisCurrencyOptions = {
  /** Maximum decimal places on the compact figure. Default 1 ("£1.2m"). */
  maxFractionDigits?: number;
};

const UNITS = [
  { divisor: 1e9, suffix: "bn" },
  { divisor: 1e6, suffix: "m" },
  { divisor: 1e3, suffix: "k" },
  { divisor: 1, suffix: "" },
] as const;

/**
 * Compact en-GB GBP for chart axes: "£1.2m", "£800k", "-£3.4k", "£0", "£1.5bn".
 * Returns "" for NaN or +/-Infinity so an axis tick renders nothing rather than a wrong figure.
 * Callers that show a standalone value should render "Not set" instead (see the data-viz docs).
 */
export function formatAxisCurrency(value: number, opts: FormatAxisCurrencyOptions = {}): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  const maxDigits = Math.max(0, Math.min(4, Math.trunc(opts.maxFractionDigits ?? 1)));

  let index = UNITS.findIndex((u) => abs >= u.divisor);
  if (index === -1) index = UNITS.length - 1;

  const round = (i: number) => {
    const unit = UNITS[i] as (typeof UNITS)[number];
    const digits = unit.divisor === 1 ? 0 : maxDigits;
    const factor = 10 ** digits;
    // Multiply before dividing so half-way cases such as 999_950 stay exact.
    return { unit, digits, factor, scaled: Math.round((abs * factor) / unit.divisor) };
  };

  let r = round(index);
  // A figure that rounds to 1000 of its unit belongs in the next unit up: 999_950 is "£1m".
  while (index > 0 && r.scaled >= 1000 * r.factor) {
    index -= 1;
    r = round(index);
  }

  const number = (r.scaled / r.factor).toLocaleString("en-GB", { maximumFractionDigits: r.digits });
  const sign = value < 0 && r.scaled !== 0 ? "-" : "";
  return `${sign}£${number}${r.unit.suffix}`;
}

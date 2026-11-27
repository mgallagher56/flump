/*
 * The en-GB formats a sample figure is shown in, by name, so a counting figure can carry its
 * format in the HTML (`data-format`) and the count-up moment writes every frame the same way.
 */

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
const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** £12,345 */
export const formatGbp = (value: number) => gbp.format(Math.round(value));
/** £12,300: to the nearest hundred, as the Home page shows net worth. */
export const formatGbpHundreds = (value: number) => gbp.format(Math.round(value / 100) * 100);
/** £1,234.56 */
export const formatGbpPence = (value: number) => gbpPence.format(value);
/** 4.5 months */
export const formatMonths = (value: number) =>
  `${oneDecimal.format(Math.round(value * 10) / 10)} months`;

export const FIGURE_FORMATS = {
  gbp: formatGbp,
  gbp100: formatGbpHundreds,
  months: formatMonths,
} as const;

export type FigureFormat = keyof typeof FIGURE_FORMATS;

/** The format named in `data-format`, or whole pounds when it is missing or unknown. */
export const figureFormat = (name: string | undefined) =>
  FIGURE_FORMATS[(name ?? "") as FigureFormat] ?? formatGbp;

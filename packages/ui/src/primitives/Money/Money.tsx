import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";
import { moneyRecipe, notSetActionRecipe, notSetRecipe } from "./Money.styles";

export type MoneySize = "kpi" | "lg" | "md" | "sm";
export type MoneyTone = "default" | "positive" | "danger" | "muted" | "onContrast";
export type SignDisplay = "auto" | "always" | "never";

/** Unknown means null, undefined, NaN or +/-Infinity. Real 0 is known. */
export const isKnownNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = JSON.stringify(options);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-GB", options);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

const validCurrencies = new Map<string, boolean>();

/** An invalid ISO 4217 code makes Intl throw a RangeError; fall back to GBP instead. */
const safeCurrency = (currency: string): string => {
  let ok = validCurrencies.get(currency);
  if (ok === undefined) {
    try {
      new Intl.NumberFormat("en-GB", { style: "currency", currency });
      ok = true;
    } catch {
      ok = false;
    }
    validCurrencies.set(currency, ok);
  }
  return ok ? currency : "GBP";
};

/**
 * Rounds to the display precision and removes negative zero so "-£0" can never appear. */
// Note: Math.round on the scaled value follows binary floating point, so 1.005 at two decimal
// places rounds to 1.00 (it is stored as 1.00499...). Acceptable for display; do not use for
// settlement maths.
const normalise = (value: number, fractionDigits: number): number => {
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
};

interface Formatted {
  /** Visible text, e.g. "-£1,234". */
  text: string;
  /** Screen-reader text, e.g. "minus £1,234", or undefined when the visible text reads fine. */
  spoken?: string;
}

const formatWith = (
  value: number,
  options: Intl.NumberFormatOptions,
  fractionDigits: number,
  signDisplay: SignDisplay,
): Formatted => {
  const normalised = normalise(value, fractionDigits);
  const base = {
    ...options,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
  const magnitude = getFormatter(base).format(Math.abs(normalised));
  const negative = normalised < 0;
  if (signDisplay === "never") return { text: magnitude };
  if (negative) return { text: `-${magnitude}`, spoken: `minus ${magnitude}` };
  if (signDisplay === "always") return { text: `+${magnitude}`, spoken: `plus ${magnitude}` };
  return { text: magnitude };
};

/** Compact notation (£97.8k, £1.2m). One decimal at most; en-GB prints "K" and "M", we use "k" and "m". */
const formatCompact = (
  value: number,
  options: Intl.NumberFormatOptions,
  signDisplay: SignDisplay,
): Formatted => {
  const formatter = getFormatter({
    ...options,
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const lower = (text: string) => text.replace(/[KM]\b/, (unit) => unit.toLowerCase());
  const magnitude = lower(formatter.format(Math.abs(value)));
  // Anything that rounds to zero must not read as a signed figure.
  const isZero = Number(formatter.format(Math.abs(value)).replace(/[^0-9.]/g, "")) === 0;
  if (signDisplay === "never") return { text: magnitude };
  if (value < 0 && !isZero) return { text: `-${magnitude}`, spoken: `minus ${magnitude}` };
  if (value > 0 && !isZero && signDisplay === "always") {
    return { text: `+${magnitude}`, spoken: `plus ${magnitude}` };
  }
  return { text: magnitude };
};

export const formatMoney = (
  value: number,
  {
    currency = "GBP",
    signDisplay = "auto",
    fractionDigits = 0,
    compact = false,
  }: {
    currency?: string;
    signDisplay?: SignDisplay;
    fractionDigits?: 0 | 2;
    compact?: boolean;
  } = {},
): Formatted => {
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: safeCurrency(currency),
  };
  if (compact) return formatCompact(value, options, signDisplay);
  return formatWith(value, options, fractionDigits, signDisplay);
};

export const formatNumber = (
  value: number,
  {
    kind = "number",
    signDisplay = "auto",
    fractionDigits = 0,
  }: { kind?: "number" | "percent"; signDisplay?: SignDisplay; fractionDigits?: number } = {},
): Formatted => {
  if (kind === "percent") {
    // value is already a percentage figure (4.5 means 4.5%), not a ratio.
    const f = formatWith(
      value,
      { style: "decimal", useGrouping: true },
      fractionDigits,
      signDisplay,
    );
    return { text: `${f.text}%`, spoken: f.spoken ? `${f.spoken} per cent` : undefined };
  }
  return formatWith(value, { style: "decimal", useGrouping: true }, fractionDigits, signDisplay);
};

interface UnknownProps {
  size: MoneySize;
  notSetLabel: string;
  notSetAction?: ReactNode;
  className?: string;
  id?: string;
  testId?: string;
}

const NotSet: FC<UnknownProps> = ({ size, notSetLabel, notSetAction, className, id, testId }) => (
  <span
    className={cx(moneyRecipe({ size, tone: "muted" }), className)}
    data-testid={testId ?? id}
    data-unknown="true"
    id={id}
  >
    <span className={notSetRecipe()}>{notSetLabel}</span>
    {notSetAction ? <span className={notSetActionRecipe()}>{notSetAction}</span> : null}
  </span>
);

const Known: FC<{
  formatted: Formatted;
  size: MoneySize;
  tone: MoneyTone;
  className?: string;
  id?: string;
  testId?: string;
}> = ({ formatted, size, tone, className, id, testId }) => (
  <span className={cx(moneyRecipe({ size, tone }), className)} data-testid={testId ?? id} id={id}>
    {formatted.spoken ? (
      <>
        <span aria-hidden="true">{formatted.text}</span>
        <VisuallyHidden>{formatted.spoken}</VisuallyHidden>
      </>
    ) : (
      formatted.text
    )}
  </span>
);

export interface MoneyProps {
  value: number | null | undefined;
  currency?: string;
  signDisplay?: SignDisplay;
  fractionDigits?: 0 | 2;
  /** Short form for tight spaces such as chart labels: £97.8k, £1.2m. Ignores `fractionDigits`. */
  compact?: boolean;
  size?: MoneySize;
  tone?: MoneyTone;
  /** Shown instead of a figure when the value is unknown (never £0). */
  notSetLabel?: string;
  /** Optional call to action beside "Not set", e.g. an "Add" button. */
  notSetAction?: ReactNode;
  className?: string;
  id?: string;
  "data-testid"?: string;
}

export const Money: FC<MoneyProps> = ({
  value,
  currency = "GBP",
  signDisplay = "auto",
  fractionDigits = 0,
  compact = false,
  size = "md",
  tone = "default",
  notSetLabel = "Not set",
  notSetAction,
  className,
  id,
  "data-testid": testId,
}) => {
  if (!isKnownNumber(value)) {
    return (
      <NotSet
        className={className}
        id={id}
        notSetAction={notSetAction}
        notSetLabel={notSetLabel}
        size={size}
        testId={testId}
      />
    );
  }
  return (
    <Known
      className={className}
      formatted={formatMoney(value, { currency, signDisplay, fractionDigits, compact })}
      id={id}
      size={size}
      testId={testId}
      tone={tone}
    />
  );
};

export interface NumProps {
  value: number | null | undefined;
  kind?: "number" | "percent";
  fractionDigits?: number;
  signDisplay?: SignDisplay;
  size?: MoneySize;
  tone?: MoneyTone;
  notSetLabel?: string;
  notSetAction?: ReactNode;
  className?: string;
  id?: string;
  "data-testid"?: string;
}

export const Num: FC<NumProps> = ({
  value,
  kind = "number",
  fractionDigits = 0,
  signDisplay = "auto",
  size = "md",
  tone = "default",
  notSetLabel = "Not set",
  notSetAction,
  className,
  id,
  "data-testid": testId,
}) => {
  if (!isKnownNumber(value)) {
    return (
      <NotSet
        className={className}
        id={id}
        notSetAction={notSetAction}
        notSetLabel={notSetLabel}
        size={size}
        testId={testId}
      />
    );
  }
  return (
    <Known
      className={className}
      formatted={formatNumber(value, { kind, signDisplay, fractionDigits })}
      id={id}
      size={size}
      testId={testId}
      tone={tone}
    />
  );
};

export default Money;

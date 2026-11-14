import { ArrowDown, ArrowUp, type LucideIcon, Minus } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { Money, type MoneyProps } from "../Money/Money";
import { StatusBadge, type StatusBadgeVariants } from "../StatusBadge/StatusBadge";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden";
import {
  kpiCardContainer,
  kpiDeltaContent,
  kpiDeltaRow,
  kpiEyebrow,
  kpiHeroValue,
  kpiLabel,
  kpiLoadingBar,
  kpiMoney,
  kpiNotSet,
  kpiNotSetAction,
  kpiSubtext,
  kpiValueRow,
} from "./KpiCard.styles";

export type KpiDeltaDirection = "up" | "down" | "flat";
/** `liability`: a falling balance is good news (positive tone), a rising one is danger. */
export type KpiDeltaPolarity = "asset" | "liability";

export interface KpiDelta {
  direction: KpiDeltaDirection;
  text: string;
  polarity?: KpiDeltaPolarity;
}

export type KpiCardTone = "default" | "hero";

export interface KpiCardProps {
  label: string;
  /**
   * @deprecated Use `HeroFigure` for the page's one headline figure (E16 P2). `KpiStrip` cards are
   * never the hero. Kept working so existing screens do not break.
   *
   * `hero` paints the card as the page's one deep-teal headline block (`surface.hero`). Use it at
   * most once per page. Figures inside should use `tone="onContrast"`. Falls back to the default
   * card while loading or when the value is unknown, so "Not set" keeps its muted contrast.
   * Action children (`action`, `emptyAction`) are not contrast-checked on the hero; avoid
   * interactive children until they are.
   */
  tone?: KpiCardTone;
  /**
   * A number renders through `Money` (en-GB, minus sign read as "minus", tabular-nums). `null`,
   * `undefined` or a non-finite number renders "Not set" (never a zero). Any other node is
   * rendered as given, as before.
   */
  value?: number | ReactNode;
  /** Formatting for a numeric `value` (ignored for other nodes). */
  valueFormat?: Pick<MoneyProps, "compact" | "currency" | "fractionDigits" | "signDisplay">;
  /** Legacy delta badge. Prefer `delta`, which adds an arrow so meaning never rests on colour. */
  deltaText?: string;
  deltaVariant?: StatusBadgeVariants["variant"];
  delta?: KpiDelta;
  /**
   * Optional one-line caption under the value. It contains no figure and does not restate the
   * value (E16 P1.5, P1.6). Leave it out when the label says enough.
   */
  subtext?: ReactNode;
  /** A small control beside the label (for example a menu). Not the "Not set" action. */
  action?: ReactNode;
  /** Shows a skeleton in place of the value and marks the card busy. */
  loading?: boolean;
  /** Label used when `value` is null or undefined. */
  notSetLabel?: string;
  /**
   * The one action shown under "Not set", normally a single link such as "Add your rate"
   * (E16 P3.1).
   */
  emptyAction?: ReactNode;
  /**
   * Overrides unknown-value detection for `KpiStrip`'s empty prompt (E16 P3.2). By default a card
   * is unset when `value` is null, undefined or a non-finite number and it is not loading.
   */
  unset?: boolean;
  className?: string;
}

const DELTA_ICON: Record<KpiDeltaDirection, LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

const DELTA_SPOKEN: Record<KpiDeltaDirection, string> = {
  up: "Up",
  down: "Down",
  flat: "No change",
};

/** True when a card with these props shows "Not set" (used by `KpiStrip`, E16 P3.2). */
export const isKpiCardUnset = (
  props: Pick<KpiCardProps, "value" | "loading" | "unset">,
): boolean => {
  if (props.unset !== undefined) return props.unset;
  if (props.loading) return false;
  const { value } = props;
  return (
    value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value))
  );
};

export const deltaTone = (
  direction: KpiDeltaDirection,
  polarity: KpiDeltaPolarity = "asset",
): NonNullable<StatusBadgeVariants["variant"]> => {
  if (direction === "flat") return "neutral";
  const good = polarity === "liability" ? direction === "down" : direction === "up";
  return good ? "positive" : "danger";
};

const renderValue = (
  value: ReactNode,
  valueFormat: KpiCardProps["valueFormat"],
  cardTone: KpiCardTone,
) =>
  typeof value === "number" ? (
    <Money
      {...valueFormat}
      className={kpiMoney()}
      size="kpi"
      tone={cardTone === "hero" ? "onContrast" : "default"}
      value={value}
    />
  ) : (
    <div className={kpiHeroValue({ tone: cardTone })}>{value}</div>
  );

export const KpiCard: FC<KpiCardProps> = ({
  label,
  value,
  valueFormat,
  deltaText,
  deltaVariant = "neutral",
  delta,
  subtext,
  action,
  loading = false,
  notSetLabel = "Not set",
  emptyAction,
  tone = "default",
  unset,
  className,
}) => {
  const isEmpty =
    value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value));
  const cardTone = tone === "hero" && !isEmpty && !loading ? "hero" : "default";

  return (
    <div
      aria-busy={loading || undefined}
      className={cx(kpiCardContainer({ tone: cardTone }), className)}
      data-tone={cardTone === "hero" ? "hero" : undefined}
      data-unset={isKpiCardUnset({ value, loading, unset }) || undefined}
    >
      <div className={kpiEyebrow()}>
        <span className={kpiLabel({ tone: cardTone })}>{label}</span>
        {action && <div>{action}</div>}
      </div>

      <div className={kpiValueRow()}>
        {loading ? (
          <>
            <div aria-hidden="true" className={kpiLoadingBar()} />
            <VisuallyHidden>Loading</VisuallyHidden>
          </>
        ) : isEmpty ? (
          // E16 P3.1: body size, regular weight, muted, so it never outranks a real value.
          <span className={kpiNotSet()} data-unknown="true">
            {notSetLabel}
          </span>
        ) : (
          renderValue(value, valueFormat, cardTone)
        )}
      </div>

      {!loading && isEmpty && emptyAction ? (
        <div className={kpiNotSetAction()}>{emptyAction}</div>
      ) : null}

      {/* The badge has its own row, so the value sits on the same baseline with or without it. */}
      {!loading && (delta || deltaText) ? (
        <div className={kpiDeltaRow()}>
          {delta ? (
            <StatusBadge size="sm" variant={deltaTone(delta.direction, delta.polarity)}>
              <span className={kpiDeltaContent()}>
                <Icon icon={DELTA_ICON[delta.direction]} size="sm" />
                <VisuallyHidden>{DELTA_SPOKEN[delta.direction]}</VisuallyHidden>
                <span>{delta.text}</span>
              </span>
            </StatusBadge>
          ) : (
            <StatusBadge size="sm" variant={deltaVariant}>
              {deltaText}
            </StatusBadge>
          )}
        </div>
      ) : null}

      {subtext && <div className={kpiSubtext({ tone: cardTone })}>{subtext}</div>}
    </div>
  );
};

export default KpiCard;

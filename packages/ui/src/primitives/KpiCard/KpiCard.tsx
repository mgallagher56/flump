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
  kpiEyebrow,
  kpiHeroValue,
  kpiLabel,
  kpiLoadingBar,
  kpiMoney,
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
  subtext?: ReactNode;
  action?: ReactNode;
  /** Shows a skeleton in place of the value and marks the card busy. */
  loading?: boolean;
  /** Label used when `value` is null or undefined. */
  notSetLabel?: string;
  /** Call to action shown beside "Not set", e.g. an "Add" button. */
  emptyAction?: ReactNode;
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
          <Money
            className={kpiMoney()}
            notSetAction={emptyAction}
            notSetLabel={notSetLabel}
            size="kpi"
            value={null}
          />
        ) : (
          renderValue(value, valueFormat, cardTone)
        )}
        {!loading && delta ? (
          <StatusBadge size="sm" variant={deltaTone(delta.direction, delta.polarity)}>
            <span className={kpiDeltaContent()}>
              <Icon icon={DELTA_ICON[delta.direction]} size="sm" />
              <VisuallyHidden>{DELTA_SPOKEN[delta.direction]}</VisuallyHidden>
              <span>{delta.text}</span>
            </span>
          </StatusBadge>
        ) : null}
        {!loading && !delta && deltaText ? (
          <StatusBadge size="sm" variant={deltaVariant}>
            {deltaText}
          </StatusBadge>
        ) : null}
      </div>

      {subtext && <div className={kpiSubtext({ tone: cardTone })}>{subtext}</div>}
    </div>
  );
};

export default KpiCard;

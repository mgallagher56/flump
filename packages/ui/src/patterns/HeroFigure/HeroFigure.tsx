import { ArrowDown, ArrowUp, type LucideIcon, Minus } from "lucide-react";
import { type FC, isValidElement, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../../primitives/Icon/Icon";
import { InfoTip } from "../../primitives/InfoTip/InfoTip";
import type { KpiDelta, KpiDeltaDirection } from "../../primitives/KpiCard/KpiCard";
import { formatMoney, type MoneyProps } from "../../primitives/Money/Money";
import { VisuallyHidden } from "../../primitives/VisuallyHidden/VisuallyHidden";
import { heroFigure } from "./HeroFigure.styles";

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

interface HeroFigureBaseProps {
  /** What the figure is, in sentence case ("Net worth"). */
  label: string;
  /**
   * The headline value. A number renders as whole pounds (en-GB, tabular, minus read as "minus").
   * `null`, `undefined`, a non-finite number or an empty string is unknown: the hero is not
   * drawn and a plain block with "Not set" and the prompt shows instead (E16 P2.3, P3).
   */
  value?: number | ReactNode;
  /**
   * How this figure is worked out (UX extra C): one or two plain sentences naming its inputs,
   * source and assumptions. Shown as an `InfoTip` beside the label, titled with the label.
   */
  explain?: ReactNode;
  /** Formatting for a numeric `value`. */
  valueFormat?: Pick<MoneyProps, "compact" | "currency" | "fractionDigits" | "signDisplay">;
  /** Replaces "Not set" when the value is unknown. */
  notSetLabel?: string;
  /** One sentence naming what to add, shown when the value is unknown. */
  emptyPrompt?: ReactNode;
  /** One action (a link or button) shown when the value is unknown. */
  emptyAction?: ReactNode;
  /**
   * Element id, also used as `data-testid` (component guidelines: tested elements pair the two).
   * Defaults to "hero-figure"; a page has one hero figure (P2.2), so the default is unique.
   */
  id?: string;
  className?: string;
}

/** One delta or one sub-line, never both (E16 P1.5, P6). */
export type HeroFigureProps = HeroFigureBaseProps &
  (
    | {
        /** One change figure under the value, drawn as an arrow plus text in the hero ink. */
        delta?: KpiDelta;
        subline?: never;
      }
    | {
        delta?: never;
        /** One short line under the value, with at most one figure. */
        subline?: ReactNode;
      }
  );

const isUnknown = (value: HeroFigureBaseProps["value"]) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (typeof value === "number" && !Number.isFinite(value));

const renderValue = (
  value: number | ReactNode,
  valueFormat: HeroFigureBaseProps["valueFormat"],
): ReactNode => {
  if (typeof value !== "number") return value;
  const formatted = formatMoney(value, valueFormat);
  return formatted.spoken ? (
    <>
      <span aria-hidden="true">{formatted.text}</span>
      <VisuallyHidden>{formatted.spoken}</VisuallyHidden>
    </>
  ) : (
    formatted.text
  );
};

/**
 * The page's one headline figure (E16 P2), placed directly under `PageHeader`. Draws the single
 * `surface.hero` block on the page (`data-tone="hero"`), with no decoration (E16 round 4: the disc crossed the sub-line on a phone). It never
 * holds an estimate or a scenario outcome. When the value is unknown it falls back to a plain card
 * with "Not set" and one setup prompt, and the hero is not drawn.
 */
export const HeroFigure: FC<HeroFigureProps> = ({
  label,
  value,
  valueFormat,
  explain,
  delta,
  subline,
  notSetLabel = "Not set",
  emptyPrompt,
  emptyAction,
  id = "hero-figure",
  className,
}) => {
  const labelId = useId();
  const unknown = isUnknown(value);
  const slots = heroFigure({ tone: unknown ? "plain" : "hero" });

  if (unknown) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a labelled group of text, not a form fieldset.
      <div
        aria-labelledby={labelId}
        className={cx(slots.root, className)}
        data-testid={id}
        id={id}
        role="group"
      >
        <div className={slots.content}>
          <p className={slots.label} id={labelId}>
            {label}
          </p>
          <p className={slots.unset} data-unknown="true">
            {notSetLabel}
          </p>
          {emptyPrompt ? <p className={slots.prompt}>{emptyPrompt}</p> : null}
          {emptyAction ? <div className={slots.action}>{emptyAction}</div> : null}
        </div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of text, not a form fieldset.
    <div
      aria-labelledby={labelId}
      className={cx(slots.root, className)}
      data-testid={id}
      data-tone="hero"
      id={id}
      role="group"
    >
      <div className={slots.content}>
        <div className={slots.labelRow}>
          <p className={slots.label} id={labelId}>
            {label}
          </p>
          {explain ? <InfoTip term={label}>{explain}</InfoTip> : null}
        </div>
        {isValidElement(value) ? (
          <div className={slots.value}>{value}</div>
        ) : (
          <p className={slots.value}>{renderValue(value, valueFormat)}</p>
        )}
        {delta ? (
          <p className={slots.delta}>
            <Icon icon={DELTA_ICON[delta.direction]} size="sm" />
            <VisuallyHidden>{DELTA_SPOKEN[delta.direction]}</VisuallyHidden>
            <span>{delta.text}</span>
          </p>
        ) : subline ? (
          <p className={slots.subline}>{subline}</p>
        ) : null}
      </div>
    </div>
  );
};

export default HeroFigure;

import { type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../../primitives/VisuallyHidden";
import { resultBlock } from "./ResultBlock.styles";

export interface ResultBlockRow {
  label: ReactNode;
  value: ReactNode;
}

export interface ResultBlockProps {
  /** Names the figure: "Breathing room". Also the accessible name of the block. */
  label: string;
  /**
   * Keeps the label as the block's accessible name without drawing it. For a section whose header
   * already shows the same words, so they are not printed twice.
   */
  hideLabel?: boolean;
  /** Sits beside the label: an info tip or an "Estimate" badge. */
  labelAddon?: ReactNode;
  /** A few words read before the figure: "About". */
  leadIn?: ReactNode;
  /**
   * The section's key figure, already formatted ("1.5 months", a `Money`). Null or undefined
   * shows `emptyPrompt` in the unset style: an unknown figure is never drawn as zero.
   */
  figure?: ReactNode;
  /** Shown in place of the figure when it is not known: "Not set", or a prompt to add details. */
  emptyPrompt?: ReactNode;
  /** One or two plain sentences under the figure. */
  note?: ReactNode;
  /** At most one supporting row: a label and its value. */
  row?: ResultBlockRow;
  /** Id for the root element (also data-testid). */
  id?: string;
  className?: string;
}

/**
 * The result card (E17 5A, STYLE-GUIDE 12.5): one per section, for that section's key figure. A
 * label, an optional lead-in, the figure at 36px, a note and at most one supporting row. It is a
 * plain card: never `surface.hero`, never a tint, never the accent.
 */
export const ResultBlock: FC<ResultBlockProps> = ({
  label,
  hideLabel = false,
  labelAddon,
  leadIn,
  figure,
  emptyPrompt = "Not set",
  note,
  row,
  id = "result-block",
  className,
}) => {
  const labelId = useId();
  const slots = resultBlock();
  const known = figure !== null && figure !== undefined && figure !== false;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of one figure, not a form fieldset
    <div
      aria-labelledby={labelId}
      className={cx(slots.root, className)}
      data-known={known ? "true" : "false"}
      data-testid={id}
      id={id}
      role="group"
    >
      {hideLabel ? (
        <VisuallyHidden id={labelId}>{label}</VisuallyHidden>
      ) : (
        <div className={slots.labelRow}>
          <p className={slots.label} id={labelId}>
            {label}
          </p>
          {labelAddon}
        </div>
      )}
      {known ? (
        <p className={slots.answer}>
          {leadIn ? <span className={slots.leadIn}>{leadIn} </span> : null}
          <span className={slots.figure} data-slot="figure">
            {figure}
          </span>
        </p>
      ) : (
        <p className={slots.empty} data-slot="empty">
          {emptyPrompt}
        </p>
      )}
      {note ? <p className={slots.note}>{note}</p> : null}
      {row ? (
        <dl className={slots.row}>
          <dt className={slots.rowLabel}>{row.label}</dt>
          <dd className={slots.rowValue}>{row.value}</dd>
        </dl>
      ) : null}
    </div>
  );
};

export default ResultBlock;

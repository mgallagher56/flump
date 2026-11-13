import type { FC } from "react";
import { taxEstimateNote } from "./TaxEstimateNote.styles";

export interface TaxEstimateNoteProps {
  /** Tax year whose rates produced the figure, e.g. "2026/27". */
  taxYear: string;
  /** Extra assumption to state next to the figure, e.g. "Assumes a 4% drawdown rate." */
  assumption?: string;
  className?: string;
  /** `onContrast` when the note sits on the hero surface. */
  tone?: "default" | "onContrast";
}

/**
 * The one shared line under every tax-derived figure: says it is an estimate, for which tax
 * year, and that it rests on what the user entered. Not advice, not an exact liability.
 */
export const TaxEstimateNote: FC<TaxEstimateNoteProps> = ({
  taxYear,
  assumption,
  className,
  tone = "default",
}) => (
  <p
    className={`${taxEstimateNote({ tone })} ${className ?? ""}`.trim()}
    data-testid="tax-estimate-note"
  >
    Estimate for {taxYear}, based on the figures you entered
    {assumption ? `. ${assumption}` : ""}
  </p>
);

export default TaxEstimateNote;

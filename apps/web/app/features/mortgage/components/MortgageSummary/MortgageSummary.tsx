import { Button, Icon } from "@repo/ui";
import { Check } from "lucide-react";
import type { FC } from "react";
import {
  detailLabel,
  detailRow,
  detailsList,
  detailValue,
  savedLine,
  saveMessage,
  summaryActions,
  summaryCard,
  summaryHeader,
  summaryTitle,
} from "./MortgageSummary.styles";

const termFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export type MortgageKind = "repayment" | "interest-only";

export interface MortgageSummaryProps {
  propertyCategory: "residential" | "btl";
  mortgageType: MortgageKind;
  /** Years left, 0 when not saved. Buy to let stores no term, so it is not listed. */
  remainingTerm: number;
  /** The linked mortgage account's name, or `null` when none is linked. Residential only. */
  accountName?: string | null;
  /** "Last updated" wording for the Saved line, or `null` when no date is known. */
  lastUpdated: string | null;
  /** "Saved balance and interest rate", shown briefly after a save. */
  saveMessage: string | null;
  /** Opens the edit dialog. */
  onEdit: () => void;
}

/**
 * "Your details" (E16 PR 6): the saved facts the headline figures do not already show, with the one
 * "Edit" button. Balance, rate and payment sit in the hero and strip above, so they are not
 * repeated here (P6).
 */
export const MortgageSummary: FC<MortgageSummaryProps> = ({
  propertyCategory,
  mortgageType,
  remainingTerm,
  accountName = null,
  lastUpdated,
  saveMessage: savedText,
  onEdit,
}) => {
  const isBtl = propertyCategory === "btl";
  return (
    <section
      aria-labelledby="mortgage-summary-title"
      className={summaryCard()}
      data-testid="mortgage-summary"
      id="mortgage-summary"
    >
      <div className={summaryHeader()}>
        <div>
          <h2 className={summaryTitle()} id="mortgage-summary-title">
            Your details
          </h2>
          <p className={savedLine()} id="mortgage-saved-line">
            <Icon icon={Check} size="sm" />
            Saved{lastUpdated ? `. ${lastUpdated}` : ""}
          </p>
        </div>
        <div className={summaryActions()}>
          {savedText ? (
            <span className={saveMessage()} role="status">
              {savedText}
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>

      <dl className={detailsList()}>
        <div className={detailRow()}>
          <dt className={detailLabel()}>Type</dt>
          <dd className={detailValue()}>{isBtl ? "Buy to let" : "Residential"}</dd>
        </div>
        {!isBtl ? (
          <div className={detailRow()}>
            <dt className={detailLabel()}>Mortgage account</dt>
            <dd className={detailValue()}>{accountName ?? "None linked"}</dd>
          </div>
        ) : null}
        <div className={detailRow()}>
          <dt className={detailLabel()}>Repayment type</dt>
          <dd className={detailValue()}>
            {mortgageType === "repayment" ? "Repayment" : "Interest-only"}
          </dd>
        </div>
        {!isBtl && remainingTerm > 0 ? (
          <div className={detailRow()}>
            <dt className={detailLabel()}>Years left</dt>
            <dd className={detailValue()}>
              {termFormat.format(remainingTerm)} {remainingTerm === 1 ? "year" : "years"}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
};

import { estimateHomeEquity } from "@flump/finance-engine";
import { Button, Icon, Money, PageSection } from "@repo/ui";
import { Check, ClipboardList } from "lucide-react";
import type { FC } from "react";
import { equityShareSubline } from "~/features/mortgage/components/HomeEquityLine";
import { formatYearsLeft } from "~/features/mortgage/mortgageFormat";
import {
  detailLabel,
  detailRow,
  detailSubline,
  detailsList,
  detailValue,
  savedLine,
  saveMessage,
  summaryActions,
  summaryCard,
} from "./MortgageSummary.styles";

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
  /**
   * The saved home value and the whole mortgage balance, each with the user's own share (`null`
   * when held solely), for the "Your equity" row. `null` when no home value is saved, or when
   * there are two or more homes: no row shows.
   */
  homeEquity?: {
    homeValue: number;
    homeSharePercent: number | null;
    mortgageBalance: number;
    mortgageSharePercent: number | null;
  } | null;
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
  homeEquity = null,
}) => {
  const isBtl = propertyCategory === "btl";
  // Worked out by the finance engine: never a formula here.
  const equity = homeEquity ? estimateHomeEquity(homeEquity) : null;
  const equityShare = homeEquity
    ? equityShareSubline(
        homeEquity.homeSharePercent,
        homeEquity.mortgageSharePercent,
        homeEquity.mortgageBalance !== 0,
      )
    : null;
  return (
    <PageSection
      action={
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
      }
      description="The saved details behind your mortgage figures."
      domain="mortgage"
      headingId="mortgage-summary-title"
      icon={ClipboardList}
      id="mortgage-summary"
      title="Your details"
    >
      <div className={summaryCard()}>
        <p className={savedLine()} id="mortgage-saved-line">
          <Icon icon={Check} size="sm" />
          Saved{lastUpdated ? `. ${lastUpdated}` : ""}
        </p>

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
              <dd className={detailValue()}>{formatYearsLeft(remainingTerm)}</dd>
            </div>
          ) : null}
          {equity ? (
            <div className={detailRow()} data-testid="mortgage-equity">
              <dt className={detailLabel()}>Your equity</dt>
              <dd className={detailValue()}>
                <Money size="md" value={equity.yours} />
                {equityShare ? <span className={detailSubline()}>{equityShare}</span> : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </PageSection>
  );
};

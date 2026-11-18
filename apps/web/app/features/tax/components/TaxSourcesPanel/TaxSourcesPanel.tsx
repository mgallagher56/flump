import { isRecordActiveInTaxYear, type TaxRecord } from "@flump/finance-engine";
import { IconTile, PageSection } from "@repo/ui";
import { Briefcase, Home, Laptop, Layers, type LucideIcon, PiggyBank } from "lucide-react";
import type { FC, ReactNode } from "react";
import { SOURCE_OPTIONS } from "../../tax-labels";
import TaxIncomeSectionCard from "../TaxIncomeSectionCard";
import {
  btlDetails,
  btlIdentity,
  btlMeta,
  btlName,
  btlSourceRow,
  list,
} from "./TaxSourcesPanel.styles";

const SOURCE_ICON: Record<(typeof SOURCE_OPTIONS)[number]["value"], LucideIcon> = {
  "self-employed": Laptop,
  rental: Home,
  savings: PiggyBank,
  paye: Briefcase,
};

/** Non-PAYE sources first: they are what the page is for. */
const ORDER = ["self-employed", "rental", "savings", "paye"] as const;

export interface BtlSourceAccount {
  id: string;
  name: string;
}

export interface TaxSourcesPanelProps {
  records: TaxRecord[];
  taxYear: string;
  /** The page's one "Add income" menu, shown beside the heading. */
  action?: ReactNode;
  /** Buy-to-let mortgage accounts, surfaced automatically as a rental income source. */
  btlAccounts?: readonly BtlSourceAccount[];
}

/**
 * "Income sources": one list, a row per source that has records in the tax year (plus any
 * buy-to-let mortgage accounts so they surface automatically even before rental records are
 * added). Rental income is added from the heading's one "Add income" menu, never from the row.
 */
export const TaxSourcesPanel: FC<TaxSourcesPanelProps> = ({
  records,
  taxYear,
  action,
  btlAccounts = [],
}) => {
  const hasRecords = records.some((r) => isRecordActiveInTaxYear(r, taxYear));
  const hasRentalRecords = records.some(
    (r) => r.source === "rental" && isRecordActiveInTaxYear(r, taxYear),
  );
  if (!hasRecords && btlAccounts.length === 0) return null;
  const labels = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));
  // With one source outside PAYE, its income less expenses is the strip's "Income after expenses": the
  // row keeps its name and count and leaves the figure to the strip, beside the bill it sets.
  const nonPayeSources = new Set(
    records
      .filter((r) => r.source !== "paye" && isRecordActiveInTaxYear(r, taxYear))
      .map((r) => r.source),
  );

  return (
    <PageSection
      action={action}
      description="Your income in this tax year, by where it comes from."
      domain="tax"
      headingId="tax-sources-heading"
      icon={Layers}
      id="tax-sources"
      title="Income sources"
    >
      <ul className={list()}>
        {ORDER.map((source) => (
          <TaxIncomeSectionCard
            key={source}
            icon={SOURCE_ICON[source]}
            records={records}
            selectedTaxYear={taxYear}
            showTotal={source === "paye" || nonPayeSources.size > 1}
            source={source}
            title={labels[source] ?? source}
          />
        ))}
        {!hasRentalRecords && btlAccounts.length > 0 ? (
          <li className={btlSourceRow()} data-list-row="" data-source="rental">
            <span className={btlIdentity()}>
              <IconTile domain="tax" icon={Home} />
              <span className={btlDetails()}>
                <span className={btlName()}>{labels.rental ?? "Property and buy-to-let"}</span>
                <span className={btlMeta()}>
                  {`From your ${btlAccounts.length === 1 ? "account" : "accounts"}: ${btlAccounts.map((a) => a.name).join(", ")}`}
                </span>
              </span>
            </span>
          </li>
        ) : null}
      </ul>
    </PageSection>
  );
};

export default TaxSourcesPanel;

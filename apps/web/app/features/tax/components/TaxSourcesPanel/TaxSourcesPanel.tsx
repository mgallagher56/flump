import { isRecordActiveInTaxYear, type TaxRecord } from "@flump/finance-engine";
import { Briefcase, Home, Laptop, type LucideIcon, PiggyBank } from "lucide-react";
import type { FC, ReactNode } from "react";
import { SOURCE_OPTIONS } from "../../tax-labels";
import TaxIncomeSectionCard from "../TaxIncomeSectionCard";
import { header, heading, list, root } from "./TaxSourcesPanel.styles";

const SOURCE_ICON: Record<(typeof SOURCE_OPTIONS)[number]["value"], LucideIcon> = {
  "self-employed": Laptop,
  rental: Home,
  savings: PiggyBank,
  paye: Briefcase,
};

/** Non-PAYE sources first: they are what the page is for. */
const ORDER = ["self-employed", "rental", "savings", "paye"] as const;

export interface TaxSourcesPanelProps {
  records: TaxRecord[];
  taxYear: string;
  /** The page's one "Add income" menu, shown beside the heading. */
  action?: ReactNode;
}

/**
 * "Income sources": one list, a row per source that has records in the tax year. Sources with
 * no records show nothing; with no records at all the section is not drawn (the hero says what
 * to add instead).
 */
export const TaxSourcesPanel: FC<TaxSourcesPanelProps> = ({ records, taxYear, action }) => {
  const hasRecords = records.some((r) => isRecordActiveInTaxYear(r, taxYear));
  if (!hasRecords) return null;
  const labels = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));
  // With one source outside PAYE, its income less costs is the strip's "Income after costs": the
  // row keeps its name and count and leaves the figure to the strip, beside the bill it sets.
  const nonPayeSources = new Set(
    records
      .filter((r) => r.source !== "paye" && isRecordActiveInTaxYear(r, taxYear))
      .map((r) => r.source),
  );

  return (
    <section aria-labelledby="tax-sources-heading" className={root()}>
      <div className={header()}>
        <h2 className={heading()} id="tax-sources-heading">
          Income sources
        </h2>
        {action}
      </div>
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
      </ul>
    </section>
  );
};

export default TaxSourcesPanel;

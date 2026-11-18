import {
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import { Icon, IconTile, Money } from "@repo/ui";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link } from "react-router";
import { sourcePagePath } from "../../source-pages";
import {
  amount,
  amountCaption,
  chevron,
  details,
  identity,
  meta,
  name,
  row,
  rowLink,
  total,
} from "./TaxIncomeSectionCard.styles";

const countFormat = new Intl.NumberFormat("en-GB");

export interface TaxIncomeSectionCardProps {
  source: TaxSource;
  title: string;
  icon: LucideIcon;
  records: TaxRecord[];
  selectedTaxYear: string;
  /**
   * Show the income less expenses. Default true. False when this is the only source outside PAYE,
   * because the page's "Income after expenses" card already shows the same figure.
   */
  showTotal?: boolean;
}

/**
 * One income source as a row of the sources list: its name, how many records it has and its
 * income less expenses for the selected tax year, in whole pounds. The whole row is one link to
 * the source's own page on the same tax year. A source with no records in the year renders
 * nothing (E16 PR 8: no "0 records" badge and no £0 total).
 */
export const TaxIncomeSectionCard: FC<TaxIncomeSectionCardProps> = ({
  source,
  title,
  icon,
  records,
  selectedTaxYear,
  showTotal = true,
}) => {
  const sectionRecords = useMemo(
    () => records.filter((r) => r.source === source && isRecordActiveInTaxYear(r, selectedTaxYear)),
    [records, source, selectedTaxYear],
  );

  const net = useMemo(
    () =>
      sectionRecords.reduce((sum, r) => {
        const yearly = getRecordAnnualTotalForTaxYear(r, selectedTaxYear);
        return r.type === "income" ? sum + yearly : sum - yearly;
      }, 0),
    [sectionRecords, selectedTaxYear],
  );

  const count = sectionRecords.length;
  if (count === 0) return null;

  return (
    <li
      className={row()}
      data-list-row=""
      data-source={source}
      data-testid={`tax-source-${source}`}
      id={`tax-source-${source}`}
    >
      <Link className={rowLink()} to={sourcePagePath(source, selectedTaxYear)}>
        <span className={identity()}>
          <IconTile domain="tax" icon={icon} />
          <span className={details()}>
            <span className={name()}>{title}</span>
            <span className={meta()}>
              {countFormat.format(count)} {count === 1 ? "record" : "records"}
            </span>
          </span>
        </span>
        {showTotal ? (
          <span className={total()}>
            <span className={amount()}>
              <Money fractionDigits={0} size="sm" value={net} />
            </span>
            <span className={amountCaption()}>a year, after expenses</span>
          </span>
        ) : null}
        <span className={chevron()}>
          <Icon icon={ChevronRight} size="sm" />
        </span>
      </Link>
    </li>
  );
};

export default TaxIncomeSectionCard;

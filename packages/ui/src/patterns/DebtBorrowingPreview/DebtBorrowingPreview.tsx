import {
  buildFinancialPicture,
  PortfolioSnapshot,
  SAMPLE_HOUSEHOLDS,
  type SampleHouseholdKey,
} from "@flump/finance-engine";
import { CreditCard, GraduationCap, House } from "lucide-react";
import type { FC } from "react";
import { IconTile, type IconTileDomain } from "../../primitives/IconTile/IconTile";
import { formatMoney } from "../../primitives/Money/Money";
import { checkInAccountLabel } from "../CheckInPreview/CheckInPreview";
import {
  debtBorrowingList,
  debtBorrowingNote,
  debtBorrowingRoot,
  debtBorrowingRow,
  debtBorrowingRowDetail,
  debtBorrowingRowFigure,
  debtBorrowingRowName,
  debtBorrowingRowText,
  debtBorrowingSection,
  debtBorrowingSectionHeader,
  debtBorrowingSectionTitle,
  debtBorrowingSummary,
  debtBorrowingSummaryFigure,
  debtBorrowingSummaryLabel,
} from "./DebtBorrowingPreview.styles";

export interface DebtBorrowingPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
  /** The date date-based estimates are measured from. Defaults to today. */
  asOf?: Date;
}

const NOT_SET = "Not set";

interface PreviewRow {
  id: string;
  name: string;
  detail: string;
  figure: string;
}

interface PreviewSection {
  id: string;
  title: string;
  label: string;
  domain: IconTileDomain;
  icon: typeof CreditCard;
  rows: PreviewRow[];
}

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;
const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const monthYearFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "September 2028" from a stored YYYY-MM-DD date (formatting only, no date arithmetic). */
const monthYear = (isoDate: string): string =>
  monthYearFormat.format(new Date(`${isoDate}T00:00:00Z`));

/**
 * A sample household's debts and borrowing: cards and loans with their rates and an estimated
 * debt-free date on minimum payments, a student loan where there is one, and, where the household
 * has a mortgage, its balance, rate and when its fixed rate ends. A household with no mortgage
 * simply has no mortgage section. Every figure comes from `@flump/finance-engine` over the
 * `SAMPLE_HOUSEHOLDS` fixture; an unknown figure reads "Not set". Rates are shown as facts, with
 * no label or colour that judges them.
 */
export const DebtBorrowingPreview: FC<DebtBorrowingPreviewProps> = ({
  id = "debt-borrowing-preview",
  household = "renter",
  className,
  asOf,
}) => {
  const { fixture } = SAMPLE_HOUSEHOLDS[household];
  const snapshot = new PortfolioSnapshot(fixture.accounts, fixture.details);
  const picture = buildFinancialPicture(fixture, { snapshot, asOf });
  const resolved = snapshot.getResolvedAccounts();
  const { debtSummary } = picture;

  const rateLine = (known: boolean, rate: number, unit: string) =>
    known ? `${percentFormat.format(rate)}% ${unit}` : `${unit}: ${NOT_SET}`;

  const cardsAndLoans: PreviewRow[] = (debtSummary?.debts ?? []).map((debt) => {
    const account = resolved.find((a) => a.id === debt.id);
    return {
      id: debt.id,
      name: checkInAccountLabel(debt.name, account?.rawType ?? "Loan"),
      detail: rateLine(debt.aprKnown !== false, debt.apr ?? 0, "APR"),
      figure: debt.balance === undefined ? NOT_SET : gbp(debt.balance),
    };
  });

  const studentLoans: PreviewRow[] = resolved
    .filter((account) => account.category === "studentLoans")
    .map((account) => ({
      id: account.id,
      name: checkInAccountLabel(account.name, account.rawType),
      detail: "Repayments come out of your pay",
      figure: gbp(account.nominalBalance),
    }));

  const mortgages: PreviewRow[] = resolved
    .filter((account) => account.category === "mortgages")
    .map((account) => {
      const fixEnd = picture.fixedRateEnds.find((f) => f.accountId === account.id);
      const rate = rateLine(account.interestRateKnown, account.interestRate, "interest");
      return {
        id: account.id,
        name: checkInAccountLabel(account.name, account.rawType),
        detail: fixEnd && !fixEnd.ended ? `${rate}, fixed until ${monthYear(fixEnd.date)}` : rate,
        figure: gbp(account.nominalBalance),
      };
    });

  const sections: PreviewSection[] = [];
  if (cardsAndLoans.length > 0) {
    sections.push({
      id: "cards-and-loans",
      title: "Cards and loans",
      label: "Cards and loans",
      domain: "debt",
      icon: CreditCard,
      rows: cardsAndLoans,
    });
  }
  if (studentLoans.length > 0) {
    sections.push({
      id: "student-loan",
      title: "Student loan",
      label: "Student loans",
      domain: "debt",
      icon: GraduationCap,
      rows: studentLoans,
    });
  }
  if (mortgages.length > 0) {
    sections.push({
      id: "mortgage",
      title: "Mortgage",
      label: "Mortgages",
      domain: "mortgage",
      icon: House,
      rows: mortgages,
    });
  }

  return (
    <div className={`${debtBorrowingRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      {sections.map((section) => (
        <section
          aria-labelledby={`${id}-${section.id}-title`}
          className={debtBorrowingSection()}
          data-testid={`${id}-${section.id}`}
          key={section.id}
        >
          <div className={debtBorrowingSectionHeader()}>
            <IconTile domain={section.domain} icon={section.icon} />
            <h3 className={debtBorrowingSectionTitle()} id={`${id}-${section.id}-title`}>
              {section.title}
            </h3>
          </div>
          <ul aria-label={section.label} className={debtBorrowingList()}>
            {section.rows.map((row) => (
              <li
                className={debtBorrowingRow()}
                data-testid={`${id}-${section.id}-${row.id}`}
                key={row.id}
              >
                <span className={debtBorrowingRowText()}>
                  <span className={debtBorrowingRowName()}>{row.name}</span>
                  <span className={debtBorrowingRowDetail()}>{row.detail}</span>
                </span>
                <span className={debtBorrowingRowFigure()}>{row.figure}</span>
              </li>
            ))}
          </ul>
          {section.id === "cards-and-loans" && (
            <>
              <div className={debtBorrowingSummary()} data-testid={`${id}-debt-free-date`}>
                <p className={debtBorrowingSummaryLabel()}>Estimated debt-free date</p>
                <p className={debtBorrowingSummaryFigure()}>
                  {debtSummary?.debtFreeDate ?? NOT_SET}
                </p>
              </div>
              <p className={debtBorrowingNote()}>
                An estimate, if each debt is paid at its minimum payment.
              </p>
            </>
          )}
        </section>
      ))}
    </div>
  );
};

export default DebtBorrowingPreview;

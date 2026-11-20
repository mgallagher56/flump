import {
  calculateWorkplacePensionContributions,
  estimateSavingsInterestNext12Months,
  PortfolioSnapshot,
  SAMPLE_HOUSEHOLDS,
  type SampleHouseholdKey,
  workplacePensionFromProfile,
} from "@flump/finance-engine";
import { PiggyBank, Sprout } from "lucide-react";
import type { FC } from "react";
import { IconTile } from "../../primitives/IconTile/IconTile";
import { formatMoney } from "../../primitives/Money/Money";
import { checkInAccountLabel } from "../CheckInPreview/CheckInPreview";
import {
  savingsPensionList,
  savingsPensionNote,
  savingsPensionRoot,
  savingsPensionRow,
  savingsPensionRowDetail,
  savingsPensionRowFigure,
  savingsPensionRowName,
  savingsPensionRowText,
  savingsPensionSection,
  savingsPensionSectionHeader,
  savingsPensionSectionTitle,
  savingsPensionSummary,
  savingsPensionSummaryFigure,
  savingsPensionSummaryLabel,
} from "./SavingsPensionPreview.styles";

export interface SavingsPensionPreviewProps {
  id?: string;
  household?: SampleHouseholdKey;
  className?: string;
}

const NOT_SET = "Not set";

/** The stored account types the app's Savings page lists. */
const SAVINGS_TYPES: ReadonlySet<string> = new Set(["Saving", "Investment"]);

interface PreviewRow {
  id: string;
  name: string;
  detail?: string;
  figure: string;
}

const gbp = (value: number) => formatMoney(value, { fractionDigits: 0 }).text;
const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const aer = (rate: number) => `${percentFormat.format(rate)}% AER`;

/**
 * A sample household's savings and pension: each savings account with its AER, an estimate of the
 * interest over the next 12 months, each pension pot, and what the person and their employer pay
 * in each month. Every figure comes from `@flump/finance-engine` over the `SAMPLE_HOUSEHOLDS`
 * fixture, and an unknown figure reads "Not set". There is no headline figure, no target and no
 * suggestion to pay in more: the preview shows facts and estimates only.
 */
export const SavingsPensionPreview: FC<SavingsPensionPreviewProps> = ({
  id = "savings-pension-preview",
  household = "renter",
  className,
}) => {
  const sample = SAMPLE_HOUSEHOLDS[household];
  const { fixture } = sample;
  const resolved = new PortfolioSnapshot(fixture.accounts, fixture.details).getResolvedAccounts();

  const savingsRows: PreviewRow[] = resolved
    .filter((account) => SAVINGS_TYPES.has(account.rawType))
    .map((account) => ({
      id: account.id,
      name: checkInAccountLabel(account.name, account.rawType),
      detail: account.interestRateKnown ? aer(account.interestRate) : `AER: ${NOT_SET}`,
      figure: gbp(account.nominalBalance),
    }));
  // Each account as stored: the engine reads the balance, AER, monthly saving and share itself.
  const interest = estimateSavingsInterestNext12Months(
    fixture.accounts.map((account) => ({ ...account, balance: account.balance })),
  );

  const potRows: PreviewRow[] = resolved
    .filter((account) => account.category === "pensions")
    .map((account) => ({
      id: account.id,
      name: checkInAccountLabel(account.name, account.rawType),
      figure: gbp(account.nominalBalance),
    }));

  const pension = workplacePensionFromProfile({
    annualSalary: fixture.profile.annualSalary,
    employmentType: fixture.profile.employmentType,
    pensionPercent: fixture.profile.pensionPercent,
    isSalarySacrifice: fixture.profile.isSalarySacrifice,
    pensionEmployerPercent: sample.pensionEmployerPercent,
  });
  const contributions = pension ? calculateWorkplacePensionContributions(pension) : null;
  const notSet = pension?.notSet ?? [];
  const youPayIn =
    contributions && !notSet.includes("pensionPercent")
      ? gbp(contributions.monthlyEmployee)
      : NOT_SET;
  const employerPaysIn =
    contributions && !notSet.includes("pensionEmployerPercent")
      ? gbp(contributions.monthlyEmployer)
      : NOT_SET;
  const paidInRows: PreviewRow[] = [
    { id: "you", name: "You pay in each month", figure: youPayIn },
    { id: "employer", name: "Your employer pays in each month", figure: employerPaysIn },
  ];

  const renderRows = (rows: PreviewRow[], listId: string, label: string) => (
    <ul aria-label={label} className={savingsPensionList()} data-testid={listId}>
      {rows.map((row) => (
        <li className={savingsPensionRow()} data-testid={`${listId}-${row.id}`} key={row.id}>
          <span className={savingsPensionRowText()}>
            <span className={savingsPensionRowName()}>{row.name}</span>
            {row.detail && <span className={savingsPensionRowDetail()}>{row.detail}</span>}
          </span>
          <span className={savingsPensionRowFigure()}>{row.figure}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`${savingsPensionRoot()} ${className ?? ""}`.trim()} data-testid={id} id={id}>
      {savingsRows.length > 0 && (
        <section
          aria-labelledby={`${id}-savings-title`}
          className={savingsPensionSection()}
          data-testid={`${id}-savings`}
        >
          <div className={savingsPensionSectionHeader()}>
            <IconTile domain="savings" icon={PiggyBank} />
            <h3 className={savingsPensionSectionTitle()} id={`${id}-savings-title`}>
              Savings
            </h3>
          </div>
          {renderRows(savingsRows, `${id}-savings-list`, "Savings accounts")}
          <div className={savingsPensionSummary()} data-testid={`${id}-interest`}>
            <p className={savingsPensionSummaryLabel()}>
              Estimated interest over the next 12 months, before tax
            </p>
            <p className={savingsPensionSummaryFigure()}>
              {interest ? gbp(interest.total) : NOT_SET}
            </p>
          </div>
        </section>
      )}

      <section
        aria-labelledby={`${id}-pension-title`}
        className={savingsPensionSection()}
        data-testid={`${id}-pension`}
      >
        <div className={savingsPensionSectionHeader()}>
          <IconTile domain="pension" icon={Sprout} />
          <h3 className={savingsPensionSectionTitle()} id={`${id}-pension-title`}>
            Pension
          </h3>
        </div>
        {potRows.length > 0 && renderRows(potRows, `${id}-pots`, "Pension pots")}
        {renderRows(paidInRows, `${id}-paid-in`, "Paid into your workplace pension")}
        <p className={savingsPensionNote()}>
          Estimated from your salary and the contribution rates you saved.
        </p>
      </section>
    </div>
  );
};

export default SavingsPensionPreview;

import type { FC, ReactNode } from "react";
import {
  balanceOf,
  formatGbp,
  formatMonthYear,
  PICTURE,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_DASHBOARD,
  SAMPLE_SALARY,
} from "../shared/sampleData";

/*
 * The sample cards, one per stop. Each renders in normal flow as the still version; the 3D scene
 * clones it and splits it at every `data-part`, so the parts can sit apart in depth and come
 * together as the camera arrives. Every figure is the sample household's, labelled "Example".
 */

const cardAndLoan = balanceOf(SAMPLE_ACCOUNTS.creditCard) + balanceOf(SAMPLE_ACCOUNTS.loan);

const takeHome = PICTURE.takeHome.status === "known" ? PICTURE.takeHome.value : null;
const fixedEnd = SAMPLE_ACCOUNTS.mortgage?.fixedRateEndDate;
const debtFree = PICTURE.debtSummary?.debtFreeDate;

const Card: FC<{ title: string; wide?: boolean; children: ReactNode }> = ({
  title,
  wide,
  children,
}) => (
  <figure className={wide ? "p7-card p7-card--wide" : "p7-card"} data-stop-card="">
    <figcaption className="p7-card__head" data-part="">
      <span className="p7-card__title">{title}</span>
      <span className="p7-card__tag">Example</span>
    </figcaption>
    {children}
  </figure>
);

const Row: FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <p className="p7-card__row" data-part="">
    <span className="p7-card__label">
      {label}
      {note && <span className="p7-card__note">{note}</span>}
    </span>
    <span className="p7-card__value tabular-nums">{value}</span>
  </p>
);

const Total: FC<{ label: string; value: string }> = ({ label, value }) => (
  <p className="p7-card__total" data-part="">
    <span className="p7-card__label">{label}</span>
    <span className="p7-card__big tabular-nums">{value}</span>
  </p>
);

const AccountsCard: FC = () => (
  <Card title="Accounts">
    <Row label="Cash and emergency savings" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.savings))} />
    <Row label="Pensions" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.pension))} />
    <Row label="Home (your estimate)" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.home))} />
    <Row label="Mortgage" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.mortgage))} />
    <Row label="Card and loan" value={formatGbp(cardAndLoan)} />
  </Card>
);

const BudgetCard: FC = () => {
  const total = SAMPLE_BUDGET.comesIn;
  return (
    <Card title="Budget, each month">
      <Row label="Comes in" value={formatGbp(SAMPLE_BUDGET.comesIn)} />
      <Row label="Goes out" value={formatGbp(SAMPLE_BUDGET.goesOut)} />
      <div className="p7-card__bar" data-part="">
        {SAMPLE_BUDGET.outgoings.map((entry, index) => (
          <span
            className="p7-card__segment"
            key={entry.id}
            style={{ flexGrow: entry.amount / total, opacity: 1 - index * 0.12 }}
            title={entry.label}
          />
        ))}
        <span
          className="p7-card__segment p7-card__segment--left"
          style={{ flexGrow: SAMPLE_BUDGET.leftOver / total }}
        />
      </div>
      <Total label="Left over" value={formatGbp(SAMPLE_BUDGET.leftOver)} />
    </Card>
  );
};

const PayCard: FC = () => (
  <Card title={`Take-home pay, ${takeHome?.taxYear ?? "2026/27"}`}>
    <Row label="Salary" value={formatGbp(SAMPLE_SALARY ?? 0)} note="a year" />
    <Row label="Income Tax" value={formatGbp(takeHome?.incomeTax ?? 0)} note="a year" />
    <Row
      label="National Insurance"
      value={formatGbp(takeHome?.nationalInsurance ?? 0)}
      note="a year"
    />
    <Row label="Pension" value={formatGbp(takeHome?.pension ?? 0)} note="a year" />
    <Total label="Take-home pay, a month" value={formatGbp(takeHome?.monthly ?? 0)} />
  </Card>
);

const SavingsCard: FC = () => (
  <Card title="Savings and pension">
    <Row
      label="Cash and emergency savings"
      note={`${SAMPLE_ACCOUNTS.savings?.interestRate ?? 0}% AER`}
      value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.savings))}
    />
    <Row
      label="Pension paid in"
      note="a month"
      value={formatGbp(PICTURE.pensionContributionMonthly ?? 0)}
    />
    <Total label="Pension pots" value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.pension))} />
  </Card>
);

const DebtCard: FC = () => (
  <Card title="Debt and borrowing">
    <Row
      label="Credit card"
      note={`${SAMPLE_ACCOUNTS.creditCard?.interestRate ?? 0}%`}
      value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.creditCard))}
    />
    <Row
      label="Personal loan"
      note={`${SAMPLE_ACCOUNTS.loan?.interestRate ?? 0}%`}
      value={formatGbp(balanceOf(SAMPLE_ACCOUNTS.loan))}
    />
    {fixedEnd && <Row label="Mortgage fixed rate ends" value={formatMonthYear(fixedEnd)} />}
    {debtFree && <Total label="Card and loan paid off, estimate" value={debtFree} />}
  </Card>
);

const DashboardCard: FC = () => (
  <Card title="Your Home page" wide>
    <div className="p7-dash">
      <p className="p7-dash__tile" data-part="">
        <span className="p7-card__label">Net worth</span>
        <span className="p7-dash__figure tabular-nums">{formatGbp(SAMPLE_DASHBOARD.netWorth)}</span>
      </p>
      {SAMPLE_DASHBOARD.leftOverMonthly !== null && (
        <p className="p7-dash__tile" data-part="">
          <span className="p7-card__label">Left over each month</span>
          <span className="p7-dash__figure tabular-nums">
            {formatGbp(SAMPLE_DASHBOARD.leftOverMonthly)}
          </span>
        </p>
      )}
      {SAMPLE_DASHBOARD.monthsOfCover !== null && (
        <p className="p7-dash__tile" data-part="">
          <span className="p7-card__label">Breathing room</span>
          <span className="p7-dash__figure tabular-nums">
            {SAMPLE_DASHBOARD.monthsOfCover.toLocaleString("en-GB", { maximumFractionDigits: 1 })}{" "}
            months
          </span>
        </p>
      )}
    </div>
  </Card>
);

export const STOP_CARDS = {
  accounts: AccountsCard,
  budget: BudgetCard,
  pay: PayCard,
  "savings-and-pension": SavingsCard,
  "debt-and-borrowing": DebtCard,
  dashboard: DashboardCard,
} as const;

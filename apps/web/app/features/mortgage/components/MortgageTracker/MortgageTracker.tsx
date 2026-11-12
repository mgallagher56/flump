import {
  Button,
  EmptyState,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  ProgressBar,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { Home, Info } from "lucide-react";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  breakdownHeader,
  breakdownTitle,
  cardHeading,
  cardSubtitle,
  controlsCard,
  fieldGroup,
  fieldLabel,
  infoIcon,
  infoPanel,
  infoText,
  interestShareText,
  legendDot,
  legendItem,
  legendRow,
  resultsCard,
  selectInput,
  typeButton,
  typeRow,
} from "./MortgageTracker.styles";

export interface MortgageTrackerProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  onLoanAmountChange: (val: number) => void;
  onInterestRateChange: (val: number) => void;
  onRemainingTermChange: (val: number) => void;
  mortgageAccounts: any[];
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  mortgageType?: "repayment" | "interest-only";
  onMortgageTypeChange?: (val: "repayment" | "interest-only") => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

type MortgageType = "repayment" | "interest-only";

const percentFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TYPE_OPTIONS: { value: MortgageType; label: string }[] = [
  { value: "repayment", label: "Repayment" },
  { value: "interest-only", label: "Interest only" },
];

export const MortgageTracker: FC<MortgageTrackerProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  onLoanAmountChange,
  onInterestRateChange,
  onRemainingTermChange,
  mortgageAccounts,
  selectedAccountId,
  onSelectAccount,
  mortgageType: propMortgageType,
  onMortgageTypeChange,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const [internalMortgageType, setInternalMortgageType] = useState<MortgageType>("repayment");
  const currentMortgageType = propMortgageType ?? internalMortgageType;
  const isInterestOnly = currentMortgageType === "interest-only";

  const handleMortgageTypeChange = (type: MortgageType) => {
    if (onMortgageTypeChange) {
      onMortgageTypeChange(type);
    } else {
      setInternalMortgageType(type);
    }
  };

  // A zero (or negative) input means the user has not told us that figure yet.
  const hasInputs = loanAmount > 0 && interestRate > 0 && remainingTerm > 0;

  // Repayment: M = P [ i(1+i)^n ] / [ (1+i)^n - 1 ]. Interest only: M = P * i
  const monthlyPayment = (() => {
    if (!hasInputs) return null;
    const i = interestRate / 100 / 12;
    const n = remainingTerm * 12;
    const payment = isInterestOnly
      ? loanAmount * i
      : (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);
    return Number.isFinite(payment) ? payment : null;
  })();

  let totalInterest: number | null = null;
  let totalPaid: number | null = null;
  if (monthlyPayment !== null) {
    const scheduledTotal = monthlyPayment * remainingTerm * 12;
    totalInterest = isInterestOnly ? scheduledTotal : Math.max(0, scheduledTotal - loanAmount);
    totalPaid = isInterestOnly ? totalInterest + loanAmount : scheduledTotal;
  }
  const interestPercentage =
    totalInterest !== null && totalPaid !== null && totalPaid > 0
      ? (totalInterest / totalPaid) * 100
      : null;

  const controls = (
    <div className={controlsCard()}>
      <h3 className={cardHeading}>Mortgage information</h3>

      <fieldset className={fieldGroup()}>
        <legend className={fieldLabel()}>Mortgage repayment structure</legend>
        <div className={typeRow()}>
          {TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              aria-pressed={currentMortgageType === option.value}
              className={typeButton()}
              size="sm"
              type="button"
              variant={currentMortgageType === option.value ? "primary" : "secondary"}
              onClick={() => handleMortgageTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      {mortgageAccounts.length > 0 && (
        <div className={fieldGroup()}>
          <label className={fieldLabel()} htmlFor="tracker-account-select">
            Link connected mortgage account
          </label>
          <select
            className={selectInput()}
            data-testid="tracker-account-select"
            id="tracker-account-select"
            value={selectedAccountId || ""}
            onChange={(e) => onSelectAccount(e.target.value || null)}
          >
            <option value="">Enter details manually</option>
            {mortgageAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({formatCurrency(Math.abs(acc.balance))})
              </option>
            ))}
          </select>
        </div>
      )}

      <SliderField
        label="Outstanding mortgage balance"
        max={1000000}
        min={0}
        step={5000}
        unitPrefix="£"
        value={loanAmount}
        onChange={onLoanAmountChange}
      />
      <SliderField
        label="Interest rate"
        max={15}
        min={0}
        step={0.05}
        unitSuffix="%"
        value={interestRate}
        onChange={onInterestRateChange}
      />
      <SliderField
        label="Remaining term"
        max={40}
        min={0}
        step={1}
        unitSuffix="yrs"
        value={remainingTerm}
        onChange={onRemainingTermChange}
      />
    </div>
  );

  const content = (
    <div className={resultsCard()}>
      <div>
        <h3 className={cardHeading}>Mortgage cost breakdown</h3>
        <p className={cardSubtitle}>Estimate based on the figures you entered.</p>
      </div>

      <KpiStrip columns={isInterestOnly ? 4 : 3}>
        <KpiCard
          label={isInterestOnly ? "Monthly payment (interest)" : "Monthly payment"}
          subtext={monthlyPayment === null ? undefined : "a month"}
          value={monthlyPayment === null ? null : <Money size="lg" value={monthlyPayment} />}
        />
        <KpiCard
          label="Total interest cost"
          value={totalInterest === null ? null : <Money size="lg" value={totalInterest} />}
        />
        <KpiCard
          label="Total paid"
          value={totalPaid === null ? null : <Money size="lg" value={totalPaid} />}
        />
        {isInterestOnly && (
          <KpiCard
            label="Principal bullet due at term end"
            subtext="100% of principal remains outstanding at term completion."
            value={loanAmount > 0 ? <Money size="lg" value={loanAmount} /> : null}
          />
        )}
      </KpiStrip>

      {totalInterest !== null && totalPaid !== null && interestPercentage !== null ? (
        <>
          <div className={breakdownHeader()}>
            <h4 className={breakdownTitle}>Payment breakdown</h4>
            <ProgressBar
              height={12}
              label="Cost split"
              value={interestPercentage}
              valueDisplay={
                <span className={interestShareText}>
                  {`${percentFormat.format(interestPercentage)}% of total cost is interest`}
                </span>
              }
              variant="danger"
            />
            <div className={legendRow()}>
              <span className={legendItem()}>
                <span aria-hidden="true" className={legendDot({ kind: "principal" })} />
                <span>
                  {isInterestOnly ? "Capital repayment due" : "Principal repaid"}:{" "}
                  {formatCurrency(loanAmount)}
                </span>
              </span>
              <span className={legendItem()}>
                <span aria-hidden="true" className={legendDot({ kind: "interest" })} />
                <span>Interest paid: {formatCurrency(totalInterest)}</span>
              </span>
            </div>
          </div>

          <div className={infoPanel()}>
            <Icon className={infoIcon} icon={Info} size="sm" />
            <p className={infoText}>
              {isInterestOnly ? (
                <>
                  Under an <strong>interest-only</strong> agreement over {remainingTerm} years, you
                  will pay <strong>{formatCurrency(totalInterest)}</strong> in interest. The
                  original loan of <strong>{formatCurrency(loanAmount)}</strong> remains payable in
                  full at term end. Check the <strong>Overpayment simulator</strong> to see how
                  extra capital repayments reduce your monthly interest and final balance.
                </>
              ) : (
                <>
                  Over {remainingTerm} years, you will pay a total of{" "}
                  <strong>{formatCurrency(totalPaid)}</strong> ({formatCurrency(loanAmount)}{" "}
                  principal + {formatCurrency(totalInterest)} interest). To save money, use the{" "}
                  <strong>Overpayment simulator</strong> tab to see how extra payments reduce your
                  overall interest.
                </>
              )}
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          description="Add your balance, interest rate and remaining term to see what your mortgage costs."
          headingLevel="h3"
          icon={<Icon icon={Home} />}
          id="tracker-empty"
          size="sm"
          title="Mortgage details not set"
          tone="muted"
        />
      )}
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Mortgage cost results"
      controls={controls}
      controlsLabel="Mortgage details"
    />
  );
};

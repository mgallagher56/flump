import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCalendarAlt, FaHome, FaInfoCircle, FaPercentage } from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface MortgageTrackerProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  onLoanAmountChange: (val: number) => void;
  onInterestRateChange: (val: number) => void;
  onRemainingTermChange: (val: number) => void;
  mortgageAccounts: any[];
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
}

const MortgageTracker: FC<MortgageTrackerProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  onLoanAmountChange,
  onInterestRateChange,
  onRemainingTermChange,
  mortgageAccounts,
  selectedAccountId,
  onSelectAccount,
}) => {
  const { formatCurrency } = useFormatCurrency();
  // Monthly Payment calculation
  // M = P [ i(1+i)^n ] / [ (1+i)^n - 1 ]
  const monthlyPayment = (() => {
    if (loanAmount <= 0 || interestRate <= 0 || remainingTerm <= 0) return 0;
    const i = interestRate / 100 / 12;
    const n = remainingTerm * 12;
    const payment = (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);
    return Number.isNaN(payment) || !Number.isFinite(payment) ? 0 : payment;
  })();

  const totalPaid = monthlyPayment * remainingTerm * 12;
  const totalInterest = Math.max(0, totalPaid - loanAmount);
  const interestPercentage = totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0;

  const gridLayout = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
    gap: "32px",
    alignItems: "start",
  });

  const controlPanel = css({
    padding: "24px",
    backgroundColor: "card",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  });

  const inputGroupStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

  const labelRow = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const labelTitle = css({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "xs",
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "text.muted",
  });

  const sliderStyle = css({
    width: "100%",
    accentColor: "var(--colors-primary)",
    cursor: "pointer",
    height: "6px",
    borderRadius: "full",
    backgroundColor: "border",
  });

  const numberInputContainer = css({
    position: "relative",
    display: "flex",
    alignItems: "center",
  });

  const inputPrefix = css({
    position: "absolute",
    left: "12px",
    color: "text.muted",
    fontSize: "sm",
  });

  const numberInputStyle = css({
    width: "100%",
    padding: "10px 12px 10px 32px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    outline: "none",
    "&:focus": {
      borderColor: "primary",
      boxShadow: "0 0 0 1px token(colors.primary)",
    },
  });

  const selectStyle = css({
    width: "100%",
    padding: "10px 12px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    outline: "none",
    "&:focus": {
      borderColor: "primary",
    },
  });

  const statsGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
    gap: "16px",
    marginTop: "20px",
  });

  const statCard = (highlight: boolean) =>
    css({
      padding: "20px",
      borderRadius: "md",
      border: "1px solid",
      borderColor: highlight ? "primary" : "border",
      backgroundColor: highlight ? "rgba(99, 99, 241, 0.03)" : "surface",
    });

  const progressTrack = css({
    width: "100%",
    height: "12px",
    backgroundColor: "border",
    borderRadius: "full",
    overflow: "hidden",
    marginTop: "8px",
    display: "flex",
  });

  const progressSegment = (color: string, width: number) =>
    css({
      height: "100%",
      backgroundColor: color,
      width: `${width}%`,
      transition: "width 0.3s ease",
    });

  const legendItem = css({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "xs",
    color: "text.muted",
  });

  const legendDot = (color: string) =>
    css({
      width: "10px",
      height: "10px",
      borderRadius: "full",
      backgroundColor: color,
    });

  return (
    <div className={gridLayout}>
      {/* Parameters Panel */}
      <div className={controlPanel}>
        <FLPHeading as="h3" size="md">
          Mortgage Information
        </FLPHeading>

        {/* Sync with bank accounts */}
        {mortgageAccounts.length > 0 && (
          <div className={inputGroupStyle}>
            <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Link Connected Mortgage Account
            </FLPText>
            <select
              className={selectStyle}
              value={selectedAccountId || ""}
              onChange={(e) => {
                const id = e.target.value;
                onSelectAccount(id || null);
              }}
            >
              <option value="">-- Enter Details Manually --</option>
              {mortgageAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(Math.abs(acc.balance))})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loan Amount */}
        <div className={inputGroupStyle}>
          <div className={labelRow}>
            <span className={labelTitle}>
              <FaHome size={12} />
              Outstanding Mortgage Balance
            </span>
            <FLPText fontSize="sm" fontWeight="bold">
              {formatCurrency(loanAmount)}
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max="1000000"
            min="10000"
            step="5000"
            type="range"
            value={loanAmount}
            onChange={(e) => onLoanAmountChange(Number(e.target.value))}
          />
          <div className={numberInputContainer}>
            <span className={inputPrefix}>£</span>
            <input
              className={numberInputStyle}
              type="number"
              value={loanAmount}
              onChange={(e) => onLoanAmountChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Interest Rate */}
        <div className={inputGroupStyle}>
          <div className={labelRow}>
            <span className={labelTitle}>
              <FaPercentage size={12} />
              Interest Rate
            </span>
            <FLPText fontSize="sm" fontWeight="bold">
              {interestRate}%
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max="15"
            min="0.1"
            step="0.05"
            type="range"
            value={interestRate}
            onChange={(e) => onInterestRateChange(Number(e.target.value))}
          />
          <div className={numberInputContainer}>
            <span className={inputPrefix} style={{ left: "28px" }}>
              %
            </span>
            <input
              className={numberInputStyle}
              style={{ paddingLeft: "42px" }}
              type="number"
              value={interestRate}
              onChange={(e) => onInterestRateChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Remaining Term */}
        <div className={inputGroupStyle}>
          <div className={labelRow}>
            <span className={labelTitle}>
              <FaCalendarAlt size={12} />
              Remaining Term
            </span>
            <FLPText fontSize="sm" fontWeight="bold">
              {remainingTerm} Years
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max="40"
            min="1"
            step="1"
            type="range"
            value={remainingTerm}
            onChange={(e) => onRemainingTermChange(Number(e.target.value))}
          />
          <div className={numberInputContainer}>
            <span className={inputPrefix} style={{ left: "12px" }}>
              Yrs
            </span>
            <input
              className={numberInputStyle}
              style={{ paddingLeft: "42px" }}
              type="number"
              value={remainingTerm}
              onChange={(e) => onRemainingTermChange(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <FLPCard>
        <FLPHeading as="h3" size="md">
          Mortgage Cost Breakdown
        </FLPHeading>
        <FLPText color="text.muted" fontSize="xs">
          Scheduled amortization projection summary.
        </FLPText>

        <div className={statsGrid}>
          <div className={statCard(true)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              Monthly Payment
            </FLPText>
            <FLPHeading as="h4" color="primary" mt={1} size="lg">
              {formatCurrency(monthlyPayment)}/mo
            </FLPHeading>
          </div>

          <div className={statCard(false)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              Total Interest Cost
            </FLPText>
            <FLPHeading as="h4" color="destructive" mt={1} size="lg">
              {formatCurrency(totalInterest)}
            </FLPHeading>
          </div>
        </div>

        {/* Cost Visualizer */}
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <FLPText fontSize="sm" fontWeight="semibold">
              Payment Breakdown
            </FLPText>
            <FLPText fontSize="xs" color="text.muted">
              {interestPercentage.toFixed(1)}% of total cost is interest
            </FLPText>
          </div>

          <div className={progressTrack}>
            <div className={progressSegment("var(--colors-primary)", 100 - interestPercentage)} />
            <div className={progressSegment("#ef4444", interestPercentage)} />
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
            <div className={legendItem}>
              <div className={legendDot("var(--colors-primary)")} />
              <span>Principal: {formatCurrency(loanAmount)}</span>
            </div>
            <div className={legendItem}>
              <div className={legendDot("#ef4444")} />
              <span>Interest: {formatCurrency(totalInterest)}</span>
            </div>
          </div>
        </div>

        {/* Informational Section */}
        <div
          className={css({
            marginTop: "24px",
            padding: "16px",
            borderRadius: "md",
            backgroundColor: "surface",
            border: "1px solid",
            borderColor: "border",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          })}
        >
          <FaInfoCircle
            className={css({
              color: "primary",
              fontSize: "18px",
              marginTop: "2px",
              flexShrink: 0,
            })}
          />
          <FLPText fontSize="xs" color="text.muted" style={{ lineHeight: "1.5" }}>
            Over the course of {remainingTerm} years, you will pay a total of{" "}
            <strong>{formatCurrency(totalPaid)}</strong>. To save money, you can use the{" "}
            <strong>Overpayment Simulator</strong> tab to see how extra payments reduce your overall
            interest burden.
          </FLPText>
        </div>
      </FLPCard>
    </div>
  );
};

export default MortgageTracker;

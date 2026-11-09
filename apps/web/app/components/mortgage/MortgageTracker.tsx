import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaCalendarAlt, FaHome, FaInfoCircle, FaPercentage } from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

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
  mortgageType: propMortgageType,
  onMortgageTypeChange,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const [internalMortgageType, setInternalMortgageType] = useState<"repayment" | "interest-only">(
    "repayment",
  );
  const currentMortgageType = propMortgageType ?? internalMortgageType;

  const handleMortgageTypeChange = (type: "repayment" | "interest-only") => {
    if (onMortgageTypeChange) {
      onMortgageTypeChange(type);
    } else {
      setInternalMortgageType(type);
    }
  };

  // Monthly Payment calculation
  // Repayment: M = P [ i(1+i)^n ] / [ (1+i)^n - 1 ]
  // Interest Only: M = P * i
  const monthlyPayment = (() => {
    if (loanAmount <= 0 || interestRate <= 0 || remainingTerm <= 0) return 0;
    const i = interestRate / 100 / 12;
    if (currentMortgageType === "interest-only") {
      const payment = loanAmount * i;
      return Number.isNaN(payment) || !Number.isFinite(payment) ? 0 : payment;
    }
    const n = remainingTerm * 12;
    const payment = (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);
    return Number.isNaN(payment) || !Number.isFinite(payment) ? 0 : payment;
  })();

  const isInterestOnly = currentMortgageType === "interest-only";
  const totalInterest = isInterestOnly
    ? monthlyPayment * remainingTerm * 12
    : Math.max(0, monthlyPayment * remainingTerm * 12 - loanAmount);
  const totalPaid = isInterestOnly
    ? totalInterest + loanAmount
    : monthlyPayment * remainingTerm * 12;
  const interestPercentage = totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0;

  const gridLayout = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
    gap: "24px",
    alignItems: "start",
  });

  const controlPanel = css({
    gridColumn: { base: "span 1", lg: "span 5" },
    padding: "24px",
    backgroundColor: "card",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border.subtle",
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

        {/* Mortgage Type Selector (Repayment vs Interest-Only) */}
        <div className={inputGroupStyle}>
          <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Mortgage Repayment Structure
          </FLPText>
          <div className={css({ display: "flex", gap: "8px" })}>
            <button
              type="button"
              className={css({
                flex: 1,
                padding: "8px 12px",
                borderRadius: "sm",
                border: "1px solid",
                borderColor: currentMortgageType === "repayment" ? "primary" : "border",
                backgroundColor:
                  currentMortgageType === "repayment" ? "rgba(99, 102, 241, 0.08)" : "surface",
                color: currentMortgageType === "repayment" ? "primary" : "text.primary",
                fontSize: "xs",
                fontWeight: "semibold",
                cursor: "pointer",
                transition: "all 0.2s",
              })}
              onClick={() => handleMortgageTypeChange("repayment")}
            >
              Repayment
            </button>
            <button
              type="button"
              className={css({
                flex: 1,
                padding: "8px 12px",
                borderRadius: "sm",
                border: "1px solid",
                borderColor: currentMortgageType === "interest-only" ? "primary" : "border",
                backgroundColor:
                  currentMortgageType === "interest-only" ? "rgba(99, 102, 241, 0.08)" : "surface",
                color: currentMortgageType === "interest-only" ? "primary" : "text.primary",
                fontSize: "xs",
                fontWeight: "semibold",
                cursor: "pointer",
                transition: "all 0.2s",
              })}
              onClick={() => handleMortgageTypeChange("interest-only")}
            >
              Interest Only
            </button>
          </div>
        </div>

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
              Outstanding mortgage balance
            </span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: "8px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                £
              </span>
              <input
                id="tracker-loan-amount-input"
                type="number"
                min={0}
                step={5000}
                value={loanAmount}
                onChange={(e) => onLoanAmountChange(Number(e.target.value) || 0)}
                style={{
                  width: "110px",
                  padding: "4px 8px 4px 22px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                  color: "var(--colors-text-primary)",
                }}
              />
            </div>
          </div>
          <input
            id="tracker-loan-amount-slider"
            aria-label="Outstanding mortgage balance slider"
            className={sliderStyle}
            max="1000000"
            min="10000"
            step="5000"
            type="range"
            value={loanAmount}
            onChange={(e) => onLoanAmountChange(Number(e.target.value))}
          />
        </div>

        {/* Interest Rate */}
        <div className={inputGroupStyle}>
          <div className={labelRow}>
            <span className={labelTitle}>
              <FaPercentage size={12} />
              Interest rate
            </span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                id="tracker-interest-rate-input"
                type="number"
                min={0.1}
                max={15}
                step={0.05}
                value={interestRate}
                onChange={(e) => onInterestRateChange(Number(e.target.value) || 0)}
                style={{
                  width: "75px",
                  padding: "4px 18px 4px 8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                  color: "var(--colors-text-primary)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                %
              </span>
            </div>
          </div>
          <input
            id="tracker-interest-rate-slider"
            aria-label="Interest rate slider"
            className={sliderStyle}
            max="15"
            min="0.1"
            step="0.05"
            type="range"
            value={interestRate}
            onChange={(e) => onInterestRateChange(Number(e.target.value))}
          />
        </div>

        {/* Remaining Term */}
        <div className={inputGroupStyle}>
          <div className={labelRow}>
            <span className={labelTitle}>
              <FaCalendarAlt size={12} />
              Remaining term
            </span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                id="tracker-remaining-term-input"
                type="number"
                min={1}
                max={40}
                step={1}
                value={remainingTerm}
                onChange={(e) => onRemainingTermChange(Number(e.target.value) || 0)}
                style={{
                  width: "75px",
                  padding: "4px 28px 4px 8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textAlign: "right",
                  borderRadius: "6px",
                  border: "1px solid var(--colors-border)",
                  backgroundColor: "var(--colors-surface)",
                  color: "var(--colors-text-primary)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "6px",
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                }}
              >
                yrs
              </span>
            </div>
          </div>
          <input
            id="tracker-remaining-term-slider"
            aria-label="Remaining term slider"
            className={sliderStyle}
            max="40"
            min="1"
            step="1"
            type="range"
            value={remainingTerm}
            onChange={(e) => onRemainingTermChange(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Results Panel */}
      <FLPCard className={css({ gridColumn: { base: "span 1", lg: "span 7" } })}>
        <FLPHeading as="h3" size="md">
          Mortgage cost breakdown
        </FLPHeading>
        <FLPText color="text.muted" fontSize="xs">
          Scheduled amortisation projection summary.
        </FLPText>

        <div className={statsGrid}>
          <div className={statCard(true)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              {isInterestOnly ? "Monthly Payment (Interest)" : "Monthly Payment"}
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

          {isInterestOnly && (
            <div
              className={statCard(false)}
              style={{
                gridColumn: "1 / -1",
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                borderColor: "rgba(245, 158, 11, 0.3)",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <FLPText
                    fontSize="xs"
                    fontWeight="semibold"
                    textTransform="uppercase"
                    color="warning.500"
                  >
                    Principal Bullet Due at Term End
                  </FLPText>
                  <FLPHeading as="h4" color="warning.500" mt={1} size="md">
                    {formatCurrency(loanAmount)}
                  </FLPHeading>
                </div>
                <FLPText
                  fontSize="xs"
                  color="text.muted"
                  style={{ maxWidth: "260px", textAlign: "right" }}
                >
                  100% of principal remains outstanding at term completion.
                </FLPText>
              </div>
            </div>
          )}
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
              <span>
                {isInterestOnly
                  ? `Capital Repayment Due: ${formatCurrency(loanAmount)}`
                  : `Principal Repaid: ${formatCurrency(loanAmount)}`}
              </span>
            </div>
            <div className={legendItem}>
              <div className={legendDot("#ef4444")} />
              <span>Interest Paid: {formatCurrency(totalInterest)}</span>
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
            {isInterestOnly ? (
              <>
                Under an <strong>Interest-Only</strong> agreement over {remainingTerm} years, you
                will pay <strong>{formatCurrency(totalInterest)}</strong> in interest fees. The
                original loan principal of <strong>{formatCurrency(loanAmount)}</strong> remains
                payable in full at term end. Check the <strong>Overpayment Simulator</strong> to see
                how extra capital repayments reduce your monthly interest and bullet balance.
              </>
            ) : (
              <>
                Over the course of {remainingTerm} years, you will pay a total of{" "}
                <strong>{formatCurrency(totalPaid)}</strong> ({formatCurrency(loanAmount)} principal
                + {formatCurrency(totalInterest)} interest). To save money, use the{" "}
                <strong>Overpayment Simulator</strong> tab to see how extra payments reduce your
                overall interest burden.
              </>
            )}
          </FLPText>
        </div>
      </FLPCard>
    </div>
  );
};

export default MortgageTracker;

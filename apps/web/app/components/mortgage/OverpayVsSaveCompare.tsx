import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FaCheckCircle, FaCoins, FaInfoCircle, FaPercentage, FaSlidersH } from "react-icons/fa";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface OverpayVsSaveCompareProps {
  loanAmount: number;
  interestRate: number; // Mortgage Rate
  remainingTerm: number;
  overpayment: number; // Monthly budget
}

const OverpayVsSaveCompare: FC<OverpayVsSaveCompareProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  overpayment,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [savingsRate, setSavingsRate] = useState<number>(4.8); // Default 4.8% savings ROI
  const [taxBracket, setTaxBracket] = useState<string>("isa"); // 'isa' (0%), 'basic' (20%), 'higher' (40%), 'additional' (45%)
  const [horizonYears, setHorizonYears] = useState<number>(10); // Simulation horizon default 10 years

  // Tax bracket multiplier
  const taxMultiplier = useMemo(() => {
    switch (taxBracket) {
      case "basic":
        return 0.8; // 20% tax
      case "higher":
        return 0.6; // 40% tax
      case "additional":
        return 0.55; // 45% tax
      default:
        return 1.0; // Tax-free / ISA
    }
  }, [taxBracket]);

  const netSavingsRate = savingsRate * taxMultiplier;

  // Comparison simulation
  const comparisonData = useMemo(() => {
    const H = Math.min(horizonYears, remainingTerm);
    const totalMonths = H * 12;

    const im = interestRate / 100 / 12;
    const is = netSavingsRate / 100 / 12;

    // Monthly scheduled mortgage payment
    let monthlyScheduled = 0;
    if (loanAmount > 0 && interestRate > 0 && remainingTerm > 0) {
      const n = remainingTerm * 12;
      monthlyScheduled = (loanAmount * im * (1 + im) ** n) / ((1 + im) ** n - 1);
    }
    if (Number.isNaN(monthlyScheduled) || !Number.isFinite(monthlyScheduled)) {
      monthlyScheduled = 0;
    }

    // 1. Amortize Standard Mortgage
    let standardBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = standardBalance * im;
      const principal = Math.min(standardBalance, monthlyScheduled - interest);
      standardBalance = Math.max(0, standardBalance - principal);
    }

    // 2. Amortize Overpayment Mortgage
    let overpayBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = overpayBalance * im;
      const principal = Math.min(overpayBalance, monthlyScheduled + overpayment - interest);
      overpayBalance = Math.max(0, overpayBalance - principal);
    }

    // Debt reduction = Standard Balance - Overpay Balance
    const debtReduction = Math.max(0, standardBalance - overpayBalance);

    // 3. Savings Account Accumulation
    let savingsBalance = 0;
    for (let m = 1; m <= totalMonths; m++) {
      savingsBalance = savingsBalance * (1 + is) + overpayment;
    }

    const totalInvested = overpayment * totalMonths;
    const mortgageInterestSaved = Math.max(0, debtReduction - totalInvested);
    const savingsInterestEarned = Math.max(0, savingsBalance - totalInvested);

    const difference = Math.abs(debtReduction - savingsBalance);
    const isOverpayBetter = debtReduction > savingsBalance;

    return {
      debtReduction,
      savingsBalance,
      totalInvested,
      mortgageInterestSaved,
      savingsInterestEarned,
      difference,
      isOverpayBetter,
      actualHorizon: H,
    };
  }, [loanAmount, interestRate, remainingTerm, overpayment, netSavingsRate, horizonYears]);

  const {
    debtReduction,
    savingsBalance,
    totalInvested,
    mortgageInterestSaved,
    savingsInterestEarned,
    difference,
    isOverpayBetter,
    actualHorizon,
  } = comparisonData;

  const chartData = [
    {
      name: "Overpay Mortgage",
      "Principal Contributed": totalInvested,
      "Interest Saved": Math.round(mortgageInterestSaved),
      Total: Math.round(debtReduction),
    },
    {
      name: "Save in ISA/Savings",
      "Principal Contributed": totalInvested,
      "Interest Earned (Net)": Math.round(savingsInterestEarned),
      Total: Math.round(savingsBalance),
    },
  ];

  // Styles
  const gridLayout = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 2fr" },
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

  const sliderLabelRow = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const sliderStyle = css({
    width: "100%",
    accentColor: "var(--colors-primary)",
    cursor: "pointer",
    height: "6px",
    borderRadius: "full",
    backgroundColor: "border",
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

  const numberInputContainer = css({
    position: "relative",
    display: "flex",
    alignItems: "center",
  });

  const inputPrefix = css({
    position: "absolute",
    left: "28px",
    color: "text.muted",
    fontSize: "sm",
  });

  const numberInputStyle = css({
    width: "100%",
    padding: "10px 12px 10px 42px",
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

  const verdictPanel = (isOverpay: boolean) =>
    css({
      padding: "20px",
      borderRadius: "lg",
      border: "1px solid",
      borderColor: isOverpay ? "success.500" : "indigo.500",
      backgroundColor: isOverpay ? "rgba(16, 185, 129, 0.04)" : "rgba(99, 99, 241, 0.04)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginTop: "20px",
    });

  const verdictTitle = (isOverpay: boolean) =>
    css({
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "md",
      fontWeight: "bold",
      color: isOverpay ? "success.500" : "primary",
    });

  const statsRow = css({
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginTop: "16px",
  });

  const comparisonRow = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid",
    borderColor: "border",
  });

  return (
    <div className={gridLayout}>
      {/* Parameter Controls */}
      <div className={controlPanel}>
        <FLPHeading as="h3" size="md">
          Savings Parameters
        </FLPHeading>
        <FLPText color="text.muted" fontSize="xs">
          Set your savings rate and tax circumstances to compare options.
        </FLPText>

        {/* Savings Rate */}
        <div className={inputGroupStyle}>
          <div className={sliderLabelRow}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "xs",
                fontWeight: "bold",
                textTransform: "uppercase",
                color: "text.muted",
              }}
            >
              <FaPercentage size={12} />
              Savings Interest Rate
            </span>
            <FLPText fontSize="sm" fontWeight="bold">
              {savingsRate}%
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max="12"
            min="0.1"
            step="0.05"
            type="range"
            value={savingsRate}
            onChange={(e) => setSavingsRate(Number(e.target.value))}
          />
          <div className={numberInputContainer}>
            <span className={inputPrefix}>%</span>
            <input
              className={numberInputStyle}
              type="number"
              value={savingsRate}
              onChange={(e) => setSavingsRate(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Tax Bracket */}
        <div className={inputGroupStyle}>
          <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase" color="text.muted">
            Savings Tax Bracket (UK)
          </FLPText>
          <select
            className={selectStyle}
            value={taxBracket}
            onChange={(e) => setTaxBracket(e.target.value)}
          >
            <option value="isa">ISA / Tax-free (0% Tax)</option>
            <option value="basic">Basic Rate (20% Tax)</option>
            <option value="higher">Higher Rate (40% Tax)</option>
            <option value="additional">Additional Rate (45% Tax)</option>
          </select>
        </div>

        {/* Horizon */}
        <div className={inputGroupStyle}>
          <div className={sliderLabelRow}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "xs",
                fontWeight: "bold",
                textTransform: "uppercase",
                color: "text.muted",
              }}
            >
              <FaSlidersH size={12} />
              Horizon (Years)
            </span>
            <FLPText fontSize="sm" fontWeight="bold">
              {horizonYears} Years
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max={remainingTerm}
            min="1"
            step="1"
            type="range"
            value={horizonYears}
            onChange={(e) => setHorizonYears(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Visual Comparison & Verdict */}
      <FLPCard>
        <FLPHeading as="h3" size="md">
          Mortgage Overpay vs. Savings Comparison
        </FLPHeading>
        <FLPText color="text.muted" fontSize="xs">
          Comparison over a {actualHorizon}-year horizon with a {formatCurrency(overpayment)}/mo
          budget.
        </FLPText>

        {overpayment <= 0 ? (
          <div
            className={css({
              marginTop: "32px",
              padding: "24px",
              textAlign: "center",
              backgroundColor: "surface",
              borderRadius: "md",
              border: "1px dashed",
              borderColor: "border",
            })}
          >
            <FaCoins
              size={24}
              style={{ margin: "0 auto 12px", color: "var(--colors-text-muted)" }}
            />
            <FLPText fontSize="sm" fontWeight="semibold">
              No Overpayment Budget Set
            </FLPText>
            <FLPText fontSize="xs" color="text.muted" style={{ marginTop: "4px" }}>
              Please set a monthly overpayment budget on the <strong>Overpayment Simulator</strong>{" "}
              tab to compare options.
            </FLPText>
          </div>
        ) : (
          <>
            {/* Rates comparison detail */}
            <div
              style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div className={comparisonRow}>
                <FLPText fontSize="sm" color="text.muted">
                  Mortgage Interest Rate (Guaranteed Return):
                </FLPText>
                <FLPText fontSize="sm" fontWeight="bold" color="destructive">
                  {interestRate.toFixed(2)}%
                </FLPText>
              </div>
              <div className={comparisonRow}>
                <FLPText fontSize="sm" color="text.muted">
                  Savings Net Interest Rate (Tax-Adjusted):
                </FLPText>
                <FLPText fontSize="sm" fontWeight="bold" color="success.500">
                  {netSavingsRate.toFixed(2)}%
                </FLPText>
              </div>
            </div>

            {/* Verdict Panel */}
            <div className={verdictPanel(isOverpayBetter)}>
              <div className={verdictTitle(isOverpayBetter)}>
                <FaCheckCircle size={18} />
                <span>
                  Verdict: {isOverpayBetter ? "Overpay Mortgage" : "Save in Account / ISA"}
                </span>
              </div>
              <FLPText fontSize="xs" color="text.muted" style={{ lineHeight: "1.5" }}>
                {isOverpayBetter ? (
                  <>
                    Your mortgage rate of <strong>{interestRate.toFixed(2)}%</strong> is higher than
                    your tax-adjusted net savings rate of{" "}
                    <strong>{netSavingsRate.toFixed(2)}%</strong>. By overpaying your mortgage, you
                    avoid paying more interest than you would earn by saving, resulting in a net
                    gain of <strong>{formatCurrency(difference)}</strong> over {actualHorizon}{" "}
                    years.
                  </>
                ) : (
                  <>
                    Your tax-adjusted net savings rate of{" "}
                    <strong>{netSavingsRate.toFixed(2)}%</strong> is higher than your mortgage rate
                    of <strong>{interestRate.toFixed(2)}%</strong>. By putting your extra budget
                    into savings, you earn more in interest than you save on your mortgage,
                    resulting in a net gain of <strong>{formatCurrency(difference)}</strong> over{" "}
                    {actualHorizon} years.
                  </>
                )}
              </FLPText>
            </div>

            {/* Recharts Bar Chart */}
            <div style={{ height: "260px", width: "100%", marginTop: "24px" }}>
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--colors-border)"
                  />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `£${val / 1000}k`}
                  />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar
                    dataKey="Principal Contributed"
                    fill="var(--colors-primary)"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey={isOverpayBetter ? "Interest Saved" : "Interest Earned (Net)"}
                    fill={isOverpayBetter ? "#ef4444" : "#10B981"}
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Side-by-side stats */}
            <div className={statsRow}>
              <div
                className={css({
                  padding: "16px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: isOverpayBetter ? "success.500" : "border",
                  backgroundColor: "surface",
                })}
              >
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  color="text.muted"
                >
                  Overpayment Value
                </FLPText>
                <FLPHeading as="h4" mt={1} size="md">
                  {formatCurrency(debtReduction)}
                </FLPHeading>
                <FLPText fontSize="xxs" color="text.muted" style={{ marginTop: "4px" }}>
                  Includes {formatCurrency(mortgageInterestSaved)} interest saved.
                </FLPText>
              </div>

              <div
                className={css({
                  padding: "16px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: !isOverpayBetter ? "primary" : "border",
                  backgroundColor: "surface",
                })}
              >
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  color="text.muted"
                >
                  Savings Value
                </FLPText>
                <FLPHeading as="h4" mt={1} size="md">
                  {formatCurrency(savingsBalance)}
                </FLPHeading>
                <FLPText fontSize="xxs" color="text.muted" style={{ marginTop: "4px" }}>
                  Includes {formatCurrency(savingsInterestEarned)} net interest earned.
                </FLPText>
              </div>
            </div>

            {/* Financial Note */}
            <div
              style={{ display: "flex", gap: "8px", marginTop: "24px", alignItems: "flex-start" }}
            >
              <FaInfoCircle
                size={14}
                style={{ color: "var(--colors-text-muted)", marginTop: "2px", flexShrink: 0 }}
              />
              <FLPText fontSize="xxs" color="text.muted" style={{ lineHeight: "1.4" }}>
                <strong>Note:</strong> Mortgage interest savings are tax-free and guaranteed.
                Savings interest is subject to tax if it exceeds your Personal Savings Allowance
                (unless in an ISA). Always keep an emergency fund of liquid savings before making
                illiquid mortgage overpayments.
              </FLPText>
            </div>
          </>
        )}
      </FLPCard>
    </div>
  );
};

export default OverpayVsSaveCompare;

import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface OverpaymentSimulatorProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  overpayment: number;
  onOverpaymentChange: (val: number) => void;
}

const OverpaymentSimulator: FC<OverpaymentSimulatorProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  overpayment,
  onOverpaymentChange,
}) => {
  const { formatCurrency } = useFormatCurrency();

  // Run Amortization Schedules
  const simulationResults = useMemo(() => {
    const r = interestRate / 100;
    const i = r / 12;
    const totalMonths = remainingTerm * 12;

    // Monthly scheduled payment
    let monthlyScheduled = 0;
    if (loanAmount > 0 && interestRate > 0 && remainingTerm > 0) {
      monthlyScheduled = (loanAmount * i * (1 + i) ** totalMonths) / ((1 + i) ** totalMonths - 1);
    }
    if (Number.isNaN(monthlyScheduled) || !Number.isFinite(monthlyScheduled)) {
      monthlyScheduled = 0;
    }

    // 1. Standard schedule
    const standardBalances: number[] = [loanAmount];
    let standardBalance = loanAmount;
    let standardTotalInterest = 0;

    for (let m = 1; m <= totalMonths; m++) {
      if (standardBalance <= 0) {
        standardBalances.push(0);
        continue;
      }
      const interest = standardBalance * i;
      const principal = Math.min(standardBalance, monthlyScheduled - interest);
      standardBalance = Math.max(0, standardBalance - principal);
      standardTotalInterest += interest;
      standardBalances.push(standardBalance);
    }

    // 2. Overpayment schedule
    const overpayBalances: number[] = [loanAmount];
    let overpayBalance = loanAmount;
    let overpayTotalInterest = 0;
    let overpayMonthsToZero = totalMonths;
    let finishedOverpay = false;

    for (let m = 1; m <= totalMonths; m++) {
      if (overpayBalance <= 0) {
        if (!finishedOverpay) {
          overpayMonthsToZero = m - 1;
          finishedOverpay = true;
        }
        overpayBalances.push(0);
        continue;
      }

      const interest = overpayBalance * i;
      // Scheduled payment + overpayment
      const totalPayment = monthlyScheduled + overpayment;
      const principal = Math.min(overpayBalance, totalPayment - interest);

      overpayBalance = Math.max(0, overpayBalance - principal);
      overpayTotalInterest += interest;
      overpayBalances.push(overpayBalance);
    }

    if (overpayBalance <= 0 && !finishedOverpay) {
      overpayMonthsToZero = totalMonths;
    }

    // Group by year for the chart to keep performance high and graph clean
    const chartData = [];
    chartData.push({
      yearLabel: "Yr 0",
      "Standard Plan": Math.round(loanAmount),
      "With Overpayment": Math.round(loanAmount),
    });

    for (let y = 1; y <= remainingTerm; y++) {
      const monthIdx = y * 12;
      chartData.push({
        yearLabel: `Yr ${y}`,
        "Standard Plan": Math.round(standardBalances[monthIdx] ?? 0),
        "With Overpayment": Math.round(overpayBalances[monthIdx] ?? 0),
      });
    }

    const monthsSaved = Math.max(0, totalMonths - overpayMonthsToZero);
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remMonthsSaved = monthsSaved % 12;

    const interestSaved = Math.max(0, standardTotalInterest - overpayTotalInterest);

    return {
      monthlyScheduled,
      standardTotalInterest,
      overpayTotalInterest,
      interestSaved,
      monthsSaved,
      yearsSaved,
      remMonthsSaved,
      newTermMonths: overpayMonthsToZero,
      chartData,
    };
  }, [loanAmount, interestRate, remainingTerm, overpayment]);

  const { monthlyScheduled, interestSaved, yearsSaved, remMonthsSaved, newTermMonths, chartData } =
    simulationResults;

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

  const statsGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
    gap: "16px",
    marginTop: "20px",
  });

  const statCard = (highlight: boolean) =>
    css({
      padding: "16px",
      borderRadius: "md",
      border: "1px solid",
      borderColor: highlight ? "success.500" : "border",
      backgroundColor: highlight ? "rgba(16, 185, 129, 0.04)" : "surface",
    });

  const savingsCallout = css({
    fontSize: "xs",
    fontWeight: "bold",
    color: "success.500",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    padding: "4px 12px",
    borderRadius: "full",
  });

  const newTermYears = Math.floor(newTermMonths / 12);
  const newTermMonthsRem = newTermMonths % 12;

  return (
    <div className={gridLayout}>
      {/* Parameter Controls */}
      <div className={controlPanel}>
        <FLPHeading as="h3" size="md">
          Overpayment
        </FLPHeading>
        <FLPText color="text.muted" fontSize="xs">
          Simulate paying extra each month to save interest and pay off earlier.
        </FLPText>

        <div className={inputGroupStyle}>
          <div className={sliderLabelRow}>
            <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Monthly Overpayment
            </FLPText>
            <FLPText fontSize="sm" fontWeight="bold">
              {formatCurrency(overpayment)}/mo
            </FLPText>
          </div>
          <input
            className={sliderStyle}
            max="2500"
            min="0"
            step="20"
            type="range"
            value={overpayment}
            onChange={(e) => onOverpaymentChange(Number(e.target.value))}
          />
          <div className={numberInputContainer}>
            <span className={inputPrefix}>£</span>
            <input
              className={numberInputStyle}
              type="number"
              value={overpayment}
              onChange={(e) => onOverpaymentChange(Number(e.target.value))}
            />
          </div>
        </div>

        <div
          className={css({
            fontSize: "xs",
            color: "text.muted",
            paddingTop: "8px",
            borderTop: "1px solid",
            borderColor: "border",
          })}
        >
          Scheduled Monthly Payment: <strong>{formatCurrency(monthlyScheduled)}</strong>
          <br />
          Total Monthly Outflow: <strong>{formatCurrency(monthlyScheduled + overpayment)}</strong>
        </div>
      </div>

      {/* Visual Chart and Breakdown */}
      <FLPCard>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <FLPHeading as="h3" size="md">
              Amortization Projection
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              Comparison of scheduled balance reduction paths.
            </FLPText>
          </div>
          {overpayment > 0 && interestSaved > 0 && (
            <div className={savingsCallout}>
              Save {formatCurrency(interestSaved)} in total interest!
            </div>
          )}
        </div>

        {/* Recharts Area Chart */}
        <div style={{ height: "300px", width: "100%", marginTop: "24px" }}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStandard" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOverpay" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="yearLabel"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(val) => `£${val / 1000}k`}
              />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Area
                activeDot={{ r: 6 }}
                dataKey="Standard Plan"
                fill="url(#colorStandard)"
                stroke="#ef4444"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                activeDot={{ r: 6 }}
                dataKey="With Overpayment"
                fill="url(#colorOverpay)"
                stroke="#10B981"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats breakdown */}
        <div className={statsGrid}>
          <div className={statCard(overpayment > 0)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              Interest Saved
            </FLPText>
            <FLPHeading
              as="h4"
              color={overpayment > 0 ? "success.500" : "text.primary"}
              mt={1}
              size="lg"
            >
              {formatCurrency(interestSaved)}
            </FLPHeading>
          </div>

          <div className={statCard(overpayment > 0)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              Time Shaved Off
            </FLPText>
            <FLPHeading as="h4" color="primary" mt={1} size="lg">
              {yearsSaved > 0 || remMonthsSaved > 0
                ? `${yearsSaved} yr${yearsSaved !== 1 ? "s" : ""} ${remMonthsSaved} mo${remMonthsSaved !== 1 ? "s" : ""}`
                : "0 months"}
            </FLPHeading>
          </div>

          <div className={statCard(false)}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              New Payoff Term
            </FLPText>
            <FLPHeading as="h4" color="text.primary" mt={1} size="lg">
              {newTermYears} yr{newTermYears !== 1 ? "s" : ""} {newTermMonthsRem} mo
              {newTermMonthsRem !== 1 ? "s" : ""}
            </FLPHeading>
          </div>
        </div>
      </FLPCard>
    </div>
  );
};

export default OverpaymentSimulator;

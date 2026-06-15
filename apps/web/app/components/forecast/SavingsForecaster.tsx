import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface SavingsForecasterProps {
  startingBalance: number;
  currentSavingRate: number;
  hypotheticalSavingRate: number;
  onStartingBalanceChange: (val: number) => void;
  onCurrentRateChange: (val: number) => void;
  onHypotheticalRateChange: (val: number) => void;
  salaryIncrease?: number;
  onClearIncrease?: () => void;
}

const SavingsForecaster: FC<SavingsForecasterProps> = ({
  startingBalance,
  currentSavingRate,
  hypotheticalSavingRate,
  onStartingBalanceChange,
  onCurrentRateChange,
  onHypotheticalRateChange,
  salaryIncrease,
  onClearIncrease,
}) => {
  const { t } = useTranslation();
  const [interestRate, setInterestRate] = useState<number>(5); // default 5% return
  const [projectionYears, setProjectionYears] = useState<number>(15); // default 15 years

  // Compound Interest Calculation
  const projectionData = useMemo(() => {
    const data = [];
    const m = interestRate / 100 / 12;

    let balanceA = startingBalance;
    let balanceB = startingBalance;

    data.push({
      yearLabel: "Year 0",
      year: 0,
      "Current Plan": Math.round(balanceA),
      "Hypothetical Plan": Math.round(balanceB),
    });

    for (let y = 1; y <= projectionYears; y++) {
      for (let month = 1; month <= 12; month++) {
        balanceA = balanceA * (1 + m) + currentSavingRate;
        balanceB = balanceB * (1 + m) + hypotheticalSavingRate;
      }
      data.push({
        yearLabel: `Yr ${y}`,
        year: y,
        "Current Plan": Math.round(balanceA),
        "Hypothetical Plan": Math.round(balanceB),
      });
    }
    return data;
  }, [startingBalance, currentSavingRate, hypotheticalSavingRate, interestRate, projectionYears]);

  const latestData = projectionData[projectionData.length - 1];
  const totalA = latestData["Current Plan"];
  const totalB = latestData["Hypothetical Plan"];
  const difference = totalB - totalA;

  const { formatCurrency } = useFormatCurrency();

  // Styles
  const forecasterGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 2fr" },
    gap: "32px",
    alignItems: "start",
  });

  const controlPanelStyle = css({
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

  const numberInputStyle = css({
    width: "100%",
    padding: "8px 12px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    "&:focus": {
      borderColor: "primary",
      outline: "none",
    },
  });

  const resultStatsGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
    gap: "16px",
    marginTop: "20px",
  });

  const statCardStyle = (highlight: boolean) =>
    css({
      padding: "16px",
      borderRadius: "md",
      border: "1px solid",
      borderColor: highlight ? "primary" : "border",
      backgroundColor: highlight ? "rgba(99, 99, 241, 0.05)" : "surface",
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {salaryIncrease !== undefined && salaryIncrease > 0 && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "lg",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            border: "1px solid",
            borderColor: "success.500",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          })}
        >
          <FLPText fontSize="sm" color="success.500" fontWeight="medium">
            🎉 Net salary increase of <strong>{formatCurrency(salaryIncrease)}/mo</strong> has been
            applied to your hypothetical monthly savings rate!
          </FLPText>
          {onClearIncrease && (
            <FLPButton size="sm" variant="ghost" onClick={onClearIncrease}>
              Dismiss
            </FLPButton>
          )}
        </div>
      )}
      <div className={forecasterGrid}>
        {/* Parameter Controls (Left Column) */}
        <div className={controlPanelStyle}>
          <FLPHeading as="h3" size="md">
            Parameters
          </FLPHeading>

          {/* Starting Balance */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Starting Savings
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {formatCurrency(startingBalance)}
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="250000"
              min="0"
              step="1000"
              type="range"
              value={startingBalance}
              onChange={(e) => onStartingBalanceChange(Number(e.target.value))}
            />
            <input
              className={numberInputStyle}
              type="number"
              value={startingBalance}
              onChange={(e) => onStartingBalanceChange(Number(e.target.value))}
            />
          </div>

          {/* Current Saving Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Current Saving Rate
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {formatCurrency(currentSavingRate)}/mo
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="5000"
              min="0"
              step="50"
              type="range"
              value={currentSavingRate}
              onChange={(e) => onCurrentRateChange(Number(e.target.value))}
            />
            <input
              className={numberInputStyle}
              type="number"
              value={currentSavingRate}
              onChange={(e) => onCurrentRateChange(Number(e.target.value))}
            />
          </div>

          {/* Hypothetical Saving Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Hypothetical Rate
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {formatCurrency(hypotheticalSavingRate)}/mo
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="5000"
              min="0"
              step="50"
              type="range"
              value={hypotheticalSavingRate}
              onChange={(e) => onHypotheticalRateChange(Number(e.target.value))}
            />
            <input
              className={numberInputStyle}
              type="number"
              value={hypotheticalSavingRate}
              onChange={(e) => onHypotheticalRateChange(Number(e.target.value))}
            />
          </div>

          {/* Investment Return Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Annual Return (ROI)
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {interestRate}%
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="15"
              min="0"
              step="0.5"
              type="range"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
            />
          </div>

          {/* Projection Years */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Horizon (Years)
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {projectionYears} Years
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="40"
              min="1"
              step="1"
              type="range"
              value={projectionYears}
              onChange={(e) => setProjectionYears(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Visual Chart & Breakdown (Right Column) */}
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
                Growth Projection
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Compounded forecast comparison over {projectionYears} years.
              </FLPText>
            </div>
            {difference > 0 && (
              <div
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  color: "success.500",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  padding: "4px 12px",
                  borderRadius: "full",
                })}
              >
                + {formatCurrency(difference)} saved with Hypothetical Plan
              </div>
            )}
          </div>

          {/* Recharts Area Chart */}
          <div style={{ height: "300px", width: "100%", marginTop: "24px" }}>
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={projectionData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCurrent" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#6363F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6363F1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHypo" x1="0" x2="0" y1="0" y2="1">
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
                  dataKey="Current Plan"
                  fill="url(#colorCurrent)"
                  stroke="#6363F1"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  activeDot={{ r: 6 }}
                  dataKey="Hypothetical Plan"
                  fill="url(#colorHypo)"
                  stroke="#10B981"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Result summary stats cards */}
          <div className={resultStatsGrid}>
            <div className={statCardStyle(false)}>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Current Plan Final
              </FLPText>
              <FLPHeading as="h4" color="primary" mt={1} size="lg">
                {formatCurrency(totalA)}
              </FLPHeading>
            </div>

            <div className={statCardStyle(true)}>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Hypothetical Plan Final
              </FLPText>
              <FLPHeading as="h4" color="success.500" mt={1} size="lg">
                {formatCurrency(totalB)}
              </FLPHeading>
            </div>

            <div className={statCardStyle(false)}>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Total Interest Gained
              </FLPText>
              <FLPHeading as="h4" color="text.primary" mt={1} size="lg">
                {formatCurrency(
                  totalB - startingBalance - hypotheticalSavingRate * 12 * projectionYears,
                )}
              </FLPHeading>
            </div>
          </div>
        </FLPCard>
      </div>
    </div>
  );
};

export default SavingsForecaster;

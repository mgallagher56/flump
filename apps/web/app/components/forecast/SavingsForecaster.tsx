import { ChartFigure } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  chartTooltipContentStyle,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
} from "~/components/charts/chartTheme";
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
    gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
    gap: "24px",
    alignItems: "start",
  });

  const controlPanelStyle = css({
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
              <label
                htmlFor="starting-savings-input"
                style={{ fontSize: "12px", fontWeight: "600", color: "var(--colors-text-muted)" }}
              >
                Starting savings
              </label>
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
                  id="starting-savings-input"
                  type="number"
                  min={0}
                  step={1000}
                  value={startingBalance}
                  onChange={(e) => onStartingBalanceChange(Number(e.target.value) || 0)}
                  style={{
                    width: "100px",
                    padding: "3px 6px 3px 20px",
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
              id="starting-savings-slider"
              aria-label="Starting savings slider"
              className={sliderStyle}
              max="250000"
              min="0"
              step="1000"
              type="range"
              value={startingBalance}
              onChange={(e) => onStartingBalanceChange(Number(e.target.value))}
            />
          </div>

          {/* Current Saving Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <label
                htmlFor="current-rate-input"
                style={{ fontSize: "12px", fontWeight: "600", color: "var(--colors-text-muted)" }}
              >
                Current monthly saving
              </label>
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
                  id="current-rate-input"
                  type="number"
                  min={0}
                  step={50}
                  value={currentSavingRate}
                  onChange={(e) => onCurrentRateChange(Number(e.target.value) || 0)}
                  style={{
                    width: "90px",
                    padding: "3px 6px 3px 20px",
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
                  style={{ fontSize: "12px", color: "var(--colors-text-muted)", marginLeft: "4px" }}
                >
                  /mo
                </span>
              </div>
            </div>
            <input
              id="current-rate-slider"
              aria-label="Current monthly saving slider"
              className={sliderStyle}
              max="5000"
              min="0"
              step="50"
              type="range"
              value={currentSavingRate}
              onChange={(e) => onCurrentRateChange(Number(e.target.value))}
            />
          </div>

          {/* Hypothetical Saving Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <label
                htmlFor="hypo-rate-input"
                style={{ fontSize: "12px", fontWeight: "600", color: "var(--colors-text-muted)" }}
              >
                Hypothetical target
              </label>
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
                  id="hypo-rate-input"
                  type="number"
                  min={0}
                  step={50}
                  value={hypotheticalSavingRate}
                  onChange={(e) => onHypotheticalRateChange(Number(e.target.value) || 0)}
                  style={{
                    width: "90px",
                    padding: "3px 6px 3px 20px",
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
                  style={{ fontSize: "12px", color: "var(--colors-text-muted)", marginLeft: "4px" }}
                >
                  /mo
                </span>
              </div>
            </div>
            <input
              id="hypo-rate-slider"
              aria-label="Hypothetical target saving rate slider"
              className={sliderStyle}
              max="5000"
              min="0"
              step="50"
              type="range"
              value={hypotheticalSavingRate}
              onChange={(e) => onHypotheticalRateChange(Number(e.target.value))}
            />
          </div>

          {/* Investment Return Rate */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <label
                htmlFor="return-rate-input"
                style={{ fontSize: "12px", fontWeight: "600", color: "var(--colors-text-muted)" }}
              >
                Annual investment return (AER)
              </label>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <input
                  id="return-rate-input"
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                  style={{
                    width: "70px",
                    padding: "3px 18px 3px 6px",
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
              id="return-rate-slider"
              aria-label="Annual investment return rate slider"
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
              <label
                htmlFor="horizon-years-input"
                style={{ fontSize: "12px", fontWeight: "600", color: "var(--colors-text-muted)" }}
              >
                Horizon (years)
              </label>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <input
                  id="horizon-years-input"
                  type="number"
                  min={1}
                  max={40}
                  step={1}
                  value={projectionYears}
                  onChange={(e) => setProjectionYears(Number(e.target.value) || 0)}
                  style={{
                    width: "70px",
                    padding: "3px 26px 3px 6px",
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
              id="horizon-years-slider"
              aria-label="Horizon years slider"
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
        <FLPCard className={css({ gridColumn: { base: "span 1", lg: "span 7" } })}>
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
                  fontFamily: "mono",
                  color: "success.500",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  padding: "4px 12px",
                  borderRadius: "full",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                })}
              >
                + {formatCurrency(difference)} saved with Hypothetical Plan
              </div>
            )}
          </div>

          {/* Accessible Legend for Colorblind Distinction */}
          <div
            className={css({
              display: "flex",
              gap: "16px",
              alignItems: "center",
              marginTop: "12px",
              paddingTop: "8px",
              borderTop: "1px solid",
              borderColor: "border",
            })}
          >
            <div className={css({ display: "flex", alignItems: "center", gap: "6px" })}>
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "3px",
                  backgroundColor: "#6363F1",
                  borderRadius: "2px",
                }}
              />
              <span
                className={css({ fontSize: "xs", fontWeight: "medium", color: "text.secondary" })}
              >
                Current Plan (Solid)
              </span>
            </div>
            <div className={css({ display: "flex", alignItems: "center", gap: "6px" })}>
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "3px",
                  borderTop: "3px dashed #10B981",
                }}
              />
              <span
                className={css({ fontSize: "xs", fontWeight: "medium", color: "text.secondary" })}
              >
                Hypothetical Plan (Dashed)
              </span>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <ChartFigure
            dataTable={
              <table>
                <caption>Projected balance by year for each savings plan</caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Current plan</th>
                    <th scope="col">Hypothetical plan</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionData.map((row) => (
                    <tr key={row.year}>
                      <th scope="row">{row.yearLabel}</th>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row["Current Plan"])}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row["Hypothetical Plan"])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            summary={`After ${projectionYears} years the current plan reaches ${formatCurrency(totalA)} and the hypothetical plan reaches ${formatCurrency(totalB)}, a difference of ${formatCurrency(difference)}.`}
            title="Savings plan comparison"
          >
            <div style={{ height: "300px", width: "100%", marginTop: "16px" }}>
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
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={chartTooltipContentStyle}
                    itemStyle={chartTooltipItemStyle}
                    labelStyle={chartTooltipLabelStyle}
                  />
                  <Area
                    activeDot={{ r: 6 }}
                    dataKey="Current Plan"
                    fill="url(#colorCurrent)"
                    stroke="#6363F1"
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                  <Area
                    activeDot={{ r: 6 }}
                    dataKey="Hypothetical Plan"
                    fill="url(#colorHypo)"
                    stroke="#10B981"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartFigure>

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
              <FLPHeading as="h4" color="primary" mt={1} size="lg" className="tabular-nums">
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
              <FLPHeading as="h4" color="success.500" mt={1} size="lg" className="tabular-nums">
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
              <FLPHeading as="h4" color="text.primary" mt={1} size="lg" className="tabular-nums">
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

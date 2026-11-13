import {
  Button,
  ChartFigure,
  CurrencyInput,
  chartColor,
  controlProps,
  FormField,
  formatAxisCurrency,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  SimulatorSplitLayout,
  SliderField,
  StatusBadge,
} from "@repo/ui";
import { Check, RotateCcw } from "lucide-react";
import { type FC, useEffect, useId, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Account } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  assumption,
  chartLegend,
  chartLegendItem,
  chartWrap,
  checkbox,
  checkboxLabel,
  dataCell,
  dataTable,
  goalField,
  legendSwatch,
  milestoneCard,
  milestoneGrid,
  milestoneHeader,
  milestoneSection,
  milestoneTime,
  milestoneTop,
  panel,
  panelHeading,
  panelSubtitle,
  resetRow,
} from "./SavingsForecasterCard.styles";

export interface SavingsForecasterCardProps {
  startingBalance: number;
  monthlyContribution: number;
  portfolioInterestRate: number;
  accounts?: Account[];
}

export const SavingsForecasterCard: FC<SavingsForecasterCardProps> = ({
  startingBalance,
  monthlyContribution,
  portfolioInterestRate,
  accounts = [],
}) => {
  const { formatCurrency } = useFormatCurrency();
  const uid = useId().replace(/:/g, "");
  const gradTotal = `savings-total-${uid}`;
  const gradCash = `savings-cash-${uid}`;
  const inflationId = `forecast-inflation-${uid}`;

  const numericPortfolioRate = Number(portfolioInterestRate) || 0;
  const defaultRate = numericPortfolioRate > 0 ? Number(numericPortfolioRate.toFixed(2)) : 5.0;

  const [interestRate, setInterestRate] = useState<number>(defaultRate);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(false);
  const [horizonYears, setHorizonYears] = useState<number>(15);
  const [customGoal, setCustomGoal] = useState<number | null>(null);

  useEffect(() => {
    if (!isCustomRate && numericPortfolioRate > 0) {
      setInterestRate(Number(numericPortfolioRate.toFixed(2)));
    }
  }, [numericPortfolioRate, isCustomRate]);

  const inflationDiscount = adjustForInflation ? 2.5 : 0;
  const effectiveScenarioRate = Math.max(0, interestRate - inflationDiscount);

  // Compound interest (per account at the portfolio rate, or one uniform rate when overridden).
  const { projectionData, finalTotal, totalContributed, totalInterestEarned } = useMemo(() => {
    const data = [];
    const usePerAccount = !isCustomRate && accounts.length > 0;

    let cashOnly = startingBalance;
    let accountBalances = usePerAccount
      ? accounts.map((acc) => ({
          balance: Number(acc.balance) || 0,
          monthly: Number(acc.monthlyContribution) || 0,
          monthlyRate: Math.max(0, (Number(acc.interestRate) || 0) - inflationDiscount) / 100 / 12,
        }))
      : [];

    let uniformBalance = startingBalance;
    const uniformMonthlyRate = effectiveScenarioRate / 100 / 12;

    data.push({
      year: 0,
      yearLabel: "Today",
      "Total Forecast": Math.round(startingBalance),
      "Cash Contributions": Math.round(cashOnly),
      "Interest Earned": 0,
    });

    for (let y = 1; y <= horizonYears; y++) {
      for (let m = 1; m <= 12; m++) {
        if (usePerAccount) {
          accountBalances = accountBalances.map((item) => ({
            ...item,
            balance: item.balance * (1 + item.monthlyRate) + item.monthly,
          }));
        } else {
          uniformBalance = uniformBalance * (1 + uniformMonthlyRate) + monthlyContribution;
        }
        cashOnly += monthlyContribution;
      }

      const currentTotal = usePerAccount
        ? accountBalances.reduce((s, item) => s + item.balance, 0)
        : uniformBalance;
      const interestSoFar = Math.max(0, currentTotal - cashOnly);

      data.push({
        year: y,
        yearLabel: `Year ${y}`,
        "Total Forecast": Math.round(currentTotal),
        "Cash Contributions": Math.round(cashOnly),
        "Interest Earned": Math.round(interestSoFar),
      });
    }

    const finalVal = usePerAccount
      ? accountBalances.reduce((s, item) => s + item.balance, 0)
      : uniformBalance;
    const contVal = cashOnly;
    const intVal = Math.max(0, finalVal - contVal);

    return {
      projectionData: data,
      finalTotal: finalVal,
      totalContributed: contVal,
      totalInterestEarned: intVal,
    };
  }, [
    startingBalance,
    monthlyContribution,
    effectiveScenarioRate,
    horizonYears,
    isCustomRate,
    accounts,
    inflationDiscount,
  ]);

  // Milestones: time to reach each target.
  const milestones = useMemo(() => {
    const baseTargets = [10000, 25000, 50000, 100000, 250000, 1000000];
    const customTargetNum = Number(customGoal);
    const hasCustomGoal = Number.isFinite(customTargetNum) && customTargetNum > 0;

    const targets = hasCustomGoal
      ? [customTargetNum, ...baseTargets.filter((t) => t !== customTargetNum)].slice(0, 6)
      : baseTargets;

    const monthlyRate = effectiveScenarioRate / 100 / 12;

    return targets.map((target, idx) => {
      const isCustom = hasCustomGoal && idx === 0;
      if (startingBalance >= target) {
        return { target, isCustom, achieved: true, years: 0, months: 0 };
      }
      if (monthlyContribution <= 0 && effectiveScenarioRate <= 0) {
        return { target, isCustom, achieved: false, years: Infinity, months: Infinity };
      }

      let b = startingBalance;
      let months = 0;
      const maxMonths = 12 * 60; // cap 60 years

      while (b < target && months < maxMonths) {
        b = b * (1 + monthlyRate) + monthlyContribution;
        months++;
      }

      if (months >= maxMonths) {
        return { target, isCustom, achieved: false, years: Infinity, months: Infinity };
      }

      return {
        target,
        isCustom,
        achieved: false,
        years: Math.floor(months / 12),
        months: months % 12,
        totalMonths: months,
      };
    });
  }, [startingBalance, monthlyContribution, effectiveScenarioRate, customGoal]);

  const rateLabel =
    !isCustomRate && accounts.length > 0
      ? "the rates on your accounts"
      : `${effectiveScenarioRate.toFixed(1)}% a year`;

  const controls = (
    <div className={panel()}>
      <div>
        <h3 className={panelHeading()}>Forecast settings</h3>
        <p className={panelSubtitle()}>
          Change the rate and how far ahead to look. Your balances and monthly saving come from your
          accounts.
        </p>
      </div>

      <SliderField
        format="percent"
        label="Interest rate"
        max={30}
        min={0}
        step={0.1}
        value={interestRate}
        onChange={(val) => {
          setIsCustomRate(true);
          setInterestRate(Number.isFinite(val) ? val : 0);
        }}
      />
      {isCustomRate && (
        <div className={resetRow()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsCustomRate(false);
              setInterestRate(defaultRate);
            }}
          >
            <Icon icon={RotateCcw} size="sm" />
            Reset to {defaultRate.toFixed(2)}% from your accounts
          </Button>
        </div>
      )}

      <SliderField
        label="Years ahead"
        max={30}
        min={5}
        step={5}
        unitSuffix=" years"
        value={horizonYears}
        onChange={setHorizonYears}
      />

      <label className={checkboxLabel()} htmlFor={inflationId}>
        <input
          checked={adjustForInflation}
          className={checkbox()}
          id={inflationId}
          data-testid="forecast-inflation-toggle"
          type="checkbox"
          onChange={(e) => setAdjustForInflation(e.target.checked)}
        />
        Show in today's money (takes off 2.5% a year for inflation)
      </label>
    </div>
  );

  const content = (
    <div className={panel()}>
      <div>
        <h3 className={panelHeading()}>Savings projection</h3>
        <p className={assumption()}>
          Projection at {rateLabel}
          {adjustForInflation ? " after inflation" : ""} over {horizonYears} years, with your
          current balances and monthly saving. An estimate, so real returns will differ.
        </p>
      </div>

      <ChartFigure
        dataTable={
          <table className={dataTable()}>
            <caption>Projected savings balance by year</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Projected total</th>
                <th scope="col">Contributions only</th>
                <th scope="col">Interest earned</th>
              </tr>
            </thead>
            <tbody>
              {projectionData.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.yearLabel}</th>
                  <td className={dataCell()}>{formatCurrency(row["Total Forecast"])}</td>
                  <td className={dataCell()}>{formatCurrency(row["Cash Contributions"])}</td>
                  <td className={dataCell()}>{formatCurrency(row["Interest Earned"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        summary={`Projected savings balance after ${horizonYears} years: ${formatCurrency(finalTotal)}, made up of ${formatCurrency(totalContributed)} contributed and ${formatCurrency(totalInterestEarned)} interest earned, at ${rateLabel}${adjustForInflation ? " after inflation" : ""}.`}
        hideTitle
        title="Savings growth projection"
      >
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradTotal} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("primary")} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={chartColor("primary")} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gradCash} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("wealth")} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={chartColor("wealth")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="yearLabel"
                fontSize={11}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                fontSize={11}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
              <Area
                activeDot={{ r: 6 }}
                dataKey="Total Forecast"
                fill={`url(#${gradTotal})`}
                isAnimationActive={false}
                name="Projected total"
                stroke={chartColor("primary")}
                strokeDasharray="5 5"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                activeDot={{ r: 6 }}
                dataKey="Cash Contributions"
                fill={`url(#${gradCash})`}
                isAnimationActive={false}
                name="Contributions only"
                stroke={chartColor("wealth")}
                strokeDasharray="2 4"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={chartLegend()}>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "projection" })} />
            Projected total
          </span>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "contributions" })} />
            Contributions only
          </span>
        </div>
      </ChartFigure>

      <KpiStrip columns={3}>
        <KpiCard
          label="You add"
          subtext={`Over ${horizonYears} years`}
          value={<Money size="lg" value={Math.round(totalContributed - startingBalance)} />}
        />
        <KpiCard
          label="Interest earned"
          subtext="Projection"
          value={<Money size="lg" value={Math.round(totalInterestEarned)} />}
        />
        <KpiCard
          label={`Projected balance in ${horizonYears} years`}
          subtext={
            <>
              Starting from <Money size="sm" tone="muted" value={startingBalance} />
            </>
          }
          value={<Money size="lg" value={Math.round(finalTotal)} />}
        />
      </KpiStrip>

      <section aria-labelledby="savings-milestones-heading" className={milestoneSection()}>
        <div className={milestoneHeader()}>
          <div>
            <h3 className={panelHeading()} id="savings-milestones-heading">
              Milestones
            </h3>
            <p className={panelSubtitle()}>
              Projection at {rateLabel}
              {adjustForInflation ? " after inflation" : ""}
            </p>
          </div>
          <div className={goalField()}>
            <FormField label="Your own goal">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  placeholder="40,000"
                  value={customGoal}
                  onValueChange={setCustomGoal}
                />
              )}
            </FormField>
          </div>
        </div>
        <ul className={milestoneGrid()}>
          {milestones.map((m) => (
            <li
              key={`${m.isCustom ? "custom" : "std"}-${m.target}`}
              className={milestoneCard({ custom: m.isCustom })}
            >
              <div className={milestoneTop()}>
                <Money size="md" value={m.target} />
                {m.achieved ? (
                  <StatusBadge size="sm" variant="positive">
                    <Icon icon={Check} size="sm" />
                    Reached
                  </StatusBadge>
                ) : m.isCustom ? (
                  <StatusBadge size="sm" variant="brand">
                    Goal
                  </StatusBadge>
                ) : null}
              </div>
              <span className={milestoneTime()}>
                {m.achieved
                  ? "You are already past this"
                  : m.years === Infinity
                    ? "Not reached in 60 years"
                    : m.years === 0
                      ? `In about ${m.months} month${m.months === 1 ? "" : "s"}`
                      : `In about ${m.years} ${m.years === 1 ? "year" : "years"} ${m.months} ${m.months === 1 ? "month" : "months"}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Forecast results"
      controls={controls}
      controlsLabel="Forecast settings"
      controlsSpan={4}
    />
  );
};

export default SavingsForecasterCard;

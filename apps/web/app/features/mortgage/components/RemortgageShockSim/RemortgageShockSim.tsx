import {
  EmptyState,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  SimulatorSplitLayout,
  SliderField,
  StatusBadge,
} from "@repo/ui";
import { Clock, Home } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  fieldGroup,
  fieldLabel,
  kpiNote,
  ltvBody,
  ltvBox,
  ltvHeading,
  ltvMuted,
  ltvTotal,
  panel,
  remainingText,
  selectRow,
  selectStyle,
  simDescription,
  simHeader,
  simRoot,
  simTitle,
  titleIcon,
  titleRow,
} from "./RemortgageShockSim.styles";

export interface RemortgageShockSimProps {
  currentBalance: number;
  currentRate: number;
  propertyValue?: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const ltvFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const RemortgageShockSim: FC<RemortgageShockSimProps> = ({
  currentBalance,
  currentRate,
  propertyValue: rawPropertyValue,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const balanceKnown = currentBalance > 0;
  const rateKnown = currentRate > 0;
  const propertyValueKnown = typeof rawPropertyValue === "number" && rawPropertyValue > 0;
  const propertyValue = propertyValueKnown ? (rawPropertyValue as number) : 0;
  const currentLtv =
    balanceKnown && propertyValueKnown ? (currentBalance / propertyValue) * 100 : 0;

  const thisYear = new Date().getFullYear();
  const [fixEndYear, setFixEndYear] = useState<number>(thisYear + 2);
  const [fixEndMonth, setFixEndMonth] = useState<number>(10); // October
  const [projectedNewRate, setProjectedNewRate] = useState<number>(5.2);
  const [termYears, setTermYears] = useState<number>(25);

  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 8 }, (_, i) => thisYear + i);
    return years.includes(fixEndYear) ? years : [...years, fixEndYear].sort((a, b) => a - b);
  }, [thisYear, fixEndYear]);

  // Months remaining on fix
  const monthsRemaining = useMemo(() => {
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth() + 1;
    const diff = (fixEndYear - currentY) * 12 + (fixEndMonth - currentM);
    return Math.max(1, diff);
  }, [fixEndYear, fixEndMonth]);

  // Repayment formula over the term the user has chosen (default 25 years)
  const calculateMonthly = (bal: number, ratePct: number) => {
    const r = ratePct / 100 / 12;
    const n = termYears * 12;
    if (r === 0) return bal / n;
    return (bal * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
  };

  const currentMonthly = calculateMonthly(currentBalance, currentRate);
  const newMonthly = calculateMonthly(currentBalance, projectedNewRate);
  const monthlyShock = Math.max(0, newMonthly - currentMonthly);

  // Target LTV milestone (e.g. 75% or 60%)
  const nextTargetLtv = currentLtv > 75 ? 75 : currentLtv > 60 ? 60 : 50;
  const targetBalance = (propertyValue * nextTargetLtv) / 100;
  const requiredOverpaymentToReachTier = Math.max(0, currentBalance - targetBalance);
  const monthlyOverpaymentNeeded = Math.round(requiredOverpaymentToReachTier / monthsRemaining);

  const paymentsKnown = balanceKnown && rateKnown;
  const ltvKnown = balanceKnown && propertyValueKnown;

  const controls = (
    <div className={panel()}>
      <div className={fieldGroup}>
        <span className={fieldLabel}>Fixed rate ends on</span>
        <div className={selectRow}>
          <select
            aria-label="Fixed rate end month"
            className={selectStyle}
            id="deal-end-month"
            value={fixEndMonth}
            onChange={(e) => setFixEndMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label="Fixed rate end year"
            className={selectStyle}
            id="deal-end-year"
            value={fixEndYear}
            onChange={(e) => setFixEndYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className={remainingText} id="remortgage-months-remaining">
          {rateKnown
            ? `${monthsRemaining} months remaining on current ${rateFormat.format(currentRate)}% fix`
            : `${monthsRemaining} months remaining on your current fix`}
        </p>
      </div>

      <SliderField
        helperText="Assumption: set the rate you expect to pay after your deal ends. Check your lender's current rates."
        label="Projected renewal rate"
        max={8.5}
        min={2}
        step={0.1}
        unitSuffix="%"
        value={projectedNewRate}
        onChange={setProjectedNewRate}
      />

      <SliderField
        helperText="Assumption: the term used to estimate your monthly payments."
        label="Remaining term (years)"
        max={40}
        min={5}
        step={1}
        unitSuffix="yrs"
        value={termYears}
        onChange={setTermYears}
      />
    </div>
  );

  const content = (
    <>
      <KpiStrip columns={3}>
        <KpiCard
          label="Current payment (estimate)"
          subtext={<span className={kpiNote}>per month</span>}
          value={paymentsKnown ? <Money size="kpi" value={currentMonthly} /> : null}
        />
        <KpiCard
          label="Payment at projected rate (estimate)"
          subtext={<span className={kpiNote}>per month</span>}
          value={paymentsKnown ? <Money size="kpi" value={newMonthly} /> : null}
        />
        <KpiCard
          label="Projected payment shock (estimate)"
          subtext={<span className={kpiNote}>extra per month</span>}
          value={
            paymentsKnown ? (
              <Money
                signDisplay={monthlyShock > 0 ? "always" : "auto"}
                size="kpi"
                tone={monthlyShock > 0 ? "danger" : "default"}
                value={monthlyShock}
              />
            ) : null
          }
        />
      </KpiStrip>

      {ltvKnown ? (
        <div className={ltvBox()} id="remortgage-ltv-box">
          <div>
            <h4 className={ltvHeading}>
              {`Target LTV tier: ${nextTargetLtv}%`}
              <span className={ltvMuted}>{`(current LTV: ${ltvFormat.format(currentLtv)}%)`}</span>
            </h4>
            <p className={ltvBody}>
              {requiredOverpaymentToReachTier > 0
                ? `Estimate: overpay ${formatCurrency(monthlyOverpaymentNeeded)}/mo before renewal to reach ${nextTargetLtv}% LTV. Lenders price some deals by LTV band, so this may open up lower rates. Check your lender's bands.`
                : `Already within the ${nextTargetLtv}% LTV bracket.`}
            </p>
          </div>
          {requiredOverpaymentToReachTier > 0 ? (
            <div className={ltvTotal}>
              <span>Total overpay to reach tier (estimate)</span>
              <Money size="lg" tone="default" value={requiredOverpaymentToReachTier} />
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          description={
            balanceKnown
              ? "Add your property value to see your loan to value (LTV) and the next LTV tier."
              : "Add your mortgage balance and property value to see your loan to value (LTV) and the next LTV tier."
          }
          headingLevel="h3"
          icon={<Icon icon={Home} size="lg" />}
          id="remortgage-ltv-not-set"
          size="sm"
          title="LTV not set"
        />
      )}
    </>
  );

  return (
    <div className={simRoot()} data-testid="remortgage-shock-sim" id="remortgage-shock-sim">
      <div className={simHeader}>
        <div>
          <div className={titleRow}>
            <span className={titleIcon}>
              <Icon icon={Clock} size="sm" />
            </span>
            <h3 className={simTitle}>Mortgage deal expiry and remortgage shock simulator</h3>
            <StatusBadge size="sm" variant="neutral">
              Estimate
            </StatusBadge>
          </div>
          <p className={simDescription}>
            Model payment changes when your fixed deal ends and see how overpaying could reach a
            lower LTV bracket.
          </p>
        </div>
      </div>
      <SimulatorSplitLayout
        content={content}
        contentLabel="Remortgage estimates"
        controls={controls}
        controlsLabel="Remortgage assumptions"
      />
    </div>
  );
};

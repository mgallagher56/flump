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
import { type FC, useEffect, useMemo, useRef, useState } from "react";
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
  /** ISO date the current fixed rate ends (profile renewal date), when known. */
  fixEndDate?: string | null;
  /** The user's remaining term in years, when known. Seeds the term assumption. */
  remainingTermYears?: number;
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

const DEFAULT_TERM_YEARS = 25;
const DEFAULT_TERM_MIN = 5;
const DEFAULT_TERM_MAX = 40;

/** The term slider works in whole years, so a known term is rounded and kept to at least 1. */
const seedTerm = (remainingTermYears?: number): number =>
  remainingTermYears && remainingTermYears > 0
    ? Math.max(1, Math.round(remainingTermYears))
    : DEFAULT_TERM_YEARS;

const parseFixEnd = (fixEndDate?: string | null) => {
  const match = /^(\d{4})-(\d{2})/.exec(fixEndDate ?? "");
  return {
    year: match ? Number(match[1]) : ("" as const),
    month: match ? Number(match[2]) : ("" as const),
  };
};

export const RemortgageShockSim: FC<RemortgageShockSimProps> = ({
  currentBalance,
  currentRate,
  propertyValue: rawPropertyValue,
  fixEndDate,
  remainingTermYears,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const balanceKnown = currentBalance > 0;
  const rateKnown = currentRate > 0;
  const propertyValueKnown = typeof rawPropertyValue === "number" && rawPropertyValue > 0;
  const propertyValue = propertyValueKnown ? (rawPropertyValue as number) : 0;
  const currentLtv =
    balanceKnown && propertyValueKnown ? (currentBalance / propertyValue) * 100 : 0;

  const thisYear = new Date().getFullYear();
  // The fix end date is only ever what the user (or their profile) supplied; nothing is assumed.
  const [fixEndYear, setFixEndYear] = useState<number | "">(() => parseFixEnd(fixEndDate).year);
  const [fixEndMonth, setFixEndMonth] = useState<number | "">(() => parseFixEnd(fixEndDate).month);
  const [projectedNewRate, setProjectedNewRate] = useState<number>(5.2);
  // The user's own term when known; otherwise an editable 25-year assumption.
  const [termYears, setTermYears] = useState<number>(() => seedTerm(remainingTermYears));

  // Props reseed the sim when they change, unless the user has since edited that value.
  const fixEndEdited = useRef(false);
  const termEdited = useRef(false);
  useEffect(() => {
    if (fixEndEdited.current) return;
    const next = parseFixEnd(fixEndDate);
    setFixEndYear(next.year);
    setFixEndMonth(next.month);
  }, [fixEndDate]);
  useEffect(() => {
    if (termEdited.current) return;
    setTermYears(seedTerm(remainingTermYears));
  }, [remainingTermYears]);

  // Widen the slider when the seeded term falls outside the usual 5 to 40 years.
  const termMin = Math.min(DEFAULT_TERM_MIN, termYears);
  const termMax = Math.max(DEFAULT_TERM_MAX, termYears);

  const yearOptions = useMemo(() => {
    const years = Array.from({ length: 8 }, (_, i) => thisYear + i);
    return fixEndYear === "" || years.includes(fixEndYear)
      ? years
      : [...years, fixEndYear].sort((a, b) => a - b);
  }, [thisYear, fixEndYear]);

  // Months remaining on fix
  const monthsRemaining = useMemo<number | null>(() => {
    if (fixEndYear === "" || fixEndMonth === "") return null;
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
  const monthlyOverpaymentNeeded =
    monthsRemaining === null ? null : Math.round(requiredOverpaymentToReachTier / monthsRemaining);

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
            onChange={(e) => {
              fixEndEdited.current = true;
              setFixEndMonth(e.target.value === "" ? "" : Number(e.target.value));
            }}
          >
            <option value="">Month</option>
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
            onChange={(e) => {
              fixEndEdited.current = true;
              setFixEndYear(e.target.value === "" ? "" : Number(e.target.value));
            }}
          >
            <option value="">Year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className={remainingText} id="remortgage-months-remaining">
          {monthsRemaining === null
            ? "Fix end date not set. Choose a month and year to see the time left on your fix."
            : rateKnown
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
        max={termMax}
        min={termMin}
        step={1}
        unitSuffix="yrs"
        value={termYears}
        onChange={(value) => {
          termEdited.current = true;
          setTermYears(value);
        }}
      />
    </div>
  );

  const content = (
    <>
      <KpiStrip columns={3}>
        <KpiCard
          label="Current payment (estimate)"
          subtext={<span className={kpiNote}>per month</span>}
          value={paymentsKnown ? <Money size="lg" value={currentMonthly} /> : null}
        />
        <KpiCard
          label="Payment at projected rate (estimate)"
          subtext={<span className={kpiNote}>per month</span>}
          value={paymentsKnown ? <Money size="lg" value={newMonthly} /> : null}
        />
        <KpiCard
          label="Projected payment shock (estimate)"
          subtext={<span className={kpiNote}>extra per month</span>}
          value={
            paymentsKnown ? (
              <Money
                signDisplay={monthlyShock > 0 ? "always" : "auto"}
                size="lg"
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
                ? monthlyOverpaymentNeeded === null
                  ? `Estimate: you would need to overpay ${formatCurrency(requiredOverpaymentToReachTier)} in total to reach ${nextTargetLtv}% LTV. Set your fix end date to see a monthly figure. Check your lender's bands.`
                  : `Estimate: overpay ${formatCurrency(monthlyOverpaymentNeeded)}/mo before renewal to reach ${nextTargetLtv}% LTV. Lenders price some deals by LTV band, so this may open up lower rates. Check your lender's bands.`
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

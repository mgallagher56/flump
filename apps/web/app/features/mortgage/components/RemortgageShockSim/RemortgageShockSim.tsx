import { Money, Select, SimulatorSplitLayout, SliderField } from "@repo/ui";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  fieldGroup,
  fieldLabel,
  ltvBody,
  ltvBox,
  ltvHeading,
  ltvMuted,
  ltvTotal,
  panel,
  remainingText,
  resultItem,
  resultList,
  resultUnit,
  selectRow,
  simDescription,
  simRoot,
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

/** "18 months", or "2 years 3 months" from 24 months up (copy guide 4.3). */
const formatMonthsLeft = (months: number): string => {
  if (months < 24) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0
    ? `${years} years`
    : `${years} years ${rest} ${rest === 1 ? "month" : "months"}`;
};

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
          <Select
            aria-label="Fixed rate end month"
            id="deal-end-month"
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            placeholder="Month"
            value={fixEndMonth === "" ? "" : String(fixEndMonth)}
            onChange={(e) => {
              fixEndEdited.current = true;
              setFixEndMonth(e.target.value === "" ? "" : Number(e.target.value));
            }}
          />
          <Select
            aria-label="Fixed rate end year"
            id="deal-end-year"
            options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
            placeholder="Year"
            value={fixEndYear === "" ? "" : String(fixEndYear)}
            onChange={(e) => {
              fixEndEdited.current = true;
              setFixEndYear(e.target.value === "" ? "" : Number(e.target.value));
            }}
          />
        </div>
        <p className={remainingText} id="remortgage-months-remaining">
          {monthsRemaining === null
            ? "Fixed rate end date not set. Choose a month and year to see the time left."
            : rateKnown
              ? `${formatMonthsLeft(monthsRemaining)} left on your ${rateFormat.format(currentRate)}% fixed rate`
              : `${formatMonthsLeft(monthsRemaining)} left on your fixed rate`}
        </p>
      </div>

      <SliderField
        format="percent"
        fractionDigits={1}
        helperText="Assumption: the rate after your fixed rate ends. Your lender publishes its current rates."
        label="Rate after your fixed rate ends"
        max={8.5}
        min={2}
        step={0.1}
        value={projectedNewRate}
        onChange={setProjectedNewRate}
      />

      <SliderField
        helperText="Assumption: the years left used to estimate your monthly payments."
        label="Years left"
        max={termMax}
        min={termMin}
        step={1}
        unitSuffix="years"
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
      {paymentsKnown ? (
        <dl className={resultList()} data-testid="remortgage-results">
          <div className={resultItem()}>
            <dt>Current payment (estimate)</dt>
            <dd>
              {formatCurrency(currentMonthly)} <span className={resultUnit}>a month</span>
            </dd>
          </div>
          <div className={resultItem()}>
            <dt>Payment at the new rate (estimate)</dt>
            <dd>
              {formatCurrency(newMonthly)} <span className={resultUnit}>a month</span>
            </dd>
          </div>
          <div className={resultItem()}>
            <dt>Change in monthly payment (estimate)</dt>
            <dd>
              {monthlyShock > 0 ? "+" : ""}
              {formatCurrency(monthlyShock)} <span className={resultUnit}>a month</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className={ltvBody}>
          Add your balance and interest rate to see your payment at a different rate.
        </p>
      )}

      {ltvKnown ? (
        <div className={ltvBox()} id="remortgage-ltv-box">
          <div>
            <h4 className={ltvHeading}>
              {`Next LTV band: ${nextTargetLtv}%`}
              <span className={ltvMuted}>{`(current LTV: ${ltvFormat.format(currentLtv)}%)`}</span>
            </h4>
            <p className={ltvBody}>
              {requiredOverpaymentToReachTier > 0
                ? monthlyOverpaymentNeeded === null
                  ? `Estimate: overpaying ${formatCurrency(requiredOverpaymentToReachTier)} in total would reach ${nextTargetLtv}% LTV. Set your fixed rate end date to see a monthly figure. Your lender sets its own bands.`
                  : `Estimate: overpaying ${formatCurrency(monthlyOverpaymentNeeded)} a month until your fixed rate ends would reach ${nextTargetLtv}% LTV. Your lender sets its own bands.`
                : `Your LTV is already within the ${nextTargetLtv}% band.`}
            </p>
          </div>
          {requiredOverpaymentToReachTier > 0 ? (
            <div className={ltvTotal}>
              <span>Total overpayment to reach the band (estimate)</span>
              <Money size="lg" tone="default" value={requiredOverpaymentToReachTier} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className={ltvBody} id="remortgage-ltv-not-set">
          {balanceKnown
            ? "Add your property value to see your loan to value (LTV) and the next LTV band."
            : "Add your mortgage balance and property value to see your loan to value (LTV) and the next LTV band."}
        </p>
      )}
    </>
  );

  return (
    <div className={simRoot()} data-testid="remortgage-shock-sim" id="remortgage-shock-sim">
      <p className={simDescription}>
        Model your payment at a different rate when your fixed rate ends. See the overpayment that
        would reach the next loan to value (LTV) band.
      </p>
      <SimulatorSplitLayout
        content={content}
        contentLabel="Rate change estimates"
        controls={controls}
        controlsLabel="Rate change assumptions"
      />
    </div>
  );
};

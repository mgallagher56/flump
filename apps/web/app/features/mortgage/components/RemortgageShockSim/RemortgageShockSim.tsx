import { InfoTip, ResultBlock, Select, SimulatorSplitLayout, SliderField } from "@repo/ui";
import { type FC, useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { monthlyMortgagePayment } from "~/utils/mortgagePayment";
import {
  fieldGroup,
  fieldLabel,
  panel,
  remainingText,
  selectRow,
  simRoot,
} from "./RemortgageShockSim.styles";

export interface RemortgageShockSimProps {
  currentBalance: number;
  currentRate: number;
  /** ISO date the current fixed rate ends (profile renewal date), when known. */
  fixEndDate?: string | null;
  /**
   * The scenario's remaining term in years ("Starting figures"), used unrounded so the payment matches
   * the KPI. The tool has no term control of its own; 25 years is used only when none is known.
   */
  remainingTermYears?: number;
  /** Repayment or interest-only, as saved. The payment uses the same formula as the KPI. */
  mortgageType?: "repayment" | "interest-only";
  /**
   * The current monthly payment the page shows (the saved payment, else the page's estimate), so
   * every payment figure on the page is one figure. Computed here when not given: the page leaves
   * it out once the scenario's balance, rate or term differ from the saved ones.
   */
  currentPayment?: number | null;
  /** True when `currentPayment` is the payment the user saved, not an estimate. */
  currentPaymentIsSaved?: boolean;
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
  fixEndDate,
  remainingTermYears,
  mortgageType = "repayment",
  currentPayment,
  currentPaymentIsSaved = false,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const newRateNoteId = `remortgage-rate-note-${useId().replace(/:/g, "")}`;

  const balanceKnown = currentBalance > 0;
  const rateKnown = currentRate > 0;

  const thisYear = new Date().getFullYear();
  // The fix end date is only ever what the user (or their profile) supplied; nothing is assumed.
  const [fixEndYear, setFixEndYear] = useState<number | "">(() => parseFixEnd(fixEndDate).year);
  const [fixEndMonth, setFixEndMonth] = useState<number | "">(() => parseFixEnd(fixEndDate).month);
  const [projectedNewRate, setProjectedNewRate] = useState<number>(5.2);

  // Props reseed the sim when they change, unless the user has since edited that value.
  const fixEndEdited = useRef(false);
  useEffect(() => {
    if (fixEndEdited.current) return;
    const next = parseFixEnd(fixEndDate);
    setFixEndYear(next.year);
    setFixEndMonth(next.month);
  }, [fixEndDate]);

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

  // The same payment formula as the mortgage KPI (monthlyMortgagePayment), over the scenario's
  // exact remaining term, so both show one figure.
  const paymentTerm =
    remainingTermYears && remainingTermYears > 0 ? remainingTermYears : DEFAULT_TERM_YEARS;
  const calculateMonthly = (bal: number, ratePct: number) =>
    monthlyMortgagePayment(bal, ratePct, paymentTerm, mortgageType);

  const hasGivenPayment = typeof currentPayment === "number" && currentPayment > 0;
  const currentMonthly = hasGivenPayment
    ? (currentPayment as number)
    : calculateMonthly(currentBalance, currentRate);
  // The change is formula against formula (same balance and term, two rates), so equal rates
  // always give no change. A saved payment then moves by that change; else the formula figure.
  const formulaChange =
    calculateMonthly(currentBalance, projectedNewRate) -
    calculateMonthly(currentBalance, currentRate);
  const newMonthly = hasGivenPayment
    ? Math.max(0, (currentPayment as number) + formulaChange)
    : calculateMonthly(currentBalance, projectedNewRate);
  // Whole pounds, so the sentence agrees with the two figures beside it.
  const monthlyChange = Math.round(newMonthly) - Math.round(currentMonthly);
  const fromWhen =
    fixEndYear !== "" && fixEndMonth !== ""
      ? `from ${MONTHS[fixEndMonth - 1]} ${fixEndYear}`
      : "after your fixed rate ends";
  const outcomeSentence =
    monthlyChange === 0
      ? "No change"
      : `${monthlyChange > 0 ? "+" : "\u2212"}${formatCurrency(Math.abs(monthlyChange))} a month ${fromWhen}`;

  const paymentsKnown = balanceKnown && rateKnown;

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
        {/* A fact from the chosen date. With no date the empty selects say so: no extra line. */}
        {monthsRemaining === null ? null : (
          <p className={remainingText} id="remortgage-months-remaining">
            {rateKnown
              ? `${formatMonthsLeft(monthsRemaining)} left on your ${rateFormat.format(currentRate)}% fixed rate`
              : `${formatMonthsLeft(monthsRemaining)} left on your fixed rate`}
          </p>
        )}
      </div>

      <SliderField
        describedBy={newRateNoteId}
        format="percent"
        fractionDigits={1}
        label="Rate after your fixed rate ends"
        labelAddon={
          <InfoTip
            descriptionId={newRateNoteId}
            label="About the rate after your fixed rate ends"
            term="Rate after your fixed rate ends"
          >
            An assumption you choose. Your lender publishes its current rates.
          </InfoTip>
        }
        max={8.5}
        min={2}
        step={0.1}
        value={projectedNewRate}
        onChange={setProjectedNewRate}
      />
    </div>
  );

  // The zone's one result card (E17 5A): the change, the new payment as its sentence and the
  // current payment as its one row.
  const content = (
    <ResultBlock
      emptyPrompt="Add your balance and interest rate to see your payment at a different rate."
      figure={paymentsKnown ? outcomeSentence : null}
      id="remortgage-outcome"
      label="Change in monthly payment (estimate)"
      note={
        paymentsKnown
          ? `Payment at the new rate (estimate): ${formatCurrency(newMonthly)} a month.`
          : undefined
      }
      row={
        paymentsKnown
          ? {
              label:
                currentPaymentIsSaved && hasGivenPayment
                  ? "Current payment"
                  : "Current payment (estimate)",
              value: `${formatCurrency(currentMonthly)} a month`,
              id: "remortgage-results",
            }
          : undefined
      }
    />
  );

  return (
    <div className={simRoot()} data-testid="remortgage-shock-sim" id="remortgage-shock-sim">
      <SimulatorSplitLayout
        content={content}
        contentLabel="Rate change estimates"
        controls={controls}
        controlsLabel="Rate change assumptions"
        controlsSpan={4}
      />
    </div>
  );
};

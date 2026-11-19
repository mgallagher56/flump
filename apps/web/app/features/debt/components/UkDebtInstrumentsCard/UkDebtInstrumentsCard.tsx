import {
  calculateCarFinanceBalloon,
  calculateOverdraftCost,
  calculateZeroPercentCliff,
  evaluateUkStudentLoan,
} from "@flump/finance-engine";
import {
  CurrencyInput,
  controlProps,
  FormField,
  InfoTip,
  PercentInput,
  Select,
  Tabs,
  WholeNumberInput,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  cardSubtitle,
  factRow,
  factRows,
  footnote,
  inputStack,
  instrumentsBody,
  keyFigure,
  keyFigureLabel,
  keyFigureValue,
  resultBox,
  resultHeading,
  resultHeadingRow,
  resultNote,
  toolGrid,
} from "./UkDebtInstrumentsCard.styles";

type ToolId = "cliff" | "overdraft" | "balloon" | "student";
type StudentPlan = "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";

const STUDENT_PLAN_OPTIONS: { value: StudentPlan; label: string }[] = [
  { value: "plan1", label: "Plan 1 (before 2012 England and Wales, Northern Ireland)" },
  { value: "plan2", label: "Plan 2 (2012 to 2023 England and Wales)" },
  { value: "plan4", label: "Plan 4 (Scotland)" },
  { value: "plan5", label: "Plan 5 (from 2023 England)" },
  { value: "postgrad", label: "Postgraduate loan" },
];

const TOOLS: { value: ToolId; label: string }[] = [
  { value: "cliff", label: "When a 0% deal ends" },
  { value: "overdraft", label: "Arranged overdraft cost" },
  { value: "balloon", label: "Car finance final payment" },
  { value: "student", label: "Student loan outlook" },
];

/** Whole months typed as text. Empty or not a whole number means the figure is not set. */
/** A count of months the tools can use: a whole number of at least 1, otherwise not set. */
const wholeMonths = (value: number | null): number | null =>
  value !== null && Number.isInteger(value) && value >= 1 ? value : null;

const NEEDS_FIGURES = "Enter all the figures to see the result.";
const OVERDRAFT_EAR_INFO_ID = "uk-debt-overdraft-ear-info";

const FactRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={factRow()}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

/**
 * A result panel's heading. When the result is shown, its explanatory note sits behind an info
 * icon beside the heading rather than as a paragraph (owner item 23).
 */
const ResultHeading: FC<{ title: string; info?: { term: string; text: ReactNode } }> = ({
  title,
  info,
}) =>
  info ? (
    <div className={resultHeadingRow}>
      <h3 className={resultHeading}>{title}</h3>
      <InfoTip term={info.term}>{info.text}</InfoTip>
    </div>
  ) : (
    <h3 className={resultHeading}>{title}</h3>
  );

export interface UkDebtInstrumentsCardProps {
  className?: string;
}

/**
 * Reference calculators for UK debt products. It sits in a quiet drawer on the debt page (E16 PR 6),
 * so it has no card frame or heading of its own: the drawer title names it. Results are stated as
 * plain facts and estimates, with no alarm or reassurance colours (copy guide 2.3).
 */
export const UkDebtInstrumentsCard: FC<UkDebtInstrumentsCardProps> = ({ className }) => {
  const { formatCurrency } = useFormatCurrency();
  const [activeTool, setActiveTool] = useState<ToolId>("cliff");

  // The figures below are starting examples. Every field can be cleared, which means "not set":
  // a cleared field never becomes 0 and never produces a result.

  // 1. 0% balance transfer
  const [btBalance, setBtBalance] = useState<number | null>(3000);
  const [btMonths, setBtMonths] = useState<number | null>(10);
  const [btRevertApr, setBtRevertApr] = useState<number | null>(24.9);
  const btMonthsValue = wholeMonths(btMonths);

  const cliffResult = useMemo(
    () =>
      btBalance !== null && btBalance > 0 && btMonthsValue !== null && btRevertApr !== null
        ? calculateZeroPercentCliff(btBalance, btMonthsValue, btRevertApr)
        : null,
    [btBalance, btMonthsValue, btRevertApr],
  );

  // 2. Arranged overdraft
  const [overdraftBalance, setOverdraftBalance] = useState<number | null>(1200);
  const [overdraftEar, setOverdraftEar] = useState<number | null>(39.9);

  const overdraftResult = useMemo(
    () =>
      overdraftBalance !== null && overdraftEar !== null
        ? calculateOverdraftCost(overdraftBalance, overdraftEar)
        : null,
    [overdraftBalance, overdraftEar],
  );

  // 3. Car finance final payment
  const [balloonAmount, setBalloonAmount] = useState<number | null>(8500);
  const [financeMonths, setFinanceMonths] = useState<number | null>(24);
  const [financeMonthly, setFinanceMonthly] = useState<number | null>(320);
  const financeMonthsValue = wholeMonths(financeMonths);

  const balloonResult = useMemo(
    () =>
      balloonAmount !== null && financeMonthly !== null && financeMonthsValue !== null
        ? calculateCarFinanceBalloon(financeMonthly, financeMonthsValue, balloonAmount)
        : null,
    [balloonAmount, financeMonthly, financeMonthsValue],
  );

  // 4. Student loan
  const [studentSalary, setStudentSalary] = useState<number | null>(36000);
  const [studentBalance, setStudentBalance] = useState<number | null>(45000);
  const [studentPlan, setStudentPlan] = useState<StudentPlan>("plan2");

  const studentResult = useMemo(
    () =>
      studentSalary !== null && studentBalance !== null
        ? evaluateUkStudentLoan(studentPlan, studentSalary, studentBalance)
        : null,
    [studentPlan, studentSalary, studentBalance],
  );

  const daysLeft = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

  const cliffPanel = (
    <div className={toolGrid()}>
      <div className={inputStack()}>
        <FormField label="Balance on the 0% card">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={btBalance}
              onValueChange={setBtBalance}
            />
          )}
        </FormField>
        <FormField label="Months left on the 0% deal">
          {(field) => (
            <WholeNumberInput
              {...controlProps(field)}
              min={1}
              value={btMonths}
              onValueChange={setBtMonths}
            />
          )}
        </FormField>
        <FormField label="APR after the 0% deal ends">
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              value={btRevertApr}
              onValueChange={setBtRevertApr}
            />
          )}
        </FormField>
      </div>

      <div className={resultBox()}>
        <ResultHeading
          info={
            cliffResult === null
              ? undefined
              : {
                  term: "When the 0% deal ends",
                  text: "Minimum payments alone may not pay off the balance before the 0% deal ends. Any balance left is then charged the later APR.",
                }
          }
          title="When the 0% deal ends"
        />
        {cliffResult === null ? (
          <p className={footnote}>{NEEDS_FIGURES}</p>
        ) : (
          <>
            <p className={resultNote}>
              {cliffResult.alertRequired
                ? `About ${daysLeft(cliffResult.daysRemaining)} are left on the 0% deal. Estimate: ${formatCurrency(cliffResult.requiredMonthlyPayment)} a month would pay off the balance before the ${btRevertApr}% APR applies.`
                : `${daysLeft(cliffResult.daysRemaining)} are left on the 0% deal. Estimate: at the monthly payment shown below, the balance is paid off before the later APR applies.`}
            </p>

            <dl className={factRows()}>
              <FactRow
                label="Monthly payment that pays off the balance before the 0% deal ends"
                value={`${formatCurrency(cliffResult.requiredMonthlyPayment)} a month`}
              />
              <FactRow
                label="First-year interest at the later APR if the balance is not paid off (estimate)"
                value={formatCurrency(cliffResult.penaltyInterestFirstYearIfUnpaid)}
              />
            </dl>
          </>
        )}
      </div>
    </div>
  );

  const overdraftPanel = (
    <div className={toolGrid()}>
      <div className={inputStack()}>
        <FormField label="Average arranged overdraft balance">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={overdraftBalance}
              onValueChange={setOverdraftBalance}
            />
          )}
        </FormField>
        <FormField
          label="Overdraft interest rate (EAR)"
          labelAddon={
            <InfoTip descriptionId={OVERDRAFT_EAR_INFO_ID} term="Overdraft interest rate (EAR)">
              The rate on your bank's overdraft page.
            </InfoTip>
          }
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              aria-describedby={[field.describedBy, OVERDRAFT_EAR_INFO_ID]
                .filter(Boolean)
                .join(" ")}
              value={overdraftEar}
              onValueChange={setOverdraftEar}
            />
          )}
        </FormField>
      </div>

      <div className={resultBox()}>
        <ResultHeading
          info={
            overdraftResult === null || overdraftBalance === null
              ? undefined
              : {
                  term: "Overdraft interest",
                  text: "Unlike a fixed loan payment, overdraft interest is charged to the account, which increases the overdrawn balance.",
                }
          }
          title="Overdraft interest a year (estimate)"
        />
        {overdraftResult === null || overdraftBalance === null ? (
          <p className={footnote}>{NEEDS_FIGURES}</p>
        ) : (
          <>
            <div className={keyFigure()}>
              <span className={keyFigureLabel}>
                An overdraft of {formatCurrency(overdraftBalance)} for a whole year costs:
              </span>
              <p className={keyFigureValue}>
                {formatCurrency(overdraftResult.annualPoundCost)} a year
              </p>
              <span className={keyFigureLabel}>
                About {formatCurrency(overdraftResult.monthlyPoundCost)} a month in interest charges
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const balloonPanel = (
    <div className={toolGrid()}>
      <div className={inputStack()}>
        <FormField label="Monthly finance payment">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={financeMonthly}
              onValueChange={setFinanceMonthly}
            />
          )}
        </FormField>
        <FormField label="Months left in the agreement">
          {(field) => (
            <WholeNumberInput
              {...controlProps(field)}
              min={1}
              value={financeMonths}
              onValueChange={setFinanceMonths}
            />
          )}
        </FormField>
        <FormField label="Optional final payment (balloon payment)">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={balloonAmount}
              onValueChange={setBalloonAmount}
            />
          )}
        </FormField>
      </div>

      <div className={resultBox()}>
        <ResultHeading
          info={
            balloonResult === null || balloonAmount === null
              ? undefined
              : {
                  term: "Spreading the final payment",
                  text: `Saving ${formatCurrency(balloonResult.monthlySinkingFundNeeded)} a month for the remaining term would add up to ${formatCurrency(balloonAmount)}, the optional final payment if the car is bought. Interest on savings is not included.`,
                }
          }
          title="Spreading the final payment"
        />
        {balloonResult === null || balloonAmount === null ? (
          <p className={footnote}>{NEEDS_FIGURES}</p>
        ) : (
          <>
            <dl className={factRows()}>
              <FactRow
                label="Monthly amount that spreads the final payment"
                value={`${formatCurrency(balloonResult.monthlySinkingFundNeeded)} a month`}
              />
              <FactRow
                label="Total cost of the agreement"
                value={formatCurrency(balloonResult.totalCostOfFinance)}
              />
            </dl>
          </>
        )}
      </div>
    </div>
  );

  const studentPanel = (
    <div className={toolGrid()}>
      <div className={inputStack()}>
        <FormField label="Student loan plan">
          {(field) => (
            <Select
              {...controlProps(field)}
              options={STUDENT_PLAN_OPTIONS}
              value={studentPlan}
              onChange={(e) => setStudentPlan(e.target.value as StudentPlan)}
            />
          )}
        </FormField>
        <FormField label="Yearly salary before tax">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={studentSalary}
              onValueChange={setStudentSalary}
            />
          )}
        </FormField>
        <FormField label="Balance you owe">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={studentBalance}
              onValueChange={setStudentBalance}
            />
          )}
        </FormField>
      </div>

      <div className={resultBox()}>
        <h3 className={resultHeading}>Student loan repayments (estimate)</h3>
        {studentResult === null ? (
          <p className={footnote}>{NEEDS_FIGURES}</p>
        ) : (
          <>
            <p className={resultNote}>
              Repayments are {studentResult.rate}% of income above{" "}
              {formatCurrency(studentResult.threshold)}. This plan is written off after{" "}
              {studentResult.writeOffYears} years, and in this estimate the balance is{" "}
              {studentResult.projectedOutcome === "written_off_first"
                ? "written off before it is repaid."
                : "repaid before then."}
            </p>
            <dl className={factRows()}>
              <FactRow
                label="Repayment taken from your pay"
                value={`${formatCurrency(studentResult.monthlyRepayment)} a month (${formatCurrency(studentResult.annualRepayment)} a year)`}
              />
            </dl>
          </>
        )}
      </div>
    </div>
  );

  const panels: Record<ToolId, ReactNode> = {
    cliff: cliffPanel,
    overdraft: overdraftPanel,
    balloon: balloonPanel,
    student: studentPanel,
  };

  return (
    <div className={cx(instrumentsBody(), className)}>
      <p className={cardSubtitle}>
        Four calculators for UK debt: 0% deals that end, arranged overdrafts, car finance final
        payments and student loans. They start from example figures you can change.
      </p>
      <Tabs
        aria-label="UK debt calculators"
        items={TOOLS}
        panels={panels}
        size="sm"
        value={activeTool}
        onValueChange={(value) => setActiveTool(value as ToolId)}
      />
    </div>
  );
};

export default UkDebtInstrumentsCard;

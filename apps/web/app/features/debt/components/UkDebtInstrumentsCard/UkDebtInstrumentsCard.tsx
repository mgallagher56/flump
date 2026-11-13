import {
  calculateCarFinanceBalloon,
  calculateOverdraftCost,
  calculateZeroPercentCliff,
  evaluateUkStudentLoan,
} from "@flump/finance-engine";
import { CurrencyInput, controlProps, FormField, Icon, PercentInput, TextInput } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import {
  Car,
  CreditCard,
  GraduationCap,
  Info,
  Landmark,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { type FC, type KeyboardEvent, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  banner,
  cardHeading,
  cardSubtitle,
  factRow,
  factRows,
  footnote,
  inputStack,
  instrumentsCard,
  keyFigure,
  keyFigureLabel,
  keyFigureValue,
  nativeSelect,
  resultBox,
  resultHeading,
  toolGrid,
  toolTab,
  toolTabList,
} from "./UkDebtInstrumentsCard.styles";

type ToolId = "cliff" | "overdraft" | "balloon" | "student";
type StudentPlan = "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";

const TOOLS: { id: ToolId; label: string; icon: typeof CreditCard }[] = [
  { id: "cliff", label: "0% expiry tracker", icon: CreditCard },
  { id: "overdraft", label: "Arranged overdraft cost", icon: Landmark },
  { id: "balloon", label: "PCP or HP balloon", icon: Car },
  { id: "student", label: "Student loan outlook", icon: GraduationCap },
];

/** Whole months typed as text. Empty or not a whole number means the figure is not set. */
const parseWholeMonths = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 ? value : null;
};

const NEEDS_FIGURES = "Enter all the figures to see the result.";

const FactRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className={factRow()}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

export interface UkDebtInstrumentsCardProps {
  className?: string;
}

export const UkDebtInstrumentsCard: FC<UkDebtInstrumentsCardProps> = ({ className }) => {
  const { formatCurrency } = useFormatCurrency();
  const [activeTool, setActiveTool] = useState<ToolId>("cliff");

  // The figures below are starting examples. Every field can be cleared, which means "not set":
  // a cleared field never becomes 0 and never produces a result.

  // 1. 0% balance transfer
  const [btBalance, setBtBalance] = useState<number | null>(3000);
  const [btMonths, setBtMonths] = useState("10");
  const [btRevertApr, setBtRevertApr] = useState<number | null>(24.9);
  const btMonthsValue = parseWholeMonths(btMonths);

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

  // 3. PCP / HP balloon
  const [balloonAmount, setBalloonAmount] = useState<number | null>(8500);
  const [financeMonths, setFinanceMonths] = useState("24");
  const [financeMonthly, setFinanceMonthly] = useState<number | null>(320);
  const financeMonthsValue = parseWholeMonths(financeMonths);

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

  const panelProps = (id: ToolId) => ({
    "aria-labelledby": `uk-debt-tab-${id}`,
    hidden: activeTool !== id,
    id: `uk-debt-panel-${id}`,
    role: "tabpanel" as const,
  });

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const last = TOOLS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TOOLS.length
        : event.key === "ArrowLeft"
          ? (index + last) % TOOLS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const target = TOOLS[next];
    if (!target) return;
    setActiveTool(target.id);
    document.getElementById(`uk-debt-tab-${target.id}`)?.focus();
  };

  return (
    <section aria-labelledby="uk-debt-heading" className={cx(instrumentsCard(), className)}>
      <div>
        <h2 className={cardHeading} id="uk-debt-heading">
          UK debt rules and help
        </h2>
        <p className={cardSubtitle}>
          Four calculators for UK debt situations: 0% offers that end, arranged overdrafts, car
          finance balloons and student loans.
        </p>
      </div>

      <div aria-label="UK debt calculators" className={toolTabList()} role="tablist">
        {TOOLS.map((tool, index) => (
          <button
            aria-controls={`uk-debt-panel-${tool.id}`}
            aria-selected={activeTool === tool.id}
            className={toolTab({ active: activeTool === tool.id })}
            id={`uk-debt-tab-${tool.id}`}
            key={tool.id}
            role="tab"
            tabIndex={activeTool === tool.id ? 0 : -1}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            <Icon icon={tool.icon} size="sm" />
            {tool.label}
          </button>
        ))}
      </div>

      {/* Tab 1: 0% balance transfer expiry */}
      <div className={toolGrid()} {...panelProps("cliff")}>
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
          <FormField label="Months left on the 0% window">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                inputMode="numeric"
                value={btMonths}
                onChange={(e) => setBtMonths(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="APR after the window closes">
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
          <h3 className={resultHeading}>Promotional expiry diagnosis</h3>
          {cliffResult === null ? (
            <p className={footnote}>{NEEDS_FIGURES}</p>
          ) : (
            <>
              {cliffResult.alertRequired ? (
                <div className={banner({ tone: "danger" })}>
                  <Icon icon={TriangleAlert} size="md" />
                  <p>
                    <strong>Promotional window alert:</strong> about {cliffResult.daysRemaining}{" "}
                    days remain. A payment of {formatCurrency(cliffResult.requiredMonthlyPayment)} a
                    month would clear the balance before the {btRevertApr}% revert APR applies.
                  </p>
                </div>
              ) : (
                <div className={banner({ tone: "positive" })}>
                  <Icon icon={ShieldCheck} size="md" />
                  <p>
                    Window active ({cliffResult.daysRemaining} days left). At the monthly payment
                    shown below, the balance is projected to clear before the revert APR applies.
                  </p>
                </div>
              )}

              <dl className={factRows()}>
                <FactRow
                  label="Monthly payment that clears the balance before expiry"
                  value={`${formatCurrency(cliffResult.requiredMonthlyPayment)} a month`}
                />
                <FactRow
                  label="Estimated first-year interest at the revert APR if not cleared"
                  value={formatCurrency(cliffResult.penaltyInterestFirstYearIfUnpaid)}
                />
              </dl>

              <p className={footnote}>
                Minimum repayments alone may not clear the balance before the promotional period
                ends. Any balance remaining is then charged the revert APR.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tab 2: arranged overdraft cost */}
      <div className={toolGrid()} {...panelProps("overdraft")}>
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
          <FormField hint="UK standard is about 39.9%." label="Bank EAR rate">
            {(field) => (
              <PercentInput
                {...controlProps(field)}
                value={overdraftEar}
                onValueChange={setOverdraftEar}
              />
            )}
          </FormField>
        </div>

        <div className={resultBox()}>
          <h3 className={resultHeading}>Annual overdraft interest cost</h3>
          {overdraftResult === null || overdraftBalance === null ? (
            <p className={footnote}>{NEEDS_FIGURES}</p>
          ) : (
            <>
              <div className={keyFigure()}>
                <span className={keyFigureLabel}>
                  Staying in a {formatCurrency(overdraftBalance)} overdraft all year costs:
                </span>
                <p className={keyFigureValue}>
                  {formatCurrency(overdraftResult.annualPoundCost)} a year
                </p>
                <span className={keyFigureLabel}>
                  About {formatCurrency(overdraftResult.monthlyPoundCost)} a month in interest
                  charges
                </span>
              </div>
              <p className={footnote}>
                Unlike a fixed loan payment, overdraft interest is charged to the account, which
                increases the overdrawn balance.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tab 3: PCP / HP balloon */}
      <div className={toolGrid()} {...panelProps("balloon")}>
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
              <TextInput
                {...controlProps(field)}
                inputMode="numeric"
                value={financeMonths}
                onChange={(e) => setFinanceMonths(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Optional final payment (balloon or GFV)">
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
          <h3 className={resultHeading}>Spreading the final payment</h3>
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
                  label="Total outlay for the agreement"
                  value={formatCurrency(balloonResult.totalCostOfFinance)}
                />
              </dl>
              <p className={footnote}>
                Saving {formatCurrency(balloonResult.monthlySinkingFundNeeded)} a month for the
                remaining term would add up to {formatCurrency(balloonAmount)}, the optional final
                payment if the car is bought. Interest on savings is not included.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tab 4: student loan */}
      <div className={toolGrid()} {...panelProps("student")}>
        <div className={inputStack()}>
          <FormField label="Student loan plan">
            {(field) => (
              // TODO(E15 T2.2b): swap for @repo/ui Select
              <select
                className={nativeSelect()}
                id={field.id}
                value={studentPlan}
                onChange={(e) => setStudentPlan(e.target.value as StudentPlan)}
              >
                <option value="plan1">
                  Plan 1 (before 2012 England and Wales, Northern Ireland)
                </option>
                <option value="plan2">Plan 2 (2012 to 2023 England and Wales)</option>
                <option value="plan4">Plan 4 (Scotland)</option>
                <option value="plan5">Plan 5 (from 2023 England)</option>
                <option value="postgrad">Postgraduate loan</option>
              </select>
            )}
          </FormField>
          <FormField label="Gross annual salary">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                value={studentSalary}
                onValueChange={setStudentSalary}
              />
            )}
          </FormField>
          <FormField label="Current outstanding balance">
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
          <h3 className={resultHeading}>Student loan repayment outlook</h3>
          {studentResult === null ? (
            <p className={footnote}>{NEEDS_FIGURES}</p>
          ) : (
            <>
              <div className={banner({ tone: "info" })}>
                <Icon icon={Info} size="md" />
                <p>
                  <strong>Projected outcome:</strong> repayments are {studentResult.rate}% of income
                  above {formatCurrency(studentResult.threshold)}. This plan is written off after{" "}
                  {studentResult.writeOffYears} years, and in this projection the balance is{" "}
                  {studentResult.projectedOutcome === "written_off_first"
                    ? "written off before it is repaid."
                    : "repaid before then."}
                </p>
              </div>
              <dl className={factRows()}>
                <FactRow
                  label="Statutory deduction from salary"
                  value={`${formatCurrency(studentResult.monthlyRepayment)} a month (${formatCurrency(studentResult.annualRepayment)} a year)`}
                />
              </dl>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default UkDebtInstrumentsCard;

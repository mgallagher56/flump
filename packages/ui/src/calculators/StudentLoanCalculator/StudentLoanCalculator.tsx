import {
  evaluateUkStudentLoan,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { ProjectionNotice } from "../../patterns/ProjectionNotice/ProjectionNotice";
import { SimulatorSplitLayout } from "../../patterns/SimulatorSplitLayout/SimulatorSplitLayout";
import { Button } from "../../primitives/Button/Button";
import { FormField } from "../../primitives/FormField/FormField";
import { Icon } from "../../primitives/Icon";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { LiveRegion } from "../../primitives/LiveRegion/LiveRegion";
import { formatMoney, Money } from "../../primitives/Money/Money";
import { Select } from "../../primitives/Select/Select";
import { SliderField } from "../../primitives/SliderField/SliderField";
import { ctaLabel } from "../ctaLabel";
import {
  studentLoanContent,
  studentLoanControls,
  studentLoanCta,
  studentLoanExplainer,
  studentLoanExplainerTitle,
  studentLoanHeader,
  studentLoanIntro,
  studentLoanOutcomes,
  studentLoanRoot,
  studentLoanTitle,
} from "./StudentLoanCalculator.styles";

export type StudentLoanPlanOption = "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";

const money = (n: number) => formatMoney(n).text;
const whole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** Every user-facing string, in one place (COPY-AUDIT, PR 10, student loan rows). */
export const STUDENT_LOAN_COPY = {
  title: "UK student loan repayment calculator",
  intro:
    "Any balance left on a UK student loan is written off after 25 to 40 years, depending on the plan. This estimates whether repayments pay off the balance before then.",
  plan: "Student loan plan",
  plans: [
    { value: "plan1", label: "Plan 1 (England or Wales before 2012, Northern Ireland)" },
    // Dates unchanged pending the owner's GOV.UK check (COPY-AUDIT "Needs the owner").
    { value: "plan2", label: "Plan 2 (2012–2023 England/Wales)" },
    { value: "plan4", label: "Plan 4 (Scotland)" },
    { value: "plan5", label: "Plan 5 (England, from 2023)" },
    { value: "postgrad", label: "Postgraduate loan (master's or doctoral)" },
  ] as const satisfies readonly { value: StudentLoanPlanOption; label: string }[],
  salary: "Yearly salary before tax",
  balance: "Student loan balance",
  kpiMonth: "Estimated repayment a month",
  kpiMonthSubtext: (rate: string, threshold: string) =>
    `${rate}% of pay above ${threshold} a year, taken from your salary.`,
  kpiYear: "Estimated repayment a year",
  kpiOutcome: "Projected outcome",
  outcomeRepaid: "Paid off before write-off",
  outcomeWrittenOff: (years: number) => `Written off after ${years} years`,
  outcomeNothingOwed: "No balance to repay",
  reasonRepaid: (annual: string, balance: string, years: number) =>
    `Estimate: repayments of ${annual} a year pay off the ${balance} balance before it is written off after ${years} years.`,
  reasonWrittenOff: (annual: string, balance: string, years: number) =>
    `Estimate: repayments of ${annual} a year do not pay off the ${balance} balance in ${years} years. The rest is written off then.`,
  reasonNothingOwed: "There is no balance left to repay.",
  explainerTitle: "How this is worked out",
  explainer:
    "This is a rough check, not a year-by-year projection. It assumes interest of 6.5% a year and that your salary stays the same.",
  controlsLabel: "Student loan details",
  contentLabel: "Estimated student loan repayments",
} as const;

export const STUDENT_LOAN_DEFAULT_CTA = "Continue to sign up";

/** Spoken after inputs settle (COPY-AUDIT row for the live region). */
export const studentLoanAnnouncement = (monthly: string, annual: string) =>
  `Illustration: estimated repayment ${monthly} a month, ${annual} a year`;

const SALARY_MAX = 200_000;
const BALANCE_MAX = 150_000;

/** What the button pre-fills for sign-up (shape unchanged from earlier versions). */
export type StudentLoanSeedPayload = Omit<OnboardingSeedPayload, "studentLoanPlan"> & {
  annualIncome: number;
  studentLoanPlan: StudentLoanPlanOption;
};

export interface StudentLoanCalculatorProps {
  onSaveAndContinue?: (payload: StudentLoanSeedPayload) => void;
  ctaText?: string;
  /** When false, entered figures are not written to the onboarding seed in local storage. Default true. */
  persistSeed?: boolean;
  /** Starting values (examples, not anyone's saved figures). */
  initialPlan?: StudentLoanPlanOption;
  initialSalary?: number;
  initialBalance?: number;
}

/**
 * Signed-out tool: the repayment a UK student loan plan takes from a salary, and whether those
 * repayments are projected to pay off the balance before it is written off. Facts only: it makes
 * no suggestion about overpaying or investing. Figures come from the engine's
 * `evaluateUkStudentLoan`; this component only clamps inputs and formats results.
 */
export const StudentLoanCalculator: FC<StudentLoanCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = STUDENT_LOAN_DEFAULT_CTA,
  persistSeed = true,
  initialPlan = "plan2",
  initialSalary = 38_000,
  initialBalance = 45_000,
}) => {
  const [plan, setPlan] = useState<StudentLoanPlanOption>(initialPlan);
  // Clamped so a negative entry never reaches the engine.
  const [salary, setSalary] = useState(Math.max(0, initialSalary));
  const [balance, setBalance] = useState(Math.max(0, initialBalance));

  const evaluation = useMemo(
    () => evaluateUkStudentLoan(plan, salary, balance),
    [plan, salary, balance],
  );

  const annualText = money(evaluation.annualRepayment);
  const balanceText = money(balance);
  const nothingOwed = balance <= 0;
  const repaid = evaluation.projectedOutcome === "repaid_before_write_off";
  const outcomeValue = nothingOwed
    ? STUDENT_LOAN_COPY.outcomeNothingOwed
    : repaid
      ? STUDENT_LOAN_COPY.outcomeRepaid
      : STUDENT_LOAN_COPY.outcomeWrittenOff(evaluation.writeOffYears);
  const outcomeReason = nothingOwed
    ? STUDENT_LOAN_COPY.reasonNothingOwed
    : repaid
      ? STUDENT_LOAN_COPY.reasonRepaid(annualText, balanceText, evaluation.writeOffYears)
      : STUDENT_LOAN_COPY.reasonWrittenOff(annualText, balanceText, evaluation.writeOffYears);

  const announcement = studentLoanAnnouncement(money(evaluation.monthlyRepayment), annualText);

  const handleSave = () => {
    const payload: StudentLoanSeedPayload = {
      annualIncome: salary,
      studentLoanPlan: plan,
      inferredModules: ["accounts", "budget", "tax"],
      timestamp: Date.now(),
    };
    // The seed reader normalises the plan spelling (normalizeStudentLoanPlan).
    if (persistSeed) persistOnboardingSeed(payload as unknown as OnboardingSeedPayload);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signup";
    }
  };

  const controls = (
    <div className={studentLoanControls()}>
      <FormField label={STUDENT_LOAN_COPY.plan}>
        {(field) => (
          <Select
            aria-describedby={field.describedBy}
            id={field.id}
            options={STUDENT_LOAN_COPY.plans}
            value={plan}
            onChange={(e) => setPlan(e.target.value as StudentLoanPlanOption)}
          />
        )}
      </FormField>
      <SliderField
        format="currency"
        label={STUDENT_LOAN_COPY.salary}
        max={SALARY_MAX}
        min={0}
        step={500}
        value={salary}
        onChange={(v) => setSalary(Math.max(0, v))}
      />
      <SliderField
        format="currency"
        label={STUDENT_LOAN_COPY.balance}
        max={BALANCE_MAX}
        min={0}
        step={500}
        value={balance}
        onChange={(v) => setBalance(Math.max(0, v))}
      />
    </div>
  );

  const content = (
    <div className={studentLoanContent()}>
      <div
        className={studentLoanOutcomes()}
        data-density="compact"
        data-testid="student-loan-outcomes"
      >
        <KpiCard
          label={STUDENT_LOAN_COPY.kpiMonth}
          subtext={STUDENT_LOAN_COPY.kpiMonthSubtext(
            whole.format(evaluation.rate),
            money(evaluation.threshold),
          )}
          value={evaluation.monthlyRepayment}
        />
        <KpiCard
          label={STUDENT_LOAN_COPY.kpiYear}
          value={<Money size="lg" value={evaluation.annualRepayment} />}
        />
        <KpiCard
          label={STUDENT_LOAN_COPY.kpiOutcome}
          subtext={outcomeReason}
          value={outcomeValue}
        />
      </div>

      <div className={studentLoanExplainer()}>
        <h3 className={studentLoanExplainerTitle()}>{STUDENT_LOAN_COPY.explainerTitle}</h3>
        <p>{STUDENT_LOAN_COPY.explainer}</p>
      </div>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={studentLoanRoot()} data-testid="student-loan-tool">
      <div className={studentLoanHeader()}>
        <h2 className={studentLoanTitle()}>{STUDENT_LOAN_COPY.title}</h2>
        <p className={studentLoanIntro()}>{STUDENT_LOAN_COPY.intro}</p>
      </div>

      <SimulatorSplitLayout
        content={content}
        contentLabel={STUDENT_LOAN_COPY.contentLabel}
        controls={controls}
        controlsLabel={STUDENT_LOAN_COPY.controlsLabel}
      />

      <Button className={studentLoanCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  );
};

export default StudentLoanCalculator;

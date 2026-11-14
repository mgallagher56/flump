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
import { CollapsibleDrawer } from "../../primitives/CollapsibleDrawer/CollapsibleDrawer";
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
  studentLoanHeader,
  studentLoanIntro,
  studentLoanOutcomes,
  studentLoanOutcomeText,
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
  kpiMonthSubtext: "A share of pay above the plan's threshold, taken from your salary.",
  kpiOutcome: "Estimated outcome",
  outcomeRepaid: "Paid off before write-off",
  outcomeWrittenOff: (years: number) => `Written off after ${years} years`,
  outcomeNothingOwed: "No balance to repay",
  reasonRepaid: "Estimate: repayments at this salary pay off the balance before it is written off.",
  reasonWrittenOff:
    "Estimate: repayments at this salary do not pay off the balance, so the rest is written off then.",
  reasonNothingOwed: "There is no balance left to repay.",
  explainerTitle: "How this is worked out",
  /** "Repayments on this plan are 9% of pay above £29,385 a year." */
  explainerRate: (rate: string, threshold: string) =>
    `Repayments on this plan are ${rate}% of pay above ${threshold} a year.`,
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
  /** Inside a tool page that already shows the title and description: hide this calculator's own title and intro. */
  embedded?: boolean;
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
  embedded = false,
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
      ? STUDENT_LOAN_COPY.reasonRepaid
      : STUDENT_LOAN_COPY.reasonWrittenOff;

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
      {/* The question is "paid off or written off first", so the worded answer leads, set in a
          text style (KpiCard's value style is for figures). The monthly repayment supports it. */}
      <div
        className={studentLoanOutcomes()}
        data-density="compact"
        data-testid="student-loan-outcomes"
      >
        <KpiCard
          label={STUDENT_LOAN_COPY.kpiOutcome}
          subtext={outcomeReason}
          value={<span className={studentLoanOutcomeText()}>{outcomeValue}</span>}
        />
        <KpiCard
          label={STUDENT_LOAN_COPY.kpiMonth}
          subtext={STUDENT_LOAN_COPY.kpiMonthSubtext}
          value={<Money size="lg" value={evaluation.monthlyRepayment} />}
        />
      </div>

      <Button className={studentLoanCta()} size="md" variant="primary" onClick={handleSave}>
        {ctaLabel(ctaText)} <Icon icon={ArrowRight} size="sm" />
      </Button>

      {/* Closed by default: the working adds figures, so it stays out of the first view. */}
      <CollapsibleDrawer title={STUDENT_LOAN_COPY.explainerTitle} variant="quiet">
        <div className={studentLoanExplainer()}>
          <p>
            {STUDENT_LOAN_COPY.explainerRate(
              whole.format(evaluation.rate),
              money(evaluation.threshold),
            )}{" "}
            {STUDENT_LOAN_COPY.explainer}
          </p>
        </div>
      </CollapsibleDrawer>

      <ProjectionNotice />
      <LiveRegion debounceMs={1000} message={announcement} visuallyHidden />
    </div>
  );

  return (
    <div className={studentLoanRoot()} data-testid="student-loan-tool">
      {embedded ? null : (
        <div className={studentLoanHeader()}>
          <h2 className={studentLoanTitle()}>{STUDENT_LOAN_COPY.title}</h2>
          <p className={studentLoanIntro()}>{STUDENT_LOAN_COPY.intro}</p>
        </div>
      )}

      <SimulatorSplitLayout
        content={content}
        contentLabel={STUDENT_LOAN_COPY.contentLabel}
        controls={controls}
        controlsLabel={STUDENT_LOAN_COPY.controlsLabel}
      />
    </div>
  );
};

export default StudentLoanCalculator;

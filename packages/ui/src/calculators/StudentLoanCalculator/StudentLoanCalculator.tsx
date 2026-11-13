import { evaluateUkStudentLoan, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { Button } from "../../primitives/Button";
import { LiveRegion } from "../../primitives/LiveRegion";
import {
  badgeRecipe,
  calloutBodyRecipe,
  calloutRecipe,
  calloutTitleRecipe,
  cardStyle,
  ctaStyle,
  fieldLabelStyle,
  figureRecipe,
  gridStyle,
  headerStyle,
  inputGroupStyle,
  introStyle,
  noteStyle,
  resultsBoxStyle,
  textInputStyle,
  titleStyle,
} from "./StudentLoanCalculator.styles.js";

export interface StudentLoanCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const StudentLoanCalculator: FC<StudentLoanCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Model your full career trajectory in Flump →",
}) => {
  const [plan, setPlan] = useState<"plan1" | "plan2" | "plan4" | "plan5" | "postgrad">("plan2");
  const [salary, setSalary] = useState<number>(38000);
  const [balance, setBalance] = useState<number>(45000);

  const evaluation = useMemo(() => {
    return evaluateUkStudentLoan(plan, salary, balance);
  }, [plan, salary, balance]);

  const tone = evaluation.recommendation === "do_not_overpay" ? "danger" : "positive";

  const headline = `Repayment £${Math.round(evaluation.monthlyRepayment).toLocaleString(
    "en-GB",
  )} a month, £${Math.round(evaluation.annualRepayment).toLocaleString("en-GB")} a year`;

  const handleSave = () => {
    const payload = {
      annualIncome: salary,
      studentLoanPlan: plan,
      inferredModules: ["accounts", "budget", "tax"],
      timestamp: Date.now(),
    };
    persistOnboardingSeed(payload as any);
    if (onSaveAndContinue) {
      onSaveAndContinue(payload);
    } else if (typeof window !== "undefined") {
      window.location.href = "/signup";
    }
  };

  return (
    <div className={cardStyle} data-testid="student-loan-tool">
      <div className={headerStyle}>
        <div>
          <h2 className={titleStyle}>
            UK student loan: overpay or invest? (graduate tax calculator)
          </h2>
          <p className={introStyle}>
            UK student loans are wiped after 25–40 years. Find out whether voluntary overpayments
            save you interest or act as a donation to HM Treasury.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="student-loan-plan">
              Student loan plan
            </label>
            <select
              id="student-loan-plan"
              className={textInputStyle}
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
            >
              <option value="plan1">Plan 1 (Pre-2012 England/Wales, NI)</option>
              <option value="plan2">Plan 2 (2012–2023 England/Wales)</option>
              <option value="plan4">Plan 4 (Scotland)</option>
              <option value="plan5">Plan 5 (Post-2023 England)</option>
              <option value="postgrad">Postgraduate Master's / Doctoral Loan</option>
            </select>
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="student-loan-salary">
              Gross annual salary (£)
            </label>
            <input
              id="student-loan-salary"
              className={textInputStyle}
              min={15000}
              step={1000}
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <label className={fieldLabelStyle} htmlFor="student-loan-balance">
              Current outstanding loan balance (£)
            </label>
            <input
              id="student-loan-balance"
              className={textInputStyle}
              min={1000}
              step={1000}
              type="number"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className={resultsBoxStyle}>
          <LiveRegion debounceMs={1000} message={headline} visuallyHidden />
          <div>
            <span className={badgeRecipe({ tone })}>
              {evaluation.recommendation === "do_not_overpay"
                ? "Verdict: do not overpay"
                : "Verdict: consider overpaying"}
            </span>
            <div className={figureRecipe({ tone: "neutral" })}>
              £{Math.round(evaluation.monthlyRepayment).toLocaleString("en-GB")}/mo (£
              {Math.round(evaluation.annualRepayment).toLocaleString("en-GB")}/yr)
            </div>
            <p className={noteStyle}>
              Statutory deduction from salary ({evaluation.rate}% above £
              {evaluation.threshold.toLocaleString("en-GB")})
            </p>
          </div>

          <div className={calloutRecipe({ tone })}>
            <div className={calloutTitleRecipe({ tone })}>Graduate tax reality check</div>
            <p className={calloutBodyRecipe({ tone })}>{evaluation.reasoning}</p>
          </div>

          <Button className={ctaStyle} onClick={handleSave} size="md">
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentLoanCalculator;

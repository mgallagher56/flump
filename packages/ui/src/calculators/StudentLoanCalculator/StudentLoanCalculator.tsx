import { evaluateUkStudentLoan, persistOnboardingSeed } from "@flump/finance-engine";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { css } from "../../../styled-system/css/index.js";
import { Button } from "../../components/forms/Button.js";

import {
  cardStyle,
  gridStyle,
  inputGroupStyle,
  resultsBoxStyle,
  textInputStyle,
} from "./StudentLoanCalculator.styles.js";

export interface StudentLoanCalculatorProps {
  onSaveAndContinue?: (payload: any) => void;
  ctaText?: string;
}

export const StudentLoanCalculator: FC<StudentLoanCalculatorProps> = ({
  onSaveAndContinue,
  ctaText = "Model Full Career Trajectory in Flump →",
}) => {
  const [plan, setPlan] = useState<"plan1" | "plan2" | "plan4" | "plan5" | "postgrad">("plan2");
  const [salary, setSalary] = useState<number>(38000);
  const [balance, setBalance] = useState<number>(45000);

  const evaluation = useMemo(() => {
    return evaluateUkStudentLoan(plan, salary, balance);
  }, [plan, salary, balance]);

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
      window.location.href = "/signUp";
    }
  };

  return (
    <div className={cardStyle} data-testid="student-loan-tool">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: "0 0 4px 0",
              color: "var(--colors-text-primary)",
            }}
          >
            UK Student Loan: Overpay or Invest? (Graduate Tax Calculator)
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--colors-text-muted)",
              margin: 0,
            }}
          >
            UK student loans are wiped after 25–40 years. Find out whether voluntary overpayments
            save you interest or act as a donation to HM Treasury.
          </p>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>Student Loan Plan</span>
            <select
              aria-label="Student Loan Plan"
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
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>Gross Annual Salary (£)</span>
            <input
              aria-label="Annual Salary"
              className={textInputStyle}
              min={15000}
              step={1000}
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value) || 0)}
            />
          </div>

          <div className={inputGroupStyle}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              Current Outstanding Loan Balance (£)
            </span>
            <input
              aria-label="Outstanding Balance"
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
          <div>
            <span
              style={{
                fontSize: "11px",
                backgroundColor:
                  evaluation.recommendation === "do_not_overpay"
                    ? "var(--colors-status-danger-bg)"
                    : "var(--colors-status-positive-bg)",
                color:
                  evaluation.recommendation === "do_not_overpay"
                    ? "var(--colors-status-danger-text)"
                    : "var(--colors-status-positive-text)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              {evaluation.recommendation === "do_not_overpay"
                ? "🛑 Verdict: DO NOT OVERPAY"
                : "⚡ Verdict: CONSIDER OVERPAYING"}
            </span>
            <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "6px" }}>
              £{Math.round(evaluation.monthlyRepayment)}/mo (
              {Math.round(evaluation.annualRepayment)}/yr)
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Statutory deduction from salary ({evaluation.rate}% above £
              {evaluation.threshold.toLocaleString()})
            </p>
          </div>

          <div
            style={{
              padding: "14px",
              backgroundColor:
                evaluation.recommendation === "do_not_overpay"
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(16,185,129,0.06)",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: evaluation.recommendation === "do_not_overpay" ? "#fca5a5" : "#6ee7b7",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Graduate Tax Reality Check</div>
            <p
              style={{
                fontSize: "12px",
                margin: "4px 0 0 0",
              }}
            >
              {evaluation.reasoning}
            </p>
          </div>

          <Button onClick={handleSave} size="md" style={{ width: "100%" }}>
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentLoanCalculator;

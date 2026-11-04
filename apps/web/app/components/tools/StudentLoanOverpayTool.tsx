import { evaluateUkStudentLoan } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  boxShadow: "sm",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1.1fr 0.9fr" },
  gap: "32px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
});

const textInputStyle = css({
  padding: "10px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "15px",
});

const resultsBoxStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
});

export const StudentLoanOverpayTool: FC = () => {
  const [plan, setPlan] = useState<"plan1" | "plan2" | "plan4" | "plan5" | "postgrad">("plan2");
  const [salary, setSalary] = useState<number>(38000);
  const [balance, setBalance] = useState<number>(45000);

  const evaluation = useMemo(() => {
    return evaluateUkStudentLoan(plan, salary, balance);
  }, [plan, salary, balance]);

  return (
    <div className={cardStyle}>
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
          <FLPHeading as="h3" size="xl">
            UK Student Loan: Overpay or Invest? (Graduate Tax Calculator)
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            UK student loans are wiped after 25–40 years. Find out whether voluntary overpayments
            save you interest or act as a donation to HM Treasury.
          </FLPText>
        </div>
      </div>

      <div className={gridStyle}>
        <div>
          <div className={inputGroupStyle}>
            <FLPText fontSize="sm" fontWeight="bold">
              Student Loan Plan
            </FLPText>
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
            <FLPText fontSize="sm" fontWeight="bold">
              Gross Annual Salary (£)
            </FLPText>
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
            <FLPText fontSize="sm" fontWeight="bold">
              Current Outstanding Loan Balance (£)
            </FLPText>
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
                  evaluation.recommendation === "do_not_overpay" ? "#fee2e2" : "#d1fae5",
                color: evaluation.recommendation === "do_not_overpay" ? "#991b1b" : "#065f46",
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
            <FLPText color="text.muted" fontSize="xs">
              Statutory deduction from salary ({evaluation.rate}% above £
              {evaluation.threshold.toLocaleString()})
            </FLPText>
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
            <FLPText fontSize="xs" fontWeight="bold">
              Graduate Tax Reality Check
            </FLPText>
            <FLPText fontSize="xs" style={{ marginTop: "4px" }}>
              {evaluation.reasoning}
            </FLPText>
          </div>

          <RouterLink style={{ textDecoration: "none" }} to="/signUp">
            <FLPButton size="md" variant="primary" style={{ width: "100%" }}>
              Model Full Career Trajectory in Flump →
            </FLPButton>
          </RouterLink>
        </div>
      </div>
    </div>
  );
};

export default StudentLoanOverpayTool;

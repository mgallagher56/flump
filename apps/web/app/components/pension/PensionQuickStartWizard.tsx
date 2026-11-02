import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaRocket } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

interface PensionQuickStartWizardProps {
  initialSalary?: number | null;
  initialEmployeePercent?: number;
  initialEmployerPercent?: number;
  onComplete: () => void;
  onDismiss?: () => void;
}

const wizardContainerStyle = css({
  padding: "32px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "#8b5cf6",
  backgroundColor: "rgba(139, 92, 246, 0.03)",
  boxShadow: "sm",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
});

const stepIndicatorStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  position: "relative",
  marginBottom: "8px",
});

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const threeColGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "16px",
});

const twoColGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "16px",
});

const COMMON_PROVIDERS = [
  "Nest Workplace Pension",
  "Aviva",
  "Scottish Widows",
  "The People's Pension",
  "Legal & General",
  "Vanguard SIPP",
  "Hargreaves Lansdown SIPP",
  "AJ Bell",
  "Standard Life",
];

export const PensionQuickStartWizard: FC<PensionQuickStartWizardProps> = ({
  initialSalary,
  initialEmployeePercent = 5.0,
  initialEmployerPercent = 3.0,
  onComplete,
  onDismiss,
}) => {
  const fetcher = useFetcher();
  const { formatCurrency } = useFormatCurrency();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Salary & Contribution percentages
  const [salary, setSalary] = useState(String(initialSalary || 45000));
  const [employeePercent, setEmployeePercent] = useState(String(initialEmployeePercent || 5.0));
  const [employerPercent, setEmployerPercent] = useState(String(initialEmployerPercent || 3.0));

  // Step 2: Existing Pot
  const [potName, setPotName] = useState("Nest Workplace Pension");
  const [currentValue, setCurrentValue] = useState("10000");
  const [growthRate, setGrowthRate] = useState("5.0");

  const numSalary = Number(salary) || 0;
  const numEmployeePct = Number(employeePercent) || 0;
  const numEmployerPct = Number(employerPercent) || 0;
  const numCurrentValue = Number(currentValue) || 0;
  const numGrowthRate = Number(growthRate) || 5.0;

  const monthlyEmployee = (numSalary * (numEmployeePct / 100)) / 12;
  const monthlyEmployer = (numSalary * (numEmployerPct / 100)) / 12;
  const totalMonthly = monthlyEmployee + monthlyEmployer;

  // Simple 25-year projection for step 3
  const months = 25 * 12;
  const monthlyRate = numGrowthRate / 100 / 12;
  const projected25Year = Math.round(
    numCurrentValue * (1 + monthlyRate) ** months +
      (totalMonthly * ((1 + monthlyRate) ** months - 1)) / (monthlyRate || 1 / 12),
  );
  const monthlyRetirementIncome = Math.round((projected25Year * 0.04) / 12);

  const handleFinish = () => {
    fetcher.submit(
      {
        intent: "completePensionWizard",
        name: potName.trim() || "Workplace Pension",
        balance: String(numCurrentValue),
        interestRate: String(numGrowthRate),
        monthlyContribution: String(Math.round(totalMonthly)),
        annualSalary: String(numSalary),
        pensionPercent: String(numEmployeePct),
        pensionEmployerPercent: String(numEmployerPct),
      },
      { method: "POST", action: "/app/pension" },
    );
    onComplete();
  };

  return (
    <FLPCard className={wizardContainerStyle}>
      {/* Header and Step Dots */}
      <div>
        <div className={stepIndicatorStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className={css({
                width: "28px",
                height: "28px",
                borderRadius: "full",
                backgroundColor: "#8b5cf6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "bold",
              })}
            >
              <FaRocket />
            </span>
            <FLPHeading as="h3" size="sm">
              Pension Setup Wizard
            </FLPHeading>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "full",
                  backgroundColor: s === step ? "#8b5cf6" : s < step ? "#10b981" : "#e4e4e7",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
        <FLPText color="text.muted" fontSize="xs">
          Step {step} of 3:{" "}
          {step === 1
            ? "Salary & Contributions"
            : step === 2
              ? "Add Existing Pot"
              : "Retirement Outlook"}
        </FLPText>
      </div>

      {/* Step 1: Salary & Contribution percentages */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <FLPHeading as="h4" size="md">
              Confirm your salary & contribution rates
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
              In the UK, auto-enrolment requires a minimum 8% total pension contribution (5%
              employee + 3% employer).
            </FLPText>
          </div>

          <div className={threeColGridStyle}>
            <div>
              <label
                htmlFor="wizard-salary"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Annual Salary (£)
              </label>
              <input
                className={inputStyle}
                id="wizard-salary"
                min="0"
                step="1000"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="wizard-employee-pct"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Employee Contrib (%)
              </label>
              <input
                className={inputStyle}
                id="wizard-employee-pct"
                max="50"
                min="0"
                step="0.5"
                type="number"
                value={employeePercent}
                onChange={(e) => setEmployeePercent(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="wizard-employer-pct"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Employer Contrib (%)
              </label>
              <input
                className={inputStyle}
                id="wizard-employer-pct"
                max="50"
                min="0"
                step="0.5"
                type="number"
                value={employerPercent}
                onChange={(e) => setEmployerPercent(e.target.value)}
              />
            </div>
          </div>

          <div
            className={css({
              padding: "16px",
              borderRadius: "lg",
              backgroundColor: "rgba(139, 92, 246, 0.05)",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            })}
          >
            <div>
              <FLPText fontSize="xs" fontWeight="bold" textTransform="uppercase" color="text.muted">
                Calculated Monthly Contributions
              </FLPText>
              <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "13px" }}>
                <span>
                  You: <strong>{formatCurrency(monthlyEmployee)}/mo</strong>
                </span>
                <span>
                  Employer: <strong>{formatCurrency(monthlyEmployer)}/mo</strong>
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#8b5cf6" }}>
                {formatCurrency(totalMonthly)}/month
              </span>
              <span style={{ fontSize: "12px", color: "text.muted", marginLeft: "4px" }}>
                total inflow
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Existing Pot */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <FLPHeading as="h4" size="md">
              Add your current pension pot
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
              Enter the details of your main workplace pension or SIPP. You can add more pots at any
              time.
            </FLPText>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                htmlFor="wizard-pot-name"
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Pension Provider / Pot Name
              </label>
              <input
                className={inputStyle}
                id="wizard-pot-name"
                list="wizard-provider-list"
                placeholder="e.g. Nest, Aviva, Vanguard SIPP"
                type="text"
                value={potName}
                onChange={(e) => setPotName(e.target.value)}
              />
              <datalist id="wizard-provider-list">
                {COMMON_PROVIDERS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className={twoColGridStyle}>
              <div>
                <label
                  htmlFor="wizard-pot-value"
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Current Value (£)
                </label>
                <input
                  className={inputStyle}
                  id="wizard-pot-value"
                  min="0"
                  step="100"
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="wizard-pot-growth"
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Assumed Return Rate (% p.a.)
                </label>
                <input
                  className={inputStyle}
                  id="wizard-pot-growth"
                  max="20"
                  min="1"
                  step="0.5"
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Outlook & Summary */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <FLPHeading as="h4" size="md">
              Your 25-Year Retirement Outlook
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
              Based on your inputs, here is what your pension could grow to with compound interest.
            </FLPText>
          </div>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
              gap: "16px",
            })}
          >
            <div
              className={css({
                padding: "16px",
                borderRadius: "lg",
                backgroundColor: "surface",
                border: "1px solid",
                borderColor: "border",
              })}
            >
              <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                POT VALUE IN 25 YEARS
              </FLPText>
              <FLPHeading as="h3" size="lg" style={{ color: "#8b5cf6", marginTop: "4px" }}>
                {formatCurrency(projected25Year)}
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                At {numGrowthRate}% annual return
              </FLPText>
            </div>

            <div
              className={css({
                padding: "16px",
                borderRadius: "lg",
                backgroundColor: "surface",
                border: "1px solid",
                borderColor: "border",
              })}
            >
              <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                EST. MONTHLY DRAWDOWN (4%)
              </FLPText>
              <FLPHeading as="h3" size="lg" style={{ color: "#10b981", marginTop: "4px" }}>
                {formatCurrency(monthlyRetirementIncome)}
                <span style={{ fontSize: "14px", fontWeight: "normal", color: "text.muted" }}>
                  /mo
                </span>
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                {formatCurrency(monthlyRetirementIncome * 12)}/year safe income
              </FLPText>
            </div>

            <div
              className={css({
                padding: "16px",
                borderRadius: "lg",
                backgroundColor: "surface",
                border: "1px solid",
                borderColor: "border",
              })}
            >
              <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                MONTHLY CONTRIBUTIONS
              </FLPText>
              <FLPHeading as="h3" size="lg" style={{ marginTop: "4px" }}>
                {formatCurrency(totalMonthly)}
                <span style={{ fontSize: "14px", fontWeight: "normal", color: "text.muted" }}>
                  /mo
                </span>
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                {numEmployeePct}% employee + {numEmployerPct}% employer
              </FLPText>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <div>
          {onDismiss && (
            <FLPButton size="sm" variant="outline" onClick={onDismiss}>
              Skip Setup
            </FLPButton>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          {step > 1 && (
            <FLPButton
              size="md"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              <FaArrowLeft style={{ marginRight: "6px" }} /> Back
            </FLPButton>
          )}

          {step < 3 ? (
            <FLPButton
              size="md"
              variant="primary"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            >
              Next <FaArrowRight style={{ marginLeft: "6px" }} />
            </FLPButton>
          ) : (
            <FLPButton size="md" variant="primary" onClick={handleFinish}>
              <FaCheckCircle style={{ marginRight: "6px" }} /> Save & Start Tracking
            </FLPButton>
          )}
        </div>
      </div>
    </FLPCard>
  );
};

export default PensionQuickStartWizard;

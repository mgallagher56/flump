import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import { calculateUKEWNITakeHome, getCurrentUKTaxYear, UK_STUDENT_LOANS } from "~/utils/taxRules";

interface UKTaxCalculatorProps {
  initialSalary?: number | null;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

const UKTaxCalculator: FC<UKTaxCalculatorProps> = ({ initialSalary, onApplyIncrease }) => {
  const { profile } = useUserProfile();
  const { formatCurrency, formatCurrencyDecimal } = useFormatCurrency();
  const [grossSalary, setGrossSalary] = useState<number>(initialSalary ?? 45000);
  const [pensionPercent, setPensionPercent] = useState<number>(5);
  const [studentLoanPlan, setStudentLoanPlan] = useState<string>("none");
  const [salaryIncrease, setSalaryIncrease] = useState<number>(5000);

  const taxYear = getCurrentUKTaxYear();
  const studentLoanPlans = UK_STUDENT_LOANS[taxYear]?.plans ?? UK_STUDENT_LOANS["2025/26"].plans;

  // Sync initialSalary from profile when loaded
  useEffect(() => {
    if (initialSalary) {
      setGrossSalary(initialSalary);
    }
  }, [initialSalary]);

  // Compute UK Taxes for standard gross salary
  const taxResults = useMemo(() => {
    return calculateUKTax(grossSalary, pensionPercent, studentLoanPlan, taxYear);
  }, [grossSalary, pensionPercent, studentLoanPlan, taxYear]);

  // Compute UK Taxes for hypothetical salary with raise
  const raiseResults = useMemo(() => {
    return calculateUKTax(grossSalary + salaryIncrease, pensionPercent, studentLoanPlan, taxYear);
  }, [grossSalary, salaryIncrease, pensionPercent, studentLoanPlan, taxYear]);

  const monthlyIncrease = useMemo(() => {
    const netCurrent = taxResults.netPay / 12;
    const netNew = raiseResults.netPay / 12;
    return Math.max(0, netNew - netCurrent);
  }, [taxResults, raiseResults]);

  // Pie Chart Data
  const pieData = useMemo(() => {
    const data = [
      { name: "Take-Home Pay", value: Math.round(taxResults.netPay), color: "#10B981" },
      { name: "Income Tax", value: Math.round(taxResults.incomeTax), color: "#EF4444" },
      { name: "National Insurance", value: Math.round(taxResults.ni), color: "#F59E0B" },
    ];

    if (taxResults.pension > 0) {
      data.push({
        name: "Pension contribution",
        value: Math.round(taxResults.pension),
        color: "#8B5CF6",
      });
    }
    if (taxResults.studentLoan > 0) {
      data.push({
        name: "Student Loan repayment",
        value: Math.round(taxResults.studentLoan),
        color: "#3B82F6",
      });
    }

    return data.filter((d) => d.value > 0);
  }, [taxResults]);

  // Styles
  const layoutGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "1fr 2fr" },
    gap: "32px",
    alignItems: "start",
  });

  const controlPanelStyle = css({
    padding: "24px",
    backgroundColor: "card",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  });

  const inputGroupStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });

  const sliderLabelRow = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const sliderStyle = css({
    width: "100%",
    accentColor: "var(--colors-primary)",
    cursor: "pointer",
    height: "6px",
    borderRadius: "full",
    backgroundColor: "border",
  });

  const numberInputStyle = css({
    width: "100%",
    padding: "8px 12px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    "&:focus": {
      borderColor: "primary",
      outline: "none",
    },
  });

  const selectStyle = css({
    width: "100%",
    padding: "8px 12px",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    fontSize: "sm",
    backgroundColor: "background",
    color: "text.primary",
    cursor: "pointer",
    "&:focus": {
      borderColor: "primary",
      outline: "none",
    },
  });

  const takeHomeHeaderCard = css({
    padding: "24px",
    borderRadius: "lg",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    border: "1px solid",
    borderColor: "success.500",
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  });

  const statsRowGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
    gap: "16px",
    marginBottom: "24px",
  });

  const breakdownTable = css({
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "sm",
    marginTop: "16px",
  });

  const thStyle = css({
    padding: "12px 16px",
    fontWeight: "bold",
    textAlign: "right",
    borderBottom: "2px solid",
    borderBottomColor: "border",
    color: "text.primary",
    "&:first-child": { textAlign: "left" },
  });

  const tdStyle = css({
    padding: "12px 16px",
    borderBottom: "1px solid",
    borderBottomColor: "border",
    textAlign: "right",
    color: "text.primary",
    "&:first-child": { textAlign: "left", fontWeight: "semibold" },
  });

  const raiseCardStyle = css({
    padding: "20px",
    borderRadius: "md",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    marginTop: "24px",
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Non-UK user notice */}
      {profile?.country && profile.country !== "GB" && (
        <div
          className={css({
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            border: "1px solid",
            borderColor: "warning.500",
            borderRadius: "md",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "text.primary",
          })}
        >
          <div>
            <FLPText fontWeight="semibold" fontSize="sm" color="warning.500">
              Tax Calculations Notice
            </FLPText>
            <FLPText fontSize="xs" color="text.muted" style={{ marginTop: "2px" }}>
              Please note that tax calculations and rules on this platform are based on UK HMRC
              laws/rules/taxes. We plan to onboard support for other countries soon.
            </FLPText>
          </div>
        </div>
      )}
      <div className={layoutGrid}>
        {/* Parameter Inputs (Left Column) */}
        <div className={controlPanelStyle}>
          <FLPHeading as="h3" size="md">
            Inputs
          </FLPHeading>

          {/* Gross Annual Salary */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Gross Salary
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {formatCurrency(grossSalary)}
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="250000"
              min="10000"
              step="1000"
              type="range"
              value={grossSalary}
              onChange={(e) => setGrossSalary(Number(e.target.value))}
            />
            <input
              className={numberInputStyle}
              type="number"
              value={grossSalary}
              onChange={(e) => setGrossSalary(Number(e.target.value))}
            />
          </div>

          {/* Pension Contribution */}
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Pension Contribution
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {pensionPercent}%
              </FLPText>
            </div>
            <input
              className={sliderStyle}
              max="20"
              min="0"
              step="1"
              type="range"
              value={pensionPercent}
              onChange={(e) => setPensionPercent(Number(e.target.value))}
            />
          </div>

          <FLPHeading as="h3" size="md">
            Student Loan
          </FLPHeading>
          <div className={inputGroupStyle}>
            <div className={sliderLabelRow}>
              <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase">
                Plan
              </FLPText>
            </div>
            <select
              className={selectStyle}
              value={studentLoanPlan}
              onChange={(e) => setStudentLoanPlan(e.target.value)}
            >
              <option value="none">No student loan</option>
              {Object.entries(studentLoanPlans).map(([key, plan]) => (
                <option key={key} value={key}>
                  {plan.name} — threshold{" "}
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP",
                    maximumFractionDigits: 0,
                  }).format(plan.threshold)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results (Right Column) */}
        <FLPCard>
          {/* Large monthly take home summary */}
          <div className={takeHomeHeaderCard}>
            <div>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Monthly Take-Home Pay
              </FLPText>
              <FLPHeading as="h2" color="success.500" mt={1} size="2xl">
                {formatCurrencyDecimal(taxResults.netPay / 12)}
              </FLPHeading>
            </div>
            <div style={{ textAlign: "right" }}>
              <FLPText
                color="text.muted"
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
              >
                Annual Take-Home Pay
              </FLPText>
              <FLPHeading as="h3" color="text.primary" mt={1} size="lg">
                {formatCurrency(taxResults.netPay)}
              </FLPHeading>
            </div>
          </div>

          {/* Smaller rates break-down cards */}
          <div className={statsRowGrid}>
            <div
              style={{
                padding: "12px",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "md",
              }}
            >
              <FLPText color="text.muted" fontSize="10px" textTransform="uppercase">
                Weekly Net
              </FLPText>
              <FLPHeading as="h5" size="sm" mt={1}>
                {formatCurrencyDecimal(taxResults.netPay / 52)}
              </FLPHeading>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "md",
              }}
            >
              <FLPText color="text.muted" fontSize="10px" textTransform="uppercase">
                Daily Net (5d)
              </FLPText>
              <FLPHeading as="h5" size="sm" mt={1}>
                {formatCurrencyDecimal(taxResults.netPay / 260)}
              </FLPHeading>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "md",
              }}
            >
              <FLPText color="text.muted" fontSize="10px" textTransform="uppercase">
                Effective Tax Rate
              </FLPText>
              <FLPHeading as="h5" size="sm" mt={1}>
                {Math.round(((grossSalary - taxResults.netPay) / grossSalary) * 100)}%
              </FLPHeading>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "md",
              }}
            >
              <FLPText color="text.muted" fontSize="10px" textTransform="uppercase">
                Qualifying Gross
              </FLPText>
              <FLPHeading as="h5" size="sm" mt={1}>
                {formatCurrency(taxResults.adjustedGross)}
              </FLPHeading>
            </div>
          </div>

          {/* Donut and Table section */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1.2fr 1fr" },
              gap: "24px",
              alignItems: "center",
            })}
          >
            <div>
              <FLPHeading as="h4" size="sm">
                Salary Deductions Breakdown
              </FLPHeading>
              <table className={breakdownTable}>
                <thead>
                  <tr>
                    <th className={thStyle}>Deduction</th>
                    <th className={thStyle}>Annual</th>
                    <th className={thStyle}>Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={tdStyle}>Gross Income</td>
                    <td className={tdStyle}>{formatCurrency(grossSalary)}</td>
                    <td className={tdStyle}>{formatCurrency(grossSalary / 12)}</td>
                  </tr>
                  {taxResults.pension > 0 && (
                    <tr>
                      <td className={tdStyle} style={{ color: "#8b5cf6" }}>
                        Pension (Sacrifice)
                      </td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.pension)}</td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.pension / 12)}</td>
                    </tr>
                  )}
                  {taxResults.incomeTax > 0 && (
                    <tr>
                      <td className={tdStyle} style={{ color: "#ef4444" }}>
                        Income Tax
                      </td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.incomeTax)}</td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.incomeTax / 12)}</td>
                    </tr>
                  )}
                  {taxResults.ni > 0 && (
                    <tr>
                      <td className={tdStyle} style={{ color: "#f59e0b" }}>
                        National Insurance
                      </td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.ni)}</td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.ni / 12)}</td>
                    </tr>
                  )}
                  {taxResults.studentLoan > 0 && (
                    <tr>
                      <td className={tdStyle} style={{ color: "#3b82f6" }}>
                        Student Loan
                      </td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.studentLoan)}</td>
                      <td className={tdStyle}>-{formatCurrency(taxResults.studentLoan / 12)}</td>
                    </tr>
                  )}
                  <tr
                    style={{ borderTop: "2px solid", borderTopColor: "border", fontWeight: "bold" }}
                  >
                    <td className={tdStyle}>Net Take-Home</td>
                    <td className={tdStyle}>{formatCurrency(taxResults.netPay)}</td>
                    <td className={tdStyle}>{formatCurrency(taxResults.netPay / 12)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Allocation Donut */}
            <div
              style={{
                height: "200px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ResponsiveContainer height="80%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={pieData}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              {/* Pie Legends */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "center",
                  marginTop: "10px",
                }}
              >
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: d.color,
                      }}
                    />
                    <FLPText fontSize="10px" color="text.muted">
                      {d.name}
                    </FLPText>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hypothetical Salary Increase Tool */}
          <div className={raiseCardStyle}>
            <div style={{ flex: 1 }}>
              <FLPHeading as="h4" size="sm">
                Salary Increase Impact
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                Input a raise to compute how much more take-home pay you can save monthly.
              </FLPText>

              <div
                style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <FLPText fontSize="10px" fontWeight="semibold" textTransform="uppercase">
                    Raise Amount (GBP)
                  </FLPText>
                  <input
                    className={numberInputStyle}
                    style={{ marginTop: "4px" }}
                    type="number"
                    value={salaryIncrease}
                    onChange={(e) => setSalaryIncrease(Number(e.target.value))}
                  />
                </div>
                <div>
                  <FLPText fontSize="10px" fontWeight="semibold" textTransform="uppercase">
                    Net Monthly Increase
                  </FLPText>
                  <FLPHeading as="h5" size="md" color="success.500" mt={1}>
                    +{formatCurrency(monthlyIncrease)}/mo
                  </FLPHeading>
                </div>
              </div>
            </div>

            <FLPButton onClick={() => onApplyIncrease(monthlyIncrease)}>
              Apply to Savings Forecaster
            </FLPButton>
          </div>
        </FLPCard>
      </div>

      {/* Disclaimer footer */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingTop: "8px",
        })}
      >
        <TaxDisclaimerButton showShortText />
      </div>
    </div>
  );
};

/**
 * calculateUKTax — wrapper that delegates to the canonical taxRules.ts helper.
 *
 * Accepts an optional taxYear (defaults to the current UK tax year).
 * Maintains the existing return shape for backwards compatibility with
 * callers that expect { pension, incomeTax, ni, studentLoan, netPay, ... }.
 */
export const calculateUKTax = (
  gross: number,
  pensionPercent: number,
  studentLoanPlan: string,
  taxYear?: string,
) => {
  const year = taxYear ?? getCurrentUKTaxYear();
  const planKey =
    studentLoanPlan !== "none"
      ? (studentLoanPlan as keyof (typeof UK_STUDENT_LOANS)[string]["plans"])
      : "none";

  const result = calculateUKEWNITakeHome(
    gross,
    "employed", // this calculator is for employed/PAYE context
    pensionPercent,
    true, // salary sacrifice assumed for the forecast calculator
    year,
    planKey,
  );

  return {
    pension: result.pension,
    incomeTax: result.incomeTax,
    ni: result.ni,
    studentLoan: result.studentLoan,
    netPay: result.netAnnual,
    gross: result.gross,
    adjustedGross: Math.max(0, gross - result.pension),
    personalAllowance: result.personalAllowance,
  };
};

export default UKTaxCalculator;

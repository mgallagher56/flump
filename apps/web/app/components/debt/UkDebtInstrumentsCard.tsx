import {
  calculateCarFinanceBalloon,
  calculateOverdraftCost,
  calculateZeroPercentCliff,
  evaluateUkStudentLoan,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaCar,
  FaCreditCard,
  FaExclamationTriangle,
  FaGraduationCap,
  FaInfoCircle,
  FaMoneyBillWave,
  FaShieldAlt,
} from "react-icons/fa";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

const containerStyle = css({
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

const tabsHeaderStyle = css({
  display: "flex",
  backgroundColor: "surface.sunken",
  border: "1px solid",
  borderColor: "border.subtle",
  padding: "4px",
  borderRadius: "lg",
  gap: "4px",
  overflowX: "auto",
});

const tabButtonStyle = (active: boolean) =>
  css({
    padding: "8px 14px",
    borderRadius: "md",
    fontSize: "13px",
    fontWeight: "semibold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: active ? "card" : "transparent",
    color: active ? "text.primary" : "text.muted",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
    border: "1px solid",
    borderColor: active ? "border.subtle" : "transparent",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    _hover: active ? {} : { color: "text.primary" },
  });

const toolGridStyle = css({
  display: "grid",
  gridTemplateColumns: {
    base: "1fr",
    md: "1fr 1fr",
  },
  gap: "20px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const textInputStyle = css({
  padding: "8px 12px",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  fontSize: "14px",
});

const resultBoxStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  padding: "16px",
  borderRadius: "lg",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const alertBannerStyle = css({
  padding: "12px 16px",
  borderRadius: "md",
  backgroundColor: "#fef2f2",
  border: "1px solid #f87171",
  color: "#991b1b",
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "13px",
});

const safeBannerStyle = css({
  padding: "12px 16px",
  borderRadius: "md",
  backgroundColor: "#ecfdf5",
  border: "1px solid #34d399",
  color: "#065f46",
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "13px",
});

export const UkDebtInstrumentsCard: FC = () => {
  const { formatCurrency } = useFormatCurrency();
  const [activeTab, setActiveTab] = useState<"cliff" | "overdraft" | "balloon" | "student">(
    "cliff",
  );

  // 1. 0% Balance Transfer State
  const [btBalance, setBtBalance] = useState<number>(3000);
  const [btMonthsRemaining, setBtMonthsRemaining] = useState<number>(10);
  const [btRevertApr, setBtRevertApr] = useState<number>(24.9);

  const cliffResult = useMemo(() => {
    return calculateZeroPercentCliff(btBalance, btMonthsRemaining, btRevertApr);
  }, [btBalance, btMonthsRemaining, btRevertApr]);

  // 2. Arranged Overdraft State
  const [overdraftBalance, setOverdraftBalance] = useState<number>(1200);
  const [overdraftEar, setOverdraftEar] = useState<number>(39.9);

  const overdraftResult = useMemo(() => {
    return calculateOverdraftCost(overdraftBalance, overdraftEar);
  }, [overdraftBalance, overdraftEar]);

  // 3. PCP / HP Balloon State
  const [balloonAmount, setBalloonAmount] = useState<number>(8500);
  const [financeMonthsRemaining, setFinanceMonthsRemaining] = useState<number>(24);
  const [financeMonthlyPayment, setFinanceMonthlyPayment] = useState<number>(320);

  const balloonResult = useMemo(() => {
    return calculateCarFinanceBalloon(financeMonthlyPayment, financeMonthsRemaining, balloonAmount);
  }, [financeMonthlyPayment, financeMonthsRemaining, balloonAmount]);

  // 4. Student Loan State
  const [studentSalary, setStudentSalary] = useState<number>(36000);
  const [studentBalance, setStudentBalance] = useState<number>(45000);
  const [studentPlan, setStudentPlan] = useState<
    "plan1" | "plan2" | "plan4" | "plan5" | "postgrad"
  >("plan2");

  const studentResult = useMemo(() => {
    return evaluateUkStudentLoan(studentPlan, studentSalary, studentBalance);
  }, [studentPlan, studentSalary, studentBalance]);

  return (
    <FLPCard>
      <div className={containerStyle}>
        <div>
          <FLPHeading as="h3" size="xl">
            UK Debt Rules & Specialised Instruments
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm">
            UK credit operates under distinct consumer rules. Flump accounts for promotional
            windows, high bank EAR rates, and graduate tax dynamics.
          </FLPText>
        </div>

        <div className={tabsHeaderStyle}>
          <button
            aria-label="0% Balance Transfer Expiry Tracker"
            className={tabButtonStyle(activeTab === "cliff")}
            type="button"
            onClick={() => setActiveTab("cliff")}
          >
            <FaCreditCard /> 0% Expiry Tracker
          </button>
          <button
            aria-label="Arranged Overdraft EAR Cost"
            className={tabButtonStyle(activeTab === "overdraft")}
            type="button"
            onClick={() => setActiveTab("overdraft")}
          >
            <FaMoneyBillWave /> Arranged Overdraft Cost
          </button>
          <button
            aria-label="PCP / HP Car Finance Balloon"
            className={tabButtonStyle(activeTab === "balloon")}
            type="button"
            onClick={() => setActiveTab("balloon")}
          >
            <FaCar /> PCP / HP Balloon Tracker
          </button>
          <button
            aria-label="UK Student Loan Distinction"
            className={tabButtonStyle(activeTab === "student")}
            type="button"
            onClick={() => setActiveTab("student")}
          >
            <FaGraduationCap /> UK Student Loan Guardrail
          </button>
        </div>

        {/* Tab 1: 0% Balance Transfer Cliff Tracker */}
        {activeTab === "cliff" && (
          <div className={toolGridStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Current 0% Card Balance</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={btBalance}
                  onChange={(e) => setBtBalance(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Months Remaining on 0% Window</FLPText>
                <input
                  className={textInputStyle}
                  max="48"
                  min="1"
                  type="number"
                  value={btMonthsRemaining}
                  onChange={(e) => setBtMonthsRemaining(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Revert APR After Window Closes (%)</FLPText>
                <input
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={btRevertApr}
                  onChange={(e) => setBtRevertApr(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={resultBoxStyle}>
              <FLPText fontSize="md" fontWeight="bold">
                Promotional expiry diagnosis
              </FLPText>

              {cliffResult.alertRequired ? (
                <div className={alertBannerStyle}>
                  <FaExclamationTriangle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Promotional window alert:</strong> You have approximately{" "}
                    {cliffResult.daysRemaining} days remaining. Pay down{" "}
                    {formatCurrency(cliffResult.requiredMonthlyPayment)}/mo or prepare to refinance
                    to avoid the {btRevertApr}% revert APR.
                  </div>
                </div>
              ) : (
                <div className={safeBannerStyle}>
                  <FaShieldAlt size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    Window active ({cliffResult.daysRemaining} days left). Maintain target payments
                    to clear without penalty.
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--colors-border)",
                  paddingBottom: "8px",
                }}
              >
                <FLPText fontSize="sm">Target monthly payment before expiry:</FLPText>
                <FLPText color="primary" fontSize="sm" fontWeight="bold">
                  {formatCurrency(cliffResult.requiredMonthlyPayment)}/mo
                </FLPText>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--colors-border)",
                  paddingBottom: "8px",
                }}
              >
                <FLPText fontSize="sm">Estimated penalty interest if left unpaid year 1:</FLPText>
                <FLPText color="red.600" fontSize="sm" fontWeight="bold">
                  {formatCurrency(cliffResult.penaltyInterestFirstYearIfUnpaid)}
                </FLPText>
              </div>

              <FLPText color="text.muted" fontSize="xs">
                💡 Note: Never make only the minimum repayment on a 0% card, or you will revert to
                the full APR with an unaddressed balance.
              </FLPText>
            </div>
          </div>
        )}

        {/* Tab 2: Arranged Overdraft Cost Calculator */}
        {activeTab === "overdraft" && (
          <div className={toolGridStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Average Arranged Overdraft Balance</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={overdraftBalance}
                  onChange={(e) => setOverdraftBalance(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Bank EAR Rate (%) (UK standard is ~39.9%)</FLPText>
                <input
                  className={textInputStyle}
                  step="0.1"
                  type="number"
                  value={overdraftEar}
                  onChange={(e) => setOverdraftEar(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={resultBoxStyle}>
              <FLPText fontSize="md" fontWeight="bold">
                True Annual Overdraft Drain
              </FLPText>

              <div
                style={{
                  backgroundColor: "#fef2f2",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                }}
              >
                <FLPText color="red.700" fontSize="xs">
                  Living continuously in a {formatCurrency(overdraftBalance)} overdraft costs you:
                </FLPText>
                <FLPHeading as="h4" color="red.700" size="xl" style={{ marginTop: "4px" }}>
                  {formatCurrency(overdraftResult.annualPoundCost)} / year
                </FLPHeading>
                <FLPText color="red.600" fontSize="xs">
                  (~{formatCurrency(overdraftResult.monthlyPoundCost)}/month in stealth interest
                  charges)
                </FLPText>
              </div>

              <FLPText color="text.muted" fontSize="xs">
                Unlike a fixed loan payment, overdraft fees feel invisible because they are deducted
                directly from your account balance. Prioritize clearing this buffer in Stage 1!
              </FLPText>
            </div>
          </div>
        )}

        {/* Tab 3: PCP / HP Car Finance Balloon Tracker */}
        {activeTab === "balloon" && (
          <div className={toolGridStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Monthly Finance Payment</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={financeMonthlyPayment}
                  onChange={(e) => setFinanceMonthlyPayment(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Months Remaining in Agreement</FLPText>
                <input
                  className={textInputStyle}
                  min="1"
                  type="number"
                  value={financeMonthsRemaining}
                  onChange={(e) => setFinanceMonthsRemaining(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Final Optional Balloon / GFV Amount</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={balloonAmount}
                  onChange={(e) => setBalloonAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={resultBoxStyle}>
              <FLPText fontSize="md" fontWeight="bold">
                Balloon Sinking Fund Goal
              </FLPText>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--colors-border)",
                  paddingBottom: "8px",
                }}
              >
                <FLPText fontSize="sm">Recommended Monthly Sinking Fund:</FLPText>
                <FLPText color="primary" fontSize="sm" fontWeight="bold">
                  {formatCurrency(balloonResult.monthlySinkingFundNeeded)}/mo
                </FLPText>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--colors-border)",
                  paddingBottom: "8px",
                }}
              >
                <FLPText fontSize="sm">Total Vehicle Agreement Outlay:</FLPText>
                <FLPText fontSize="sm" fontWeight="bold">
                  {formatCurrency(balloonResult.totalCostOfFinance)}
                </FLPText>
              </div>

              <FLPText color="text.muted" fontSize="xs">
                Setting aside {formatCurrency(balloonResult.monthlySinkingFundNeeded)}/month in an
                easy-access savings account ensures you have the full{" "}
                {formatCurrency(balloonAmount)} ready when the contract expires if you choose to
                purchase the car.
              </FLPText>
            </div>
          </div>
        )}

        {/* Tab 4: UK Student Loan Distinction */}
        {activeTab === "student" && (
          <div className={toolGridStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Student Loan Plan</FLPText>
                <select
                  aria-label="Student Loan Plan"
                  className={textInputStyle}
                  value={studentPlan}
                  onChange={(e) => setStudentPlan(e.target.value as any)}
                >
                  <option value="plan1">Plan 1 (Pre-2012 England/Wales, NI)</option>
                  <option value="plan2">Plan 2 (2012-2023 England/Wales)</option>
                  <option value="plan4">Plan 4 (Scotland)</option>
                  <option value="plan5">Plan 5 (Post-2023 England)</option>
                  <option value="postgrad">Postgraduate Loan</option>
                </select>
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Gross Annual Salary</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={studentSalary}
                  onChange={(e) => setStudentSalary(Number(e.target.value))}
                />
              </div>

              <div className={inputGroupStyle}>
                <FLPText fontSize="sm">Current Outstanding Balance</FLPText>
                <input
                  className={textInputStyle}
                  min="0"
                  type="number"
                  value={studentBalance}
                  onChange={(e) => setStudentBalance(Number(e.target.value))}
                />
              </div>
            </div>

            <div className={resultBoxStyle}>
              <FLPText fontSize="md" fontWeight="bold">
                Graduate Tax Guardrail
              </FLPText>

              {studentResult.recommendation === "do_not_overpay" ? (
                <div className={safeBannerStyle}>
                  <FaInfoCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Do NOT Overpay:</strong> UK Student loans are wiped after{" "}
                    {studentResult.writeOffYears} years. Because repayments are capped at{" "}
                    {studentResult.rate}% above {formatCurrency(studentResult.threshold)}, any
                    voluntary overpayment is likely lost to HM Treasury.
                  </div>
                </div>
              ) : (
                <div className={alertBannerStyle}>
                  <FaInfoCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>High Earner Exception:</strong> At your current income trajectory, you
                    may clear the principal prior to write-off. Compare returns against ISAs and
                    pensions before overpaying.
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--colors-border)",
                  paddingBottom: "8px",
                }}
              >
                <FLPText fontSize="sm">Statutory Deduction from Salary:</FLPText>
                <FLPText fontSize="sm" fontWeight="bold">
                  {formatCurrency(studentResult.monthlyRepayment)}/mo (
                  {formatCurrency(studentResult.annualRepayment)}/yr)
                </FLPText>
              </div>

              <FLPText color="text.muted" fontSize="xs">
                {studentResult.reasoning}
              </FLPText>
            </div>
          </div>
        )}
      </div>
    </FLPCard>
  );
};

export default UkDebtInstrumentsCard;

import { calculateTaxTrapRelief } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px", sm: "32px" },
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.06)",
  marginBottom: "40px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "20px",
});

const sliderStyle = css({
  width: "100%",
  accentColor: "#6366f1",
  cursor: "pointer",
  height: "6px",
});

const metricsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr)" },
  gap: "16px",
  marginTop: "24px",
  marginBottom: "24px",
});

const metricCard = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const TaxTrapCalculatorTool: FC = () => {
  const navigate = useNavigate();
  const [grossIncome, setGrossIncome] = useState<number>(115000);
  const [salarySacrifice, setSalarySacrifice] = useState<number>(10000);

  const analysis = useMemo(() => {
    return calculateTaxTrapRelief(grossIncome);
  }, [grossIncome]);

  const allowanceReclaimed = Math.min(
    analysis.lostPersonalAllowance,
    Math.round(salarySacrifice / 2),
  );

  // Portion of sacrifice falling in the 60% trap (£100k-£125k) saves 62% (with 2% NI)
  const inTrapSacrifice = Math.min(analysis.excessAbove100k, salarySacrifice);
  const aboveTrapSacrifice = Math.max(0, salarySacrifice - analysis.excessAbove100k);
  const totalTaxSaved = Math.round(inTrapSacrifice * 0.62 + aboveTrapSacrifice * 0.42);

  const maxSacrifice = Math.min(60000, Math.max(0, grossIncome - 20000));
  const isTrapZone = grossIncome > 100000;
  const netIncomeAfterSacrifice = Math.max(0, grossIncome - salarySacrifice);
  const childcareEligible = netIncomeAfterSacrifice <= 100000;

  const handleSaveAndContinue = () => {
    try {
      const seed = {
        grossSalary: grossIncome,
        monthlyCashSavings: 1000,
        mortgageBalance: 250000,
        inferredModules: ["tax", "pension", "forecast"],
        timestamp: Date.now(),
      };
      localStorage.setItem("flump_onboarding_seed", JSON.stringify(seed));
    } catch (e) {
      console.warn("Could not save seed:", e);
    }
    navigate("/signUp");
  };

  return (
    <div className={cardStyle} data-testid="tax-trap-calculator-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "full",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "#6366f1",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            UK 2026/27 Tax Engine
          </span>
          {isTrapZone && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 10px",
                borderRadius: "full",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <FiAlertTriangle size={13} /> 60% Trap Active
            </span>
          )}
        </div>
        <FLPHeading as="h2" color="text.primary" mb={1} size="xl">
          Interactive £100k–£125k Tax Trap Modeler
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Slide your income and test how salary sacrifice or SIPP contributions reclaim your
          personal allowance and unlock tax-free childcare.
        </FLPText>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        {/* Gross Income Input */}
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="gross-income-slider" style={{ fontSize: "14px", fontWeight: 600 }}>
              Total Gross UK Income (Salary + Bonus + Side Income)
            </label>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#6366f1" }}>
              £{grossIncome.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="gross-income-slider"
            max={160000}
            min={70000}
            onChange={(e) => setGrossIncome(Number(e.target.value))}
            step={1000}
            type="range"
            value={grossIncome}
          />
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            HMRC personal allowance taper begins at £100,000 and eliminates all £12,570 allowance by
            £125,140.
          </span>
        </div>

        {/* Salary Sacrifice Slider */}
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="pension-sacrifice-slider" style={{ fontSize: "14px", fontWeight: 600 }}>
              Pension Salary Sacrifice / SIPP Contribution
            </label>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>
              £{salarySacrifice.toLocaleString("en-GB")} / yr (£
              {Math.round(salarySacrifice / 12).toLocaleString("en-GB")}/mo)
            </span>
          </div>
          <input
            className={sliderStyle}
            id="pension-sacrifice-slider"
            max={maxSacrifice}
            min={0}
            onChange={(e) => setSalarySacrifice(Number(e.target.value))}
            step={500}
            type="range"
            value={salarySacrifice}
          />
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Annual pension contributions reduce your adjusted net income pound-for-pound against
            HMRC limits (£60,000 annual allowance).
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            Tax & NI Saved
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#10b981" }}>
            £{totalTaxSaved.toLocaleString("en-GB")}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            £{Math.round(totalTaxSaved / 12).toLocaleString("en-GB")}/mo kept from HMRC
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            Personal Allowance Reclaimed
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#6366f1" }}>
            £{allowanceReclaimed.toLocaleString("en-GB")}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Out of £{analysis.lostPersonalAllowance.toLocaleString("en-GB")} lost at £
            {grossIncome.toLocaleString("en-GB")}
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            Tax-Free Childcare (15-30h)
          </span>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: childcareEligible ? "#10b981" : "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {childcareEligible ? (
              <>
                <FiCheckCircle size={18} /> Eligible
              </>
            ) : (
              <>
                <FiAlertTriangle size={18} /> Ineligible (&gt;£100k)
              </>
            )}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            {childcareEligible
              ? "Net income £100k or below — retain up to £2,000/child/yr"
              : "Adjusted net income exceeds £100k threshold"}
          </span>
        </div>
      </div>

      {/* Action CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingTop: "20px",
          borderTop: "1px solid var(--colors-border)",
        }}
      >
        <div style={{ maxWidth: "440px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--colors-text-primary)" }}>
            Want to model multi-year pension runway & automated HMRC tax tracking?
          </span>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Sign up for Flump to connect bank accounts and lock in your complete UK tax baseline.
          </p>
        </div>

        <FLPButton onClick={handleSaveAndContinue} size="lg">
          Save Scenario & Continue Free <FiArrowRight aria-hidden="true" />
        </FLPButton>
      </div>
    </div>
  );
};

export default TaxTrapCalculatorTool;

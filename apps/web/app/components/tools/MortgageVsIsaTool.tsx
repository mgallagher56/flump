import { persistOnboardingSeed } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import { FiArrowRight, FiHome, FiTrendingUp } from "react-icons/fi";
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

const inputGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
  gap: "20px",
  marginBottom: "24px",
});

const inputGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
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

export const MortgageVsIsaTool: FC = () => {
  const navigate = useNavigate();
  const [mortgageBalance, setMortgageBalance] = useState<number>(240000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingYears, setRemainingYears] = useState<number>(20);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(350);
  const [isaExpectedReturn, setIsaExpectedReturn] = useState<number>(7.0);

  const simulation = useMemo(() => {
    const months = remainingYears * 12;
    const monthlyRate = interestRate / 100 / 12;
    const monthlyIsaRate = isaExpectedReturn / 100 / 12;

    // Standard mortgage monthly payment
    const standardPayment =
      monthlyRate > 0
        ? (mortgageBalance * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1)
        : mortgageBalance / months;

    // 1. Overpayment amortisation
    let bal = mortgageBalance;
    let totalInterestOverpay = 0;
    let monthsToZero = 0;
    for (let m = 1; m <= months; m++) {
      if (bal <= 0) break;
      const interest = bal * monthlyRate;
      totalInterestOverpay += interest;
      const principal = Math.min(bal, standardPayment + monthlyContribution - interest);
      bal -= principal;
      monthsToZero = m;
    }

    // Standard total interest without overpayment
    let standardBal = mortgageBalance;
    let totalStandardInterest = 0;
    for (let m = 1; m <= months; m++) {
      if (standardBal <= 0) break;
      const interest = standardBal * monthlyRate;
      totalStandardInterest += interest;
      const principal = Math.min(standardBal, standardPayment - interest);
      standardBal -= principal;
    }

    const interestSaved = Math.max(0, totalStandardInterest - totalInterestOverpay);
    const monthsShaved = Math.max(0, months - monthsToZero);
    const yearsShaved = (monthsShaved / 12).toFixed(1);

    // 2. ISA compound investment pot
    let isaPot = 0;
    for (let m = 1; m <= months; m++) {
      isaPot = (isaPot + monthlyContribution) * (1 + monthlyIsaRate);
    }
    const totalIsaContributed = monthlyContribution * months;
    const isaGrowth = Math.max(0, isaPot - totalIsaContributed);

    // Net advantage of ISA over mortgage interest saved
    const isaNetAdvantage = isaPot - (totalIsaContributed + interestSaved);

    return {
      standardPayment,
      interestSaved,
      yearsShaved,
      isaPot,
      isaGrowth,
      isaNetAdvantage,
    };
  }, [mortgageBalance, interestRate, remainingYears, monthlyContribution, isaExpectedReturn]);

  const handleSaveAndContinue = () => {
    persistOnboardingSeed({
      annualIncome: 75000,
      monthlyContribution,
      mortgageBalance,
      inferredModules: ["mortgage", "savings", "forecast"],
      timestamp: Date.now(),
    });
    navigate("/signUp");
  };

  return (
    <div className={cardStyle} data-testid="mortgage-vs-isa-tool">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "full",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              color: "#f59e0b",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            UK mortgage and wealth engine
          </span>
        </div>
        <FLPHeading as="h2" color="text.primary" mb={1} size="xl">
          Mortgage overpayment vs Stocks and Shares ISA comparator
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm">
          Mathematically compare the guaranteed interest savings of mortgage overpayments against
          the compound returns of a tax-efficient UK Stocks and Shares ISA.
        </FLPText>
      </div>

      <div className={inputGridStyle}>
        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="mortgage-bal" style={{ fontSize: "13px", fontWeight: 600 }}>
              Mortgage balance
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>
              £{mortgageBalance.toLocaleString("en-GB")}
            </span>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-bal"
            max={750000}
            min={50000}
            onChange={(e) => setMortgageBalance(Number(e.target.value))}
            step={5000}
            type="range"
            value={mortgageBalance}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="mortgage-rate" style={{ fontSize: "13px", fontWeight: 600 }}>
              Mortgage interest rate
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>
              {interestRate}%
            </span>
          </div>
          <input
            className={sliderStyle}
            id="mortgage-rate"
            max={8.0}
            min={1.5}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            step={0.1}
            type="range"
            value={interestRate}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="monthly-extra" style={{ fontSize: "13px", fontWeight: 600 }}>
              Monthly extra cash
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#6366f1" }}>
              £{monthlyContribution.toLocaleString("en-GB")} / mo
            </span>
          </div>
          <input
            className={sliderStyle}
            id="monthly-extra"
            max={1500}
            min={50}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            step={25}
            type="range"
            value={monthlyContribution}
          />
        </div>

        <div className={inputGroupStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="isa-return" style={{ fontSize: "13px", fontWeight: 600 }}>
              Expected Stocks and Shares ISA return
            </label>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#10b981" }}>
              {isaExpectedReturn}%
            </span>
          </div>
          <input
            className={sliderStyle}
            id="isa-return"
            max={12.0}
            min={3.0}
            onChange={(e) => setIsaExpectedReturn(Number(e.target.value))}
            step={0.25}
            type="range"
            value={isaExpectedReturn}
          />
        </div>
      </div>

      {/* Results */}
      <div className={metricsGridStyle}>
        <div className={metricCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FiHome color="var(--colors-warning-500)" size={14} />
            <span style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: 600 }}>
              Mortgage overpayment
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{ fontSize: "22px", fontWeight: 800, color: "var(--colors-warning-500)" }}
          >
            Save £{Math.round(simulation.interestSaved).toLocaleString("en-GB")}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}
          >
            Shaves ~{simulation.yearsShaved} years off loan term
          </span>
        </div>

        <div className={metricCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FiTrendingUp color="var(--colors-success-500)" size={14} />
            <span style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: 600 }}>
              Stocks and Shares ISA pot
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{ fontSize: "22px", fontWeight: 800, color: "var(--colors-success-500)" }}
          >
            £{Math.round(simulation.isaPot).toLocaleString("en-GB")}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}
          >
            Includes £{Math.round(simulation.isaGrowth).toLocaleString("en-GB")} in tax-free returns
          </span>
        </div>

        <div className={metricCard}>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: 600 }}>
            ISA net wealth spread
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color:
                simulation.isaNetAdvantage >= 0
                  ? "var(--colors-success-500)"
                  : "var(--colors-destructive-500)",
            }}
          >
            {simulation.isaNetAdvantage >= 0 ? "+" : ""}£
            {Math.round(simulation.isaNetAdvantage).toLocaleString("en-GB")}
          </span>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            {simulation.isaNetAdvantage >= 0
              ? "Expected net wealth gain from investing"
              : "Overpaying mortgage yields higher return"}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
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
            Ready to track your mortgage deal expiry and live ISA yields?
          </span>
          <p style={{ fontSize: "12px", color: "var(--colors-text-muted)", margin: 0 }}>
            Flump syncs your live balance and monitors fixed-rate renewal dates automatically.
          </p>
        </div>

        <FLPButton onClick={handleSaveAndContinue} size="lg">
          Model your mortgage in Flump <FiArrowRight aria-hidden="true" />
        </FLPButton>
      </div>
    </div>
  );
};

export default MortgageVsIsaTool;

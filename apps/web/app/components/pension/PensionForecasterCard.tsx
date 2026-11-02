import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaLightbulb, FaSync, FaUndo } from "react-icons/fa";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface PensionForecasterCardProps {
  currentPotTotal: number;
  initialSalary: number | null;
  initialEmployeePercent: number;
  initialEmployerPercent: number;
  directMonthlyContrib?: number;
  portfolioReturnRate?: number;
  onSyncToProfile?: (employeePct: number, employerPct: number, salary?: number) => void;
}

const UK_QUALIFYING_LOWER = 6240;
const UK_QUALIFYING_UPPER = 50270;
const UK_ANNUAL_ALLOWANCE = 60000;
const UK_LUMP_SUM_ALLOWANCE = 268275;
const UK_STATE_PENSION_ANNUAL = 11502;
const INFLATION_RATE = 2.5;

// PLSA UK Retirement Living Standards (Single Person, monthly)
const PLSA_MINIMUM = 1200; // £14,400/yr
const PLSA_MODERATE = 2608; // £31,300/yr
const PLSA_COMFORTABLE = 3591; // £43,100/yr

const cardStyle = css({
  padding: "24px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
});

const controlsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "16px",
  backgroundColor: "rgba(139, 92, 246, 0.03)",
  padding: "20px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
});

const formGroupStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
});

const labelStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  color: "text.muted",
  textTransform: "uppercase",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

const inputStyle = css({
  width: "100%",
  padding: "8px 12px",
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
  },
});

const presetBtnStyle = (active: boolean) =>
  css({
    padding: "6px 12px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: active ? "semibold" : "medium",
    backgroundColor: active ? "primary" : "rgba(139, 92, 246, 0.08)",
    color: active ? "primary.foreground" : "text.primary",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      opacity: 0.9,
    },
  });

const togglePillStyle = (active: boolean) =>
  css({
    padding: "6px 12px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: active ? "semibold" : "medium",
    backgroundColor: active ? "rgba(139, 92, 246, 0.15)" : "transparent",
    color: active ? "#8b5cf6" : "text.muted",
    border: "1px solid",
    borderColor: active ? "#8b5cf6" : "border",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  });

const statsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
  gap: "12px",
  padding: "16px",
  borderRadius: "lg",
  backgroundColor: "rgba(139, 92, 246, 0.04)",
  border: "1px solid",
  borderColor: "border",
});

const PRESETS = [
  { label: "Conservative (3%)", rate: 3.0 },
  { label: "Moderate (5%)", rate: 5.0 },
  { label: "Balanced (7%)", rate: 7.0 },
  { label: "High Growth (9%)", rate: 9.0 },
];

export const PensionForecasterCard: FC<PensionForecasterCardProps> = ({
  currentPotTotal,
  initialSalary,
  initialEmployeePercent,
  initialEmployerPercent,
  directMonthlyContrib = 0,
  portfolioReturnRate,
  onSyncToProfile,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const defaultRate =
    portfolioReturnRate !== undefined && portfolioReturnRate > 0
      ? Number(portfolioReturnRate.toFixed(1))
      : 5.0;

  // Forecast state
  const [startingPot, setStartingPot] = useState<number>(currentPotTotal);
  const [salary, setSalary] = useState<number>(initialSalary ?? 45000);
  const [employeePercent, setEmployeePercent] = useState<number>(initialEmployeePercent || 5.0);
  const [employerPercent, setEmployerPercent] = useState<number>(initialEmployerPercent || 3.0);
  const [interestRate, setInterestRate] = useState<number>(defaultRate);
  const [horizonYears, setHorizonYears] = useState<number>(25);

  // Advanced UK & realism options
  const [useQualifyingEarnings, setUseQualifyingEarnings] = useState<boolean>(false);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(false);
  const [includeStatePension, setIncludeStatePension] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState(false);

  // Sync starting pot when pots are added/updated/deleted
  useEffect(() => {
    setStartingPot(currentPotTotal);
  }, [currentPotTotal]);

  // Sync salary and percentages if profile updates externally
  useEffect(() => {
    if (initialSalary !== null && initialSalary !== undefined) {
      setSalary(initialSalary);
    }
  }, [initialSalary]);

  useEffect(() => {
    if (initialEmployeePercent !== undefined) {
      setEmployeePercent(initialEmployeePercent);
    }
  }, [initialEmployeePercent]);

  useEffect(() => {
    if (initialEmployerPercent !== undefined) {
      setEmployerPercent(initialEmployerPercent);
    }
  }, [initialEmployerPercent]);

  const effectiveStartingPot = startingPot >= 0 ? startingPot : currentPotTotal;

  // Pensionable salary (Total Gross vs UK Qualifying Earnings £6,240 - £50,270)
  const pensionableSalary = useMemo(() => {
    if (!useQualifyingEarnings) return salary;
    if (salary <= UK_QUALIFYING_LOWER) return 0;
    return Math.min(salary, UK_QUALIFYING_UPPER) - UK_QUALIFYING_LOWER;
  }, [salary, useQualifyingEarnings]);

  // Monthly contribution values
  const monthlyEmployee = (pensionableSalary * (employeePercent / 100)) / 12;
  const monthlyEmployer = (pensionableSalary * (employerPercent / 100)) / 12;
  const totalMonthly = monthlyEmployee + monthlyEmployer + directMonthlyContrib;
  const totalAnnualInflow = totalMonthly * 12;

  // Effective annual return rate (nominal vs real inflation-adjusted)
  const effectiveAnnualRate = adjustForInflation
    ? Math.max(0, interestRate - INFLATION_RATE)
    : interestRate;

  // Compound projection calculation
  const { chartData, finalBalance, totalEmployeeContribs, totalEmployerContribs, totalGrowth } =
    useMemo(() => {
      const monthlyRate = effectiveAnnualRate / 100 / 12;
      const totalMonths = horizonYears * 12;

      let currentBalance = effectiveStartingPot;
      let cumEmployee = 0;
      let cumEmployer = 0;
      let cumDirect = 0;

      const points = [
        {
          year: "Year 0",
          startingPot: Math.round(effectiveStartingPot),
          totalPot: Math.round(currentBalance),
          employeeContrib: 0,
          employerContrib: 0,
          totalContribs: 0,
          growth: 0,
        },
      ];

      for (let m = 1; m <= totalMonths; m++) {
        currentBalance = currentBalance * (1 + monthlyRate) + totalMonthly;
        cumEmployee += monthlyEmployee;
        cumEmployer += monthlyEmployer;
        cumDirect += directMonthlyContrib;

        if (m % 12 === 0) {
          const y = m / 12;
          const totalPaid = cumEmployee + cumEmployer + cumDirect;
          const growth = Math.max(0, currentBalance - effectiveStartingPot - totalPaid);
          points.push({
            year: `Year ${y}`,
            startingPot: Math.round(effectiveStartingPot),
            totalPot: Math.round(currentBalance),
            employeeContrib: Math.round(cumEmployee + cumDirect),
            employerContrib: Math.round(cumEmployer),
            totalContribs: Math.round(totalPaid),
            growth: Math.round(growth),
          });
        }
      }

      const finalPot = Math.round(currentBalance);
      const paidTotal = Math.round(cumEmployee + cumEmployer + cumDirect);
      const earnedGrowth = Math.max(0, finalPot - effectiveStartingPot - paidTotal);

      return {
        chartData: points,
        finalBalance: finalPot,
        totalEmployeeContribs: Math.round(cumEmployee + cumDirect),
        totalEmployerContribs: Math.round(cumEmployer),
        totalGrowth: earnedGrowth,
      };
    }, [
      effectiveStartingPot,
      totalMonthly,
      monthlyEmployee,
      monthlyEmployer,
      directMonthlyContrib,
      effectiveAnnualRate,
      horizonYears,
    ]);

  // 25% Tax-Free Lump Sum (capped at UK £268,275 LSA) & 4% Safe Withdrawal Rate
  const taxFreeLumpSum = Math.min(Math.round(finalBalance * 0.25), UK_LUMP_SUM_ALLOWANCE);
  const drawdownPotAfterLumpSum = Math.max(0, finalBalance - taxFreeLumpSum);
  const baseAnnualDrawdown = Math.round(finalBalance * 0.04);
  const annualRetirementIncome =
    baseAnnualDrawdown + (includeStatePension ? UK_STATE_PENSION_ANNUAL : 0);
  const monthlyRetirementIncome = Math.round(annualRetirementIncome / 12);

  // PLSA Standard status
  const plsaStandard = useMemo(() => {
    if (monthlyRetirementIncome >= PLSA_COMFORTABLE) {
      return { label: "Comfortable Standard", color: "#10b981" };
    }
    if (monthlyRetirementIncome >= PLSA_MODERATE) {
      return { label: "Moderate Standard", color: "#3b82f6" };
    }
    if (monthlyRetirementIncome >= PLSA_MINIMUM) {
      return { label: "Minimum Standard", color: "#f59e0b" };
    }
    return { label: "Below PLSA Minimum", color: "#ef4444" };
  }, [monthlyRetirementIncome]);

  const plsaProgressPct = Math.min(100, (monthlyRetirementIncome / PLSA_COMFORTABLE) * 100);

  // Detect if controls differ from profile
  const isModified =
    employeePercent !== (initialEmployeePercent || 5.0) ||
    employerPercent !== (initialEmployerPercent || 3.0) ||
    salary !== (initialSalary ?? 45000);

  // £100k–£125,140 UK Personal Allowance Taper check
  const adjustedNetIncome = salary - monthlyEmployee * 12;
  const inTaxTrap = salary > 100000 && salary <= 125140 && adjustedNetIncome > 100000;
  const pctToReclaimAllowance = inTaxTrap
    ? Math.min(40, Math.ceil(((salary - 100000) / (pensionableSalary || 1)) * 200) / 2)
    : 0;

  const handleReset = () => {
    setSalary(initialSalary ?? 45000);
    setEmployeePercent(initialEmployeePercent || 5.0);
    setEmployerPercent(initialEmployerPercent || 3.0);
    setStartingPot(currentPotTotal);
  };

  const handleSync = () => {
    if (onSyncToProfile) {
      onSyncToProfile(employeePercent, employerPercent, salary);
      setIsSynced(true);
      setTimeout(() => setIsSynced(false), 3000);
    }
  };

  return (
    <FLPCard className={cardStyle}>
      {/* Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <FLPHeading as="h3" size="md">
              Pension Growth & Retirement Forecaster
            </FLPHeading>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "#8b5cf6",
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                padding: "2px 8px",
                borderRadius: "full",
              })}
            >
              {adjustForInflation ? "Real Terms (Today's £)" : "Compound Growth"}
            </span>
          </div>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "2px" }}>
            Model your retirement pot by adjusting contribution percentages, investment return, and
            years to retirement.
          </FLPText>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isModified && (
            <FLPButton size="sm" variant="outline" onClick={handleReset}>
              <FaUndo style={{ marginRight: "6px" }} /> Reset
            </FLPButton>
          )}
          {onSyncToProfile && (
            <FLPButton
              size="sm"
              variant={isModified && !isSynced ? "primary" : "outline"}
              onClick={handleSync}
            >
              {isSynced ? (
                <>
                  <FaCheckCircle style={{ color: "#10b981", marginRight: "6px" }} /> Synced to
                  Profile!
                </>
              ) : (
                <>
                  <FaSync style={{ marginRight: "6px" }} /> Sync Rates to Profile
                </>
              )}
            </FLPButton>
          )}
        </div>
      </div>

      {/* Realism & UK Rules Toggles */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          aria-pressed={useQualifyingEarnings}
          className={togglePillStyle(useQualifyingEarnings)}
          type="button"
          onClick={() => setUseQualifyingEarnings((v) => !v)}
        >
          {useQualifyingEarnings ? "✓ " : ""}UK Qualifying Earnings (£6,240–£50,270)
        </button>
        <button
          aria-pressed={adjustForInflation}
          className={togglePillStyle(adjustForInflation)}
          type="button"
          onClick={() => setAdjustForInflation((v) => !v)}
        >
          {adjustForInflation ? "✓ " : ""}Adjust for Inflation ({INFLATION_RATE}% p.a.)
        </button>
        <button
          aria-pressed={includeStatePension}
          className={togglePillStyle(includeStatePension)}
          type="button"
          onClick={() => setIncludeStatePension((v) => !v)}
        >
          {includeStatePension ? "✓ " : ""}Include UK State Pension (+£958/mo)
        </button>
      </div>

      {/* Interactive Controls */}
      <div className={controlsGridStyle}>
        {/* Salary */}
        <div className={formGroupStyle}>
          <label className={labelStyle} htmlFor="pension-forecast-salary">
            <span>Annual Salary</span>
            <span style={{ color: "var(--colors-text-primary)", fontWeight: "bold" }}>
              {formatCurrency(salary)}
            </span>
          </label>
          <input
            className={inputStyle}
            id="pension-forecast-salary"
            min="0"
            step="1000"
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value) || 0)}
          />
          <FLPText color="text.muted" fontSize="xs">
            {useQualifyingEarnings
              ? `Qualifying band: ${formatCurrency(pensionableSalary)}/yr`
              : "Calculated on total gross salary"}
          </FLPText>
        </div>

        {/* Employee Contribution % */}
        <div className={formGroupStyle}>
          <label className={labelStyle} htmlFor="pension-forecast-employee-pct">
            <span>Employee Contrib</span>
            <span style={{ color: "#6363f1", fontWeight: "bold" }}>
              {employeePercent}% ({formatCurrency(monthlyEmployee)}/mo)
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              id="pension-forecast-employee-pct"
              max="40"
              min="0"
              step="0.5"
              style={{ flex: 1, accentColor: "#6363f1" }}
              type="range"
              value={employeePercent}
              onChange={(e) => setEmployeePercent(Number(e.target.value))}
            />
            <input
              aria-label="Employee Contrib (%)"
              className={inputStyle}
              max="40"
              min="0"
              step="0.5"
              style={{ width: "65px", padding: "4px 8px" }}
              type="number"
              value={employeePercent}
              onChange={(e) => setEmployeePercent(Number(e.target.value) || 0)}
            />
          </div>
          <FLPText color="text.muted" fontSize="xs">
            UK standard minimum is 5%
          </FLPText>
        </div>

        {/* Employer Contribution % */}
        <div className={formGroupStyle}>
          <label className={labelStyle} htmlFor="pension-forecast-employer-pct">
            <span>Employer Contrib</span>
            <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
              {employerPercent}% ({formatCurrency(monthlyEmployer)}/mo)
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              id="pension-forecast-employer-pct"
              max="30"
              min="0"
              step="0.5"
              style={{ flex: 1, accentColor: "#f59e0b" }}
              type="range"
              value={employerPercent}
              onChange={(e) => setEmployerPercent(Number(e.target.value))}
            />
            <input
              aria-label="Employer Contrib (%)"
              className={inputStyle}
              max="30"
              min="0"
              step="0.5"
              style={{ width: "65px", padding: "4px 8px" }}
              type="number"
              value={employerPercent}
              onChange={(e) => setEmployerPercent(Number(e.target.value) || 0)}
            />
          </div>
          <FLPText color="text.muted" fontSize="xs">
            UK standard minimum is 3%
          </FLPText>
        </div>

        {/* Investment Horizon */}
        <div className={formGroupStyle}>
          <label className={labelStyle} htmlFor="pension-forecast-horizon">
            <span>Horizon to Retirement</span>
            <span style={{ color: "#8b5cf6", fontWeight: "bold" }}>{horizonYears} Years</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              id="pension-forecast-horizon"
              max="45"
              min="5"
              step="1"
              style={{ flex: 1, accentColor: "#8b5cf6" }}
              type="range"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value))}
            />
            <input
              aria-label="Horizon to Retirement (Years)"
              className={inputStyle}
              max="45"
              min="5"
              style={{ width: "65px", padding: "4px 8px" }}
              type="number"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number(e.target.value) || 10)}
            />
          </div>
          <FLPText color="text.muted" fontSize="xs">
            Years until planned retirement age
          </FLPText>
        </div>
      </div>

      {/* Smart UK Tax Insights & Warnings */}
      {inTaxTrap && pctToReclaimAllowance > employeePercent && (
        <div
          className={css({
            padding: "14px 16px",
            borderRadius: "lg",
            backgroundColor: "rgba(99, 99, 241, 0.08)",
            border: "1px solid",
            borderColor: "primary",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
            <FaLightbulb style={{ color: "#6363f1", fontSize: "18px", flexShrink: 0 }} />
            <FLPText fontSize="xs">
              <strong>UK £100k Tax Trap Detected:</strong> Your adjusted income is{" "}
              {formatCurrency(adjustedNetIncome)}/yr, where your Personal Allowance tapers away (60%
              effective marginal tax). Increasing your employee pension contribution to{" "}
              <strong>{pctToReclaimAllowance}%</strong> restores your full tax-free allowance.
            </FLPText>
          </div>
          <FLPButton
            size="sm"
            variant="outline"
            onClick={() => setEmployeePercent(pctToReclaimAllowance)}
          >
            Apply {pctToReclaimAllowance}%
          </FLPButton>
        </div>
      )}

      {totalAnnualInflow > UK_ANNUAL_ALLOWANCE && (
        <div
          className={css({
            padding: "12px 16px",
            borderRadius: "lg",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid #f59e0b",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          })}
        >
          <FaExclamationTriangle style={{ color: "#f59e0b", fontSize: "16px", flexShrink: 0 }} />
          <FLPText fontSize="xs">
            <strong>UK Annual Allowance Notice:</strong> Your projected annual pension inflow (
            {formatCurrency(totalAnnualInflow)}/yr) exceeds the standard{" "}
            {formatCurrency(UK_ANNUAL_ALLOWANCE)} UK Annual Allowance unless you have unused
            carry-forward relief from the previous 3 tax years.
          </FLPText>
        </div>
      )}

      {/* Return Rate Presets & Custom Slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <FLPText fontSize="xs" fontWeight="semibold" textTransform="uppercase" color="text.muted">
            Expected Annual Growth Rate (p.a.)
          </FLPText>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {portfolioReturnRate !== undefined && portfolioReturnRate > 0 && (
              <button
                className={presetBtnStyle(interestRate === Number(portfolioReturnRate.toFixed(1)))}
                type="button"
                onClick={() => setInterestRate(Number(portfolioReturnRate.toFixed(1)))}
              >
                Portfolio Avg ({portfolioReturnRate.toFixed(1)}%)
              </button>
            )}
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={presetBtnStyle(interestRate === preset.rate)}
                type="button"
                onClick={() => setInterestRate(preset.rate)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            aria-label="Expected Annual Growth Rate"
            id="pension-custom-rate-slider"
            max="15"
            min="1"
            step="0.1"
            style={{ flex: 1, accentColor: "#8b5cf6" }}
            type="range"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
          />
          <span
            style={{ fontSize: "14px", fontWeight: "bold", width: "110px", textAlign: "right" }}
          >
            {interestRate.toFixed(1)}%{" "}
            {adjustForInflation && (
              <span
                style={{ fontSize: "11px", color: "var(--colors-text-muted)", fontWeight: 400 }}
              >
                ({effectiveAnnualRate.toFixed(1)}% real)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Output Stats Highlights */}
      <div className={statsGridStyle}>
        <div>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
            PROJECTED POT ({horizonYears} YRS)
          </FLPText>
          <FLPHeading as="h4" size="md" style={{ color: "#8b5cf6", marginTop: "4px" }}>
            {formatCurrency(finalBalance)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            25% tax-free lump sum: <strong>{formatCurrency(taxFreeLumpSum)}</strong>
          </FLPText>
        </div>

        <div>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
            EST. RETIREMENT INCOME (4%)
          </FLPText>
          <FLPHeading as="h4" size="md" style={{ color: "#10b981", marginTop: "4px" }}>
            {formatCurrency(monthlyRetirementIncome)}
            <span
              style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: "normal" }}
            >
              /mo
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {formatCurrency(annualRetirementIncome)}/yr{" "}
            {includeStatePension ? "(incl. State Pension)" : "safe withdrawal"}
          </FLPText>
        </div>

        <div>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
            YOUR CONTRIBUTIONS
          </FLPText>
          <FLPHeading as="h4" size="md" style={{ color: "#6363f1", marginTop: "4px" }}>
            {formatCurrency(totalEmployeeContribs)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            Over {horizonYears} years ({formatCurrency(monthlyEmployee + directMonthlyContrib)}/mo)
          </FLPText>
        </div>

        <div>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
            EMPLOYER & COMPOUND GROWTH
          </FLPText>
          <FLPHeading as="h4" size="md" style={{ color: "#f59e0b", marginTop: "4px" }}>
            {formatCurrency(totalEmployerContribs + totalGrowth)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {formatCurrency(totalGrowth)} investment returns
          </FLPText>
        </div>
      </div>

      {/* PLSA Retirement Living Standards Benchmark Bar */}
      <div
        className={css({
          padding: "16px",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "border",
          backgroundColor: "surface",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        })}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FLPText
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              color="text.muted"
            >
              UK Retirement Living Standard Benchmark (PLSA)
            </FLPText>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: `${plsaStandard.color}20`,
                color: plsaStandard.color,
              }}
            >
              {plsaStandard.label}
            </span>
          </div>
          <FLPText color="text.muted" fontSize="xs">
            Remaining 75% drawdown pot after tax-free cash:{" "}
            {formatCurrency(drawdownPotAfterLumpSum)}
          </FLPText>
        </div>

        <div
          style={{
            height: "10px",
            width: "100%",
            borderRadius: "999px",
            backgroundColor: "var(--colors-border)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${plsaProgressPct}%`,
              backgroundColor: plsaStandard.color,
              borderRadius: "999px",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--colors-text-muted)",
          }}
        >
          <span>Minimum: {formatCurrency(PLSA_MINIMUM)}/mo</span>
          <span>Moderate: {formatCurrency(PLSA_MODERATE)}/mo</span>
          <span>Comfortable: {formatCurrency(PLSA_COMFORTABLE)}/mo</span>
        </div>
      </div>

      {/* Visual Stacked Area Chart */}
      <div style={{ height: "340px", width: "100%", marginTop: "4px" }}>
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorStartingPot" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorContribs" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#6363f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6363f1" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorGrowth" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis dataKey="year" fontSize={12} stroke="var(--colors-text-muted)" />
            <YAxis
              fontSize={12}
              stroke="var(--colors-text-muted)"
              tickFormatter={(val) =>
                `£${val >= 1000000 ? `${(val / 1000000).toFixed(1)}m` : `${Math.round(val / 1000)}k`}`
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload?.length) {
                  const point = payload[0]?.payload;
                  return (
                    <div
                      style={{
                        backgroundColor: "var(--colors-surface)",
                        color: "var(--colors-text-primary)",
                        border: "1px solid var(--colors-border)",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                      }}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{label}</div>
                      <div style={{ color: "#8b5cf6", fontWeight: 700, marginBottom: "4px" }}>
                        Total Projected Pot: {formatCurrency(point?.totalPot ?? 0)}
                      </div>
                      <div style={{ color: "#10b981", marginTop: "2px" }}>
                        Compound Growth: +{formatCurrency(point?.growth ?? 0)}
                      </div>
                      <div style={{ color: "#6363f1", marginTop: "2px" }}>
                        Cumulative Contributions: +{formatCurrency(point?.totalContribs ?? 0)}
                      </div>
                      <div style={{ color: "var(--colors-text-muted)", marginTop: "2px" }}>
                        Starting Pot: {formatCurrency(point?.startingPot ?? 0)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend height={36} verticalAlign="top" />
            <Area
              dataKey="startingPot"
              fill="url(#colorStartingPot)"
              name="Starting Pot"
              stackId="1"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              type="monotone"
            />
            <Area
              dataKey="totalContribs"
              fill="url(#colorContribs)"
              name="Cumulative Contributions"
              stackId="1"
              stroke="#6363f1"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="growth"
              fill="url(#colorGrowth)"
              name="Compound Investment Growth"
              stackId="1"
              stroke="#10b981"
              strokeWidth={2.5}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </FLPCard>
  );
};

export default PensionForecasterCard;

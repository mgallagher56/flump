import {
  calculateEmployerNISavings,
  getUkTaxYearRules,
  resolveUkTaxYear,
} from "@flump/finance-engine";
import { ChartFigure } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaChevronDown,
  FaExclamationTriangle,
  FaLightbulb,
  FaSlidersH,
  FaSync,
  FaUndo,
} from "react-icons/fa";
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
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";

export interface PensionForecasterCardProps {
  currentPotTotal: number;
  initialSalary: number | null;
  initialEmployeePercent: number;
  initialEmployerPercent: number;
  initialSalarySacrifice?: boolean;
  initialEmployerNiPassThrough?: boolean;
  directMonthlyContrib?: number;
  portfolioReturnRate?: number;
  /** Pre-fills the employee percentage what-if. Each new `id` re-applies it; nothing is saved. */
  whatIfRequest?: { employeePercent: number; id: number } | null;
  onSyncToProfile?: (
    employeePct: number,
    employerPct: number,
    salary?: number,
    salarySacrifice?: boolean,
    employerNi?: boolean,
  ) => void;
}

const UK_QUALIFYING_LOWER = 6240;
const UK_QUALIFYING_UPPER = 50270;
const UK_ANNUAL_ALLOWANCE = 60000;
const UK_LUMP_SUM_ALLOWANCE = 268275;
// Full new State Pension for the current tax year (sourced, per-year registry in finance-engine).
const currentStatePensionAnnual = (): number =>
  getUkTaxYearRules(resolveUkTaxYear()).statePension.fullNewAnnual;
const INFLATION_RATE = 2.5;
// Drawdown rate behind the "estimated retirement income" figure. Shown next to the figure.
const SAFE_WITHDRAWAL_RATE = 0.04;

// PLSA UK Retirement Living Standards (Single Person, monthly)
const PLSA_MINIMUM = 1200; // £14,400/yr
const PLSA_MODERATE = 2608; // £31,300/yr
const PLSA_COMFORTABLE = 3591; // £43,100/yr

const cardStyle = css({
  padding: { base: "16px", md: "24px" },
  borderRadius: "2xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  boxShadow: "var(--shadows-card)",
});

const outcomeGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1.2fr 1.2fr 1fr" },
  gap: "16px",
});

const heroCardStyle = css({
  padding: "16px 18px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  backgroundColor: "surface",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "10px",
});

const controlsDeckStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  backgroundColor: "surface.sunken",
  padding: { base: "16px", md: "20px" },
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
});

const controlsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "1fr" },
  gap: "14px",
});

const inputCardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backgroundColor: "surface",
  padding: "12px 14px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  transition: "border-color 0.15s ease",
  _hover: {
    borderColor: "primary",
  },
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

const textInputStyle = css({
  width: "100%",
  padding: "6px 10px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  transition: "all 0.15s",
  _focus: {
    borderColor: "primary",
  },
});

const presetBtnStyle = (active: boolean) =>
  css({
    padding: "5px 10px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: active ? "semibold" : "medium",
    backgroundColor: active ? "primary.solid" : "surface.subtle",
    color: active ? "primary.foreground" : "text.primary",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      opacity: 0.85,
    },
  });

const assumptionsDetailsStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  overflow: "hidden",
});

const assumptionsSummaryStyle = css({
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  userSelect: "none",
  fontWeight: "semibold",
  fontSize: "xs",
  color: "text.muted",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  backgroundColor: "surface.sunken",
  "&:hover": {
    backgroundColor: "surface.subtle",
  },
  "&::-webkit-details-marker": {
    display: "none",
  },
  listStyle: "none",
});

const togglePillStyle = (active: boolean) =>
  css({
    padding: "6px 12px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: active ? "semibold" : "medium",
    backgroundColor: active ? "var(--colors-primary-subtle)" : "surface",
    color: active ? "var(--colors-primary)" : "text.primary",
    border: "1px solid",
    borderColor: active ? "var(--colors-primary-border)" : "border",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    _hover: {
      borderColor: "var(--colors-primary-border)",
    },
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
  initialSalarySacrifice,
  initialEmployerNiPassThrough,
  directMonthlyContrib = 0,
  portfolioReturnRate,
  whatIfRequest,
  onSyncToProfile,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const reducedMotion = usePrefersReducedMotion();

  const defaultRate =
    portfolioReturnRate !== undefined && portfolioReturnRate > 0
      ? Number(portfolioReturnRate.toFixed(1))
      : 5.0;

  // Forecast state
  const [startingPot, setStartingPot] = useState<number>(currentPotTotal);
  const [salary, setSalary] = useState<number>(initialSalary ?? 0);
  const [employeePercent, setEmployeePercent] = useState<number>(initialEmployeePercent ?? 5.0);
  const [employerPercent, setEmployerPercent] = useState<number>(initialEmployerPercent ?? 3.0);
  const [interestRate, setInterestRate] = useState<number>(defaultRate);
  const [horizonYears, setHorizonYears] = useState<number>(25);

  // Advanced UK & realism options
  const [useQualifyingEarnings, setUseQualifyingEarnings] = useState<boolean>(false);
  const [adjustForInflation, setAdjustForInflation] = useState<boolean>(false);
  const [includeStatePension, setIncludeStatePension] = useState<boolean>(false);
  const [isSalarySacrifice, setIsSalarySacrifice] = useState<boolean>(
    initialSalarySacrifice ?? true,
  );
  const [passEmployerNi, setPassEmployerNi] = useState<boolean>(
    initialEmployerNiPassThrough ?? false,
  );
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
    if (whatIfRequest) setEmployeePercent(whatIfRequest.employeePercent);
  }, [whatIfRequest]);

  useEffect(() => {
    if (initialEmployerPercent !== undefined) {
      setEmployerPercent(initialEmployerPercent);
    }
  }, [initialEmployerPercent]);

  useEffect(() => {
    if (initialSalarySacrifice !== undefined) {
      setIsSalarySacrifice(initialSalarySacrifice);
    }
  }, [initialSalarySacrifice]);

  useEffect(() => {
    if (initialEmployerNiPassThrough !== undefined) {
      setPassEmployerNi(initialEmployerNiPassThrough);
    }
  }, [initialEmployerNiPassThrough]);

  const effectiveStartingPot = startingPot >= 0 ? startingPot : currentPotTotal;

  // Pensionable salary (Total Gross vs UK Qualifying Earnings £6,240 - £50,270)
  const pensionableSalary = useMemo(() => {
    if (!useQualifyingEarnings) return salary;
    if (salary <= UK_QUALIFYING_LOWER) return 0;
    return Math.min(salary, UK_QUALIFYING_UPPER) - UK_QUALIFYING_LOWER;
  }, [salary, useQualifyingEarnings]);

  // Monthly contribution values
  const monthlyEmployee = (pensionableSalary * (employeePercent / 100)) / 12;
  const annualEmployerNiSavings =
    isSalarySacrifice && passEmployerNi
      ? calculateEmployerNISavings(salary, pensionableSalary * (employeePercent / 100))
      : 0;
  const monthlyEmployerNi = annualEmployerNiSavings / 12;
  const monthlyEmployer = (pensionableSalary * (employerPercent / 100)) / 12 + monthlyEmployerNi;
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
          totalPot: Math.round(effectiveStartingPot),
          totalContribs: Math.round(effectiveStartingPot),
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
          const totalPrincipal = effectiveStartingPot + totalPaid;
          const growth = Math.max(0, currentBalance - totalPrincipal);
          points.push({
            year: `Year ${y}`,
            totalPot: Math.round(currentBalance),
            totalContribs: Math.round(totalPrincipal),
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

  const statePensionAnnual = currentStatePensionAnnual();

  // 25% Tax-Free Lump Sum (capped at UK £268,275 LSA) & 4% Safe Withdrawal Rate
  const taxFreeLumpSum = Math.min(Math.round(finalBalance * 0.25), UK_LUMP_SUM_ALLOWANCE);
  const drawdownPotAfterLumpSum = Math.max(0, finalBalance - taxFreeLumpSum);
  const baseAnnualDrawdown = Math.round(finalBalance * SAFE_WITHDRAWAL_RATE);
  const annualRetirementIncome =
    baseAnnualDrawdown + (includeStatePension ? statePensionAnnual : 0);
  const monthlyRetirementIncome = Math.round(annualRetirementIncome / 12);

  // PLSA Standard status
  const plsaStandard = useMemo(() => {
    if (monthlyRetirementIncome >= PLSA_COMFORTABLE) {
      return { label: "Comfortable Standard", color: "var(--colors-status-positive-text)" };
    }
    if (monthlyRetirementIncome >= PLSA_MODERATE) {
      return { label: "Moderate Standard", color: "var(--colors-status-info-text)" };
    }
    if (monthlyRetirementIncome >= PLSA_MINIMUM) {
      return { label: "Minimum Standard", color: "var(--colors-status-warning-text)" };
    }
    return { label: "Below PLSA Minimum", color: "var(--colors-status-danger-text)" };
  }, [monthlyRetirementIncome]);

  const plsaProgressPct = Math.min(100, (monthlyRetirementIncome / PLSA_COMFORTABLE) * 100);

  // Detect if controls differ from profile
  const isModified =
    employeePercent !== (initialEmployeePercent ?? 5.0) ||
    employerPercent !== (initialEmployerPercent ?? 3.0) ||
    salary !== (initialSalary ?? 0) ||
    isSalarySacrifice !== (initialSalarySacrifice ?? true) ||
    passEmployerNi !== (initialEmployerNiPassThrough ?? false);

  // £100k–£125,140 UK Personal Allowance Taper check
  const adjustedNetIncome = salary - monthlyEmployee * 12;
  const inTaxTrap = salary > 100000 && salary <= 125140 && adjustedNetIncome > 100000;
  const pctToReclaimAllowance = inTaxTrap
    ? Math.min(40, Math.ceil(((salary - 100000) / (pensionableSalary || 1)) * 200) / 2)
    : 0;

  const handleReset = () => {
    setSalary(initialSalary ?? 0);
    setEmployeePercent(initialEmployeePercent ?? 5.0);
    setEmployerPercent(initialEmployerPercent ?? 3.0);
    setIsSalarySacrifice(initialSalarySacrifice ?? true);
    setPassEmployerNi(initialEmployerNiPassThrough ?? false);
    setStartingPot(currentPotTotal);
  };

  const handleSync = () => {
    if (onSyncToProfile) {
      onSyncToProfile(employeePercent, employerPercent, salary, isSalarySacrifice, passEmployerNi);
      setIsSynced(true);
      setTimeout(() => setIsSynced(false), 3000);
    }
  };

  const activeRulesCount = [
    useQualifyingEarnings,
    adjustForInflation,
    includeStatePension,
    isSalarySacrifice,
    passEmployerNi,
  ].filter(Boolean).length;

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
                color: "var(--colors-primary)",
                backgroundColor: "var(--colors-primary-subtle)",
                padding: "2px 8px",
                borderRadius: "full",
              })}
            >
              {adjustForInflation ? "Real Terms (Today's £)" : "Compound Growth"}
            </span>
          </div>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "2px" }}>
            Adjust your contribution levers below to see your projected retirement pot and monthly
            drawdown.
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
                  <FaCheckCircle
                    style={{ color: "var(--colors-status-positive-text)", marginRight: "6px" }}
                  />{" "}
                  Synced to Profile!
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

      {/* 2-Column Interactive Simulator Pattern */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", lg: "repeat(12, 1fr)" },
          gap: "24px",
          alignItems: "start",
        })}
      >
        {/* Left Column: Forecaster Parameters (4 cols) */}
        <div
          className={css({
            gridColumn: { base: "span 1", lg: "span 4" },
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          })}
        >
          {/* Core Levers (Inputs Deck) */}
          <div className={controlsDeckStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaSlidersH
                style={{ color: "var(--colors-chart-accent-purple)", fontSize: "14px" }}
              />
              <FLPText fontSize="xs" fontWeight="bold" textTransform="uppercase" color="text.muted">
                Forecaster Parameters
              </FLPText>
            </div>

            <div className={controlsGridStyle}>
              {/* 1. Salary */}
              <div className={inputCardStyle}>
                <label className={labelStyle} htmlFor="pension-forecast-salary">
                  <span>Annual Salary</span>
                  <span style={{ color: "var(--colors-text-primary)", fontWeight: "bold" }}>
                    {formatCurrency(salary)}
                  </span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      color: "var(--colors-text-muted)",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    £
                  </span>
                  <input
                    className={textInputStyle}
                    id="pension-forecast-salary"
                    min="0"
                    step="1000"
                    style={{ paddingLeft: "24px" }}
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value) || 0)}
                  />
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  {useQualifyingEarnings
                    ? `Qualifying band: ${formatCurrency(pensionableSalary)}/yr`
                    : "Total gross salary"}
                </FLPText>
              </div>

              {/* 2. Employee Contribution % */}
              <div className={inputCardStyle}>
                <label className={labelStyle} htmlFor="pension-forecast-employee-pct">
                  <span>Employee Contrib</span>
                  <span style={{ color: "var(--colors-chart-primary)", fontWeight: "bold" }}>
                    {employeePercent}% ({formatCurrency(monthlyEmployee)}/mo)
                  </span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    aria-label="Employee Contrib (%)"
                    className={textInputStyle}
                    id="pension-forecast-employee-pct"
                    max="100"
                    min="0"
                    step="0.5"
                    style={{ paddingRight: "26px" }}
                    type="number"
                    value={employeePercent}
                    onChange={(e) => setEmployeePercent(Number(e.target.value) || 0)}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "10px",
                      color: "var(--colors-text-muted)",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    %
                  </span>
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  Standard UK min: 5%
                </FLPText>
              </div>

              {/* 3. Employer Contribution % */}
              <div className={inputCardStyle}>
                <label className={labelStyle} htmlFor="pension-forecast-employer-pct">
                  <span>Employer Contrib</span>
                  <span style={{ color: "var(--colors-status-warning-text)", fontWeight: "bold" }}>
                    {employerPercent}% ({formatCurrency(monthlyEmployer)}/mo)
                  </span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    aria-label="Employer Contrib (%)"
                    className={textInputStyle}
                    id="pension-forecast-employer-pct"
                    max="100"
                    min="0"
                    step="0.5"
                    style={{ paddingRight: "26px" }}
                    type="number"
                    value={employerPercent}
                    onChange={(e) => setEmployerPercent(Number(e.target.value) || 0)}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "10px",
                      color: "var(--colors-text-muted)",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    %
                  </span>
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  Standard UK min: 3%
                </FLPText>
                {employeePercent === 5 && employerPercent === 3 ? (
                  <FLPText color="text.muted" fontSize="xs" id="pension-default-rates-note">
                    Default: auto-enrolment minimum. Change to match your payslip.
                  </FLPText>
                ) : null}
              </div>

              {/* 4. Investment Horizon */}
              <div className={inputCardStyle}>
                <label className={labelStyle} htmlFor="pension-forecast-horizon">
                  <span>Horizon to Retirement</span>
                  <span style={{ color: "var(--colors-text-primary)", fontWeight: "bold" }}>
                    {horizonYears} {horizonYears === 1 ? "Year" : "Years"}
                  </span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    aria-label="Horizon to Retirement (Years)"
                    className={textInputStyle}
                    id="pension-forecast-horizon"
                    max="60"
                    min="1"
                    step="1"
                    style={{ paddingRight: "48px" }}
                    type="number"
                    value={horizonYears}
                    onChange={(e) => setHorizonYears(Number(e.target.value) || 1)}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "10px",
                      color: "var(--colors-text-muted)",
                      fontSize: "12px",
                      fontWeight: "medium",
                    }}
                  >
                    years
                  </span>
                </div>
                <FLPText color="text.muted" fontSize="xs">
                  Years until retirement age
                </FLPText>
              </div>
            </div>

            {/* Expected Annual Growth Rate */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}
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
                <FLPText
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  color="text.muted"
                >
                  Expected Annual Growth Rate (p.a.)
                </FLPText>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {portfolioReturnRate !== undefined && portfolioReturnRate > 0 && (
                    <button
                      className={presetBtnStyle(
                        interestRate === Number(portfolioReturnRate.toFixed(1)),
                      )}
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    width: "120px",
                  }}
                >
                  <input
                    aria-label="Expected Annual Growth Rate"
                    className={textInputStyle}
                    id="pension-custom-rate-slider"
                    max="30"
                    min="0"
                    step="0.1"
                    style={{ paddingRight: "30px", fontWeight: "bold" }}
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: "10px",
                      color: "var(--colors-text-muted)",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    %
                  </span>
                </div>
                {adjustForInflation && (
                  <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                    ({effectiveAnnualRate.toFixed(1)}% real return after {INFLATION_RATE}%
                    inflation)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Smart UK Tax Insights */}
          {inTaxTrap && pctToReclaimAllowance > employeePercent && (
            <div
              className={css({
                padding: "12px 16px",
                borderRadius: "lg",
                backgroundColor: "var(--colors-primary-subtle)",
                border: "1px solid",
                borderColor: "primary",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <FaLightbulb
                  style={{ color: "var(--colors-chart-primary)", fontSize: "16px", flexShrink: 0 }}
                />
                <FLPText fontSize="xs">
                  <strong>UK £100k Tax Trap Detected:</strong> Your adjusted income is{" "}
                  {formatCurrency(adjustedNetIncome)}/yr (60% effective marginal tax). Increasing
                  your employee pension contribution to <strong>{pctToReclaimAllowance}%</strong>{" "}
                  restores your full tax-free allowance.
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
                backgroundColor: "var(--colors-status-warning-bg)",
                border: "1px solid var(--colors-chart-debt)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              })}
            >
              <FaExclamationTriangle
                style={{
                  color: "var(--colors-status-warning-text)",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              />
              <FLPText fontSize="xs">
                <strong>UK Annual Allowance Notice:</strong> Projected inflow (
                {formatCurrency(totalAnnualInflow)}/yr) exceeds the standard{" "}
                {formatCurrency(UK_ANNUAL_ALLOWANCE)} Annual Allowance unless using carry-forward
                relief.
              </FLPText>
            </div>
          )}

          {/* Collapsible UK Tax Rules & Assumptions */}
          <details className={assumptionsDetailsStyle}>
            <summary className={assumptionsSummaryStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>UK Tax Rules & Assumptions</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-primary-subtle)",
                    padding: "1px 7px",
                    borderRadius: "999px",
                    textTransform: "none",
                  }}
                >
                  {activeRulesCount} active
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", textTransform: "none", opacity: 0.8 }}>
                  Toggle rules
                </span>
                <FaChevronDown size={11} />
              </div>
            </summary>

            <div style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
              <button
                aria-pressed={isSalarySacrifice}
                className={togglePillStyle(isSalarySacrifice)}
                type="button"
                onClick={() => {
                  setIsSalarySacrifice((v) => {
                    const next = !v;
                    if (!next) setPassEmployerNi(false);
                    return next;
                  });
                }}
              >
                {isSalarySacrifice ? "✓ " : ""}Salary Sacrifice (saves NI)
              </button>
              <button
                aria-pressed={isSalarySacrifice && passEmployerNi}
                className={togglePillStyle(isSalarySacrifice && passEmployerNi)}
                disabled={!isSalarySacrifice}
                style={{
                  opacity: isSalarySacrifice ? 1 : 0.5,
                  cursor: isSalarySacrifice ? "pointer" : "not-allowed",
                }}
                type="button"
                onClick={() => setPassEmployerNi((v) => !v)}
              >
                {isSalarySacrifice && passEmployerNi ? "✓ " : ""}Pass on Employer NI (15%)
              </button>
            </div>
          </details>
        </div>

        {/* Right Column: 3 Outcome Cards & Visual Chart (8 cols) */}
        <div
          className={css({
            gridColumn: { base: "span 1", lg: "span 8" },
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          })}
        >
          {/* Outcome Cards (Top Results) */}
          <div className={outcomeGridStyle}>
            {/* Card 1: Projected Pot */}
            <div className={heroCardStyle}>
              <div>
                <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                  PROJECTED POT ({horizonYears} YRS)
                </FLPText>
                <FLPHeading as="p" className="tabular-nums" size="lg" style={{ marginTop: "4px" }}>
                  {formatCurrency(finalBalance)}
                </FLPHeading>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div>
                  25% tax-free lump sum:{" "}
                  <strong style={{ color: "var(--colors-text-primary)" }}>
                    {formatCurrency(taxFreeLumpSum)}
                  </strong>
                </div>
                <div>
                  Remaining drawdown pot: <strong>{formatCurrency(drawdownPotAfterLumpSum)}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Estimated Retirement Income & PLSA Benchmark */}
            <div className={heroCardStyle}>
              <div>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                    EST. RETIREMENT INCOME (4% DRAWDOWN)
                  </FLPText>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: "var(--colors-primary-subtle)",
                      color: "var(--colors-text-muted)",
                      border: "1px solid var(--colors-border-subtle)",
                    }}
                  >
                    {plsaStandard.label}
                  </span>
                </div>
                <FLPHeading as="p" className="tabular-nums" size="lg" style={{ marginTop: "4px" }}>
                  {formatCurrency(monthlyRetirementIncome)}
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--colors-text-muted)",
                      fontWeight: "normal",
                    }}
                  >
                    /mo
                  </span>
                </FLPHeading>
              </div>

              {/* Integrated PLSA Benchmark Track */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  <span>UK Retirement Living Standard Benchmark (PLSA)</span>
                  <span>{formatCurrency(annualRetirementIncome)}/yr</span>
                </div>
                <div
                  style={{
                    height: "8px",
                    width: "100%",
                    borderRadius: "999px",
                    backgroundColor: "var(--colors-border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${plsaProgressPct}%`,
                      backgroundColor: "var(--colors-primary)",
                      borderRadius: "999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  <span>Min: {formatCurrency(PLSA_MINIMUM)}/mo</span>
                  <span>Mod: {formatCurrency(PLSA_MODERATE)}/mo</span>
                  <span>Comf: {formatCurrency(PLSA_COMFORTABLE)}/mo</span>
                </div>
              </div>
            </div>

            {/* Card 3: Contributions & Compound Growth Breakdown */}
            <div className={heroCardStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                    YOUR CONTRIBUTIONS
                  </FLPText>
                  <FLPHeading
                    as="p"
                    className="tabular-nums"
                    size="sm"
                    style={{ marginTop: "2px" }}
                  >
                    {formatCurrency(totalEmployeeContribs)}
                  </FLPHeading>
                  <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                    {formatCurrency(monthlyEmployee + directMonthlyContrib)}/mo
                  </span>
                </div>

                <div>
                  <FLPText color="text.muted" fontSize="xs" fontWeight="semibold">
                    EMPLOYER & COMPOUND GROWTH
                  </FLPText>
                  <FLPHeading
                    as="p"
                    className="tabular-nums"
                    size="sm"
                    style={{ marginTop: "2px" }}
                  >
                    {formatCurrency(totalEmployerContribs + totalGrowth)}
                  </FLPHeading>
                  <span
                    style={{ fontSize: "11px", color: "var(--colors-text-muted)", fontWeight: 600 }}
                  >
                    +{formatCurrency(totalGrowth)} investment returns
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p
            data-testid="pension-estimate-note"
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--colors-text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Projection based on the figures you entered. It assumes a {SAFE_WITHDRAWAL_RATE * 100}%
            annual drawdown rate and uses fixed allowances that are not updated each tax year: a{" "}
            {formatCurrency(UK_LUMP_SUM_ALLOWANCE)} lump sum allowance, a{" "}
            {formatCurrency(UK_ANNUAL_ALLOWANCE)} annual allowance and a{" "}
            {formatCurrency(statePensionAnnual)}/yr state pension when included.
          </p>

          {/* Visual Stacked Area Chart */}
          <ChartFigure
            dataTable={
              <table>
                <caption>Projected pension pot by year</caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Total pot</th>
                    <th scope="col">Contributions</th>
                    <th scope="col">Investment growth</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.year}>
                      <th scope="row">{row.year}</th>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row.totalPot)}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row.totalContribs)}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(row.growth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            summary={`Projected pension pot after ${horizonYears} years: ${formatCurrency(finalBalance)}, with ${formatCurrency(totalEmployeeContribs + totalEmployerContribs)} contributed over the period and ${formatCurrency(totalGrowth)} of investment growth.`}
            hideTitle
            title="Pension pot projection"
          >
            <div style={{ height: "360px", width: "100%", marginTop: "4px" }}>
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorContribs" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--colors-chart-primary)" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="var(--colors-chart-primary)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient id="colorGrowth" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--colors-chart-wealth)" stopOpacity={0.45} />
                      <stop
                        offset="95%"
                        stopColor="var(--colors-chart-wealth)"
                        stopOpacity={0.05}
                      />
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
                              boxShadow: "var(--shadows-floating)",
                            }}
                          >
                            <div style={{ fontWeight: "bold", marginBottom: "6px" }}>{label}</div>
                            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                              Total Projected Pot: {formatCurrency(point?.totalPot ?? 0)}
                            </div>
                            <div
                              style={{
                                color: "var(--colors-status-positive-text)",
                                marginTop: "2px",
                              }}
                            >
                              Compound Growth: +{formatCurrency(point?.growth ?? 0)}
                            </div>
                            <div style={{ color: "var(--colors-chart-primary)", marginTop: "2px" }}>
                              Cumulative Contributions: +{formatCurrency(point?.totalContribs ?? 0)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend height={36} verticalAlign="top" />
                  <Area
                    dataKey="totalContribs"
                    fill="url(#colorContribs)"
                    name="Cumulative Contributions (Projected)"
                    stackId="1"
                    stroke="var(--colors-chart-primary)"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={!reducedMotion}
                  />
                  <Area
                    dataKey="growth"
                    fill="url(#colorGrowth)"
                    name="Compound Investment Growth (Projected)"
                    stackId="1"
                    stroke="var(--colors-chart-wealth)"
                    strokeDasharray="5 5"
                    strokeWidth={2.5}
                    type="monotone"
                    isAnimationActive={!reducedMotion}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartFigure>
        </div>
      </div>
    </FLPCard>
  );
};

export default PensionForecasterCard;

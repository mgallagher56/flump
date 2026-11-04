import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLightbulb,
  FaShieldAlt,
  FaTrophy,
} from "react-icons/fa";
import { Link } from "react-router";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { AppPageKey } from "~/utils/pageConfig";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { ScoreMethodologyModal, type ScoringCriterion } from "../ScoreMethodologyModal";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface FinancialHealthWidgetConfig {
  defaultTab?: "overview" | "wins" | "improvements" | "modules" | "scoring";
  showNumericScore?: boolean;
  showBreakdown?: boolean;
  hideTabs?: boolean;
  allowCollapse?: boolean;
  defaultCollapsed?: boolean;
}

export interface FinancialHealthWidgetProps {
  accountsData?: any;
  budgetData?: any;
  savingsData?: any;
  pensionData?: any;
  mortgageData?: any;
  forecastData?: any;
  taxData?: any;
  enabledPages: string[];
  editMode: boolean;
  size: "normal" | "wide";
  config?: FinancialHealthWidgetConfig;
  onUpdateConfig?: (config: FinancialHealthWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export interface HealthItem {
  id: string;
  module: AppPageKey;
  type: "strength" | "improvement";
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  metric?: string;
  actionRoute: string;
}

export interface ModuleHealthStatus {
  key: AppPageKey;
  label: string;
  status: "optimal" | "good" | "action";
  summary: string;
  score: number;
}

export const FinancialHealthWidget: FC<FinancialHealthWidgetProps> = ({
  accountsData,
  budgetData,
  savingsData,
  pensionData,
  mortgageData,
  taxData,
  enabledPages = [],
  editMode,
  size,
  config = {},
  onUpdateConfig,
  onToggleSize,
  onHide,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragProps,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [activeTab, setActiveTab] = useState<
    "overview" | "wins" | "improvements" | "modules" | "scoring"
  >(config.defaultTab || "overview");
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const showScore = config.showNumericScore !== false;
  const showBreakdown =
    config.showBreakdown !== undefined ? config.showBreakdown : !config.hideTabs;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(config.defaultCollapsed ?? true);

  // Evaluation algorithm based strictly on applicable (enabled) sections
  const {
    score,
    rating,
    ratingColor,
    earnedPoints,
    maxPoints,
    strengths,
    improvements,
    moduleStatuses,
    scoringCriteria,
  } = useMemo(() => {
    let earned = 0;
    let max = 0;
    const wins: HealthItem[] = [];
    const opps: HealthItem[] = [];
    const statuses: ModuleHealthStatus[] = [];
    const criteria: ScoringCriterion[] = [];

    // 1. Accounts & Solvency (if enabled)
    if (enabledPages.includes("accounts") && accountsData) {
      max += 25;
      const netWorth = accountsData.netWorth || 0;
      const assets = accountsData.totalAssets || 0;
      const liabilities = accountsData.totalLiabilities || 0;

      if (netWorth > 0) {
        earned += 15;
        wins.push({
          id: "acc_networth_pos",
          module: "accounts",
          type: "strength",
          title: "Positive Net Worth",
          detail: `Liquid assets exceed liabilities by +${formatCurrency(netWorth)}.`,
          impact: "high",
          metric: `+${formatCurrency(netWorth)}`,
          actionRoute: "/app/accounts",
        });
      } else if (netWorth < 0) {
        opps.push({
          id: "acc_networth_neg",
          module: "accounts",
          type: "improvement",
          title: "Reduce Outstanding Debt",
          detail: `Liabilities (${formatCurrency(liabilities)}) exceed assets (${formatCurrency(assets)}). Prioritize high-cost debt clearance.`,
          impact: "high",
          actionRoute: "/app/accounts",
        });
      }

      criteria.push({
        id: "acc_networth",
        module: "accounts",
        moduleLabel: "Accounts",
        title: "Positive Net Worth",
        earnedPoints: netWorth > 0 ? 15 : 0,
        maxPoints: 15,
        isPassed: netWorth > 0,
        whatHelps: "Total assets exceed liabilities, building positive personal equity.",
        whatHurts: "Total liabilities exceed assets, causing negative net worth.",
        howToImprove: "Pay down high-interest liabilities to flip net worth positive.",
        actionRoute: "/app/accounts",
      });

      if (liabilities === 0 && assets > 0) {
        earned += 10;
        wins.push({
          id: "acc_debt_free",
          module: "accounts",
          type: "strength",
          title: "Zero Unsecured Liabilities",
          detail: "No active consumer liabilities or overdraft debts logged.",
          impact: "medium",
          actionRoute: "/app/accounts",
        });
      } else if (assets > 0) {
        earned += 5;
      }

      criteria.push({
        id: "acc_debt",
        module: "accounts",
        moduleLabel: "Accounts",
        title: "Debt Cushion / Zero Unsecured Debt",
        earnedPoints: liabilities === 0 && assets > 0 ? 10 : assets > 0 ? 5 : 0,
        maxPoints: 10,
        isPassed: liabilities === 0 && assets > 0,
        whatHelps: "Zero unsecured consumer debts, overdrafts, or high-cost borrowing.",
        whatHurts: "Carrying outstanding consumer debts or overdraft balances.",
        howToImprove: "Clear overdrafts and keep credit card balances paid in full monthly.",
        actionRoute: "/app/accounts",
      });

      statuses.push({
        key: "accounts",
        label: "Accounts & Net Worth",
        status: netWorth > 0 ? "optimal" : "action",
        summary: `Net Worth: ${formatCurrency(netWorth)}`,
        score: netWorth > 0 ? 90 : 40,
      });
    }

    // 2. Budget & Cashflow (if enabled)
    if (enabledPages.includes("budget") && budgetData) {
      max += 30;
      const surplus = budgetData.monthlySurplus || 0;
      const runway = budgetData.runwayMonths;

      if (surplus > 0) {
        earned += 15;
        wins.push({
          id: "budget_surplus",
          module: "budget",
          type: "strength",
          title: "Cashflow Surplus",
          detail: `Generating +${formatCurrency(surplus)}/mo in disposable surplus after monthly living expenses.`,
          impact: "high",
          metric: `+${formatCurrency(surplus)}/mo`,
          actionRoute: "/app/budget",
        });
      } else {
        opps.push({
          id: "budget_deficit",
          module: "budget",
          type: "improvement",
          title: "Eliminate Monthly Deficit",
          detail:
            "Monthly expenses equal or exceed income. Review discretionary recurring outflows.",
          impact: "high",
          actionRoute: "/app/budget",
        });
      }

      criteria.push({
        id: "budget_surplus",
        module: "budget",
        moduleLabel: "Budget",
        title: "Monthly Cashflow Surplus",
        earnedPoints: surplus > 0 ? 15 : 0,
        maxPoints: 15,
        isPassed: surplus > 0,
        whatHelps: "Disposable surplus (> £0/mo) after paying all monthly expenses.",
        whatHurts: "Deficit spending where monthly living expenses exceed net income.",
        howToImprove: "Review recurring subscription and discretionary costs in Budget Planner.",
        actionRoute: "/app/budget",
      });

      if (runway !== null && runway >= 3) {
        earned += 15;
        wins.push({
          id: "budget_runway_good",
          module: "budget",
          type: "strength",
          title: "Resilient Runway",
          detail: `${runway} months of essential expenses secured in liquid reserves.`,
          impact: "high",
          metric: `${runway} mos`,
          actionRoute: "/app/budget",
        });
      } else {
        opps.push({
          id: "budget_runway_low",
          module: "budget",
          type: "improvement",
          title: "Build Emergency Fund",
          detail:
            runway === null
              ? "Configure your target emergency runway to protect against income disruptions."
              : `Current runway is ${runway} months. Target at least 3–6 months of essential bills.`,
          impact: "high",
          actionRoute: "/app/budget",
        });
      }

      criteria.push({
        id: "budget_runway",
        module: "budget",
        moduleLabel: "Budget",
        title: "Emergency Runway (≥ 3 Months)",
        earnedPoints: runway !== null && runway >= 3 ? 15 : 0,
        maxPoints: 15,
        isPassed: runway !== null && runway >= 3,
        whatHelps: "Liquid emergency cash reserves covering 3 to 6+ months of essential expenses.",
        whatHurts: "Runway under 3 months, leaving you vulnerable to sudden income shocks.",
        howToImprove: "Save at least 3 months of essential fixed costs in easy-access cash.",
        actionRoute: "/app/budget",
      });

      statuses.push({
        key: "budget",
        label: "Budget Planner",
        status:
          surplus > 0 && runway !== null && runway >= 3
            ? "optimal"
            : surplus > 0
              ? "good"
              : "action",
        summary: `Surplus: +${formatCurrency(surplus)}/mo`,
        score: surplus > 0 ? (runway && runway >= 3 ? 95 : 75) : 30,
      });
    }

    // 2.5. Debt Crusher & Recovery (if enabled)
    if (enabledPages.includes("debt")) {
      max += 30;
      const liabilities = accountsData?.totalLiabilities || 0;
      const surplus = budgetData?.monthlySurplus || 0;
      const isProgressing = surplus > 0;

      if (isProgressing) {
        earned += 18;
        wins.push({
          id: "debt_payoff_margin",
          module: "debt",
          type: "strength",
          title: "Debt Payoff Margin Active",
          detail: `Generating +${formatCurrency(surplus)}/mo in surplus cash flow to crush debt principal.`,
          impact: "high",
          actionRoute: "/app/debt",
        });
      } else {
        opps.push({
          id: "debt_payoff_deficit",
          module: "debt",
          type: "improvement",
          title: "Cash Flow Deficit Warning",
          detail:
            "Monthly living costs exceed net income. Review priority vs non-priority obligations.",
          impact: "high",
          actionRoute: "/app/budget",
        });
      }

      if (liabilities < 5000) {
        earned += 12;
      }

      criteria.push({
        id: "debt_reduction",
        module: "debt",
        moduleLabel: "Debt Crusher",
        title: "Active Principal Payoff & Starter Buffer",
        earnedPoints: isProgressing ? (liabilities < 5000 ? 30 : 18) : 10,
        maxPoints: 30,
        isPassed: isProgressing,
        whatHelps: "Maintaining a positive cash flow surplus and active monthly overpayments.",
        whatHurts: "Running a monthly deficit or carrying high-interest overdrafts/cards.",
        howToImprove: "Allocate surplus into Avalanche or Snowball overpayments.",
        actionRoute: "/app/debt",
      });

      statuses.push({
        key: "debt",
        label: "Debt Crusher",
        status: isProgressing ? "good" : "action",
        summary: `Liabilities: ${formatCurrency(liabilities)}`,
        score: isProgressing ? 85 : 45,
      });
    }

    // 3. Savings & Investments (if enabled)
    if (enabledPages.includes("savings") && savingsData) {
      max += 25;
      const monthlySave = savingsData.totalMonthlyContributions || 0;
      const savingsBal = savingsData.totalSavingsBalance || 0;
      const rate = savingsData.weightedInterestRate || 0;

      if (monthlySave > 0) {
        earned += 12;
        wins.push({
          id: "savings_active_contrib",
          module: "savings",
          type: "strength",
          title: "Consistent Saver",
          detail: `Allocating +${formatCurrency(monthlySave)}/mo toward savings and investments.`,
          impact: "medium",
          metric: `+${formatCurrency(monthlySave)}/mo`,
          actionRoute: "/app/savings",
        });
      } else {
        opps.push({
          id: "savings_no_contrib",
          module: "savings",
          type: "improvement",
          title: "Automate Monthly Savings",
          detail:
            "Set up an automated monthly standing order on payday into your high-yield accounts.",
          impact: "medium",
          actionRoute: "/app/savings",
        });
      }

      criteria.push({
        id: "savings_habit",
        module: "savings",
        moduleLabel: "Savings",
        title: "Active Monthly Contributions",
        earnedPoints: monthlySave > 0 ? 12 : 0,
        maxPoints: 12,
        isPassed: monthlySave > 0,
        whatHelps: "Automated monthly deposits into savings or investment accounts.",
        whatHurts: "No regular monthly contributions toward savings or wealth growth.",
        howToImprove:
          "Schedule a standing order on payday to automatically transfer funds into savings.",
        actionRoute: "/app/savings",
      });

      if (rate >= 4.0) {
        earned += 13;
        wins.push({
          id: "savings_aer_good",
          module: "savings",
          type: "strength",
          title: "High-Yield Efficiency",
          detail: `Earning a competitive ${rate.toFixed(2)}% average AER on cash deposits.`,
          impact: "medium",
          metric: `${rate.toFixed(2)}% AER`,
          actionRoute: "/app/savings",
        });
      } else if (savingsBal > 1000) {
        opps.push({
          id: "savings_aer_low",
          module: "savings",
          type: "improvement",
          title: "Maximize Cash APY",
          detail: `Average return is ${rate.toFixed(2)}%. Review current best-buy easy access ISAs & savings rates (target 4.5%+).`,
          impact: "medium",
          actionRoute: "/app/savings",
        });
      } else {
        earned += 8;
      }

      criteria.push({
        id: "savings_yield",
        module: "savings",
        moduleLabel: "Savings",
        title: "Competitive Cash Interest (≥ 4.0% AER)",
        earnedPoints: rate >= 4.0 ? 13 : savingsBal > 1000 ? 0 : 8,
        maxPoints: 13,
        isPassed: rate >= 4.0,
        whatHelps: "Deposits earning competitive 4.0%+ AER or tax-free Cash ISA rates.",
        whatHurts: "Cash sitting in 0% or low-interest accounts losing value to inflation.",
        howToImprove: "Move idle cash balances to top easy-access savings or Cash ISAs.",
        actionRoute: "/app/savings",
      });

      statuses.push({
        key: "savings",
        label: "Savings & Investments",
        status: monthlySave > 0 && rate >= 4.0 ? "optimal" : monthlySave > 0 ? "good" : "action",
        summary: `Saved: ${formatCurrency(savingsBal)}`,
        score: monthlySave > 0 && rate >= 4.0 ? 90 : 65,
      });
    }

    // 4. Pension & Retirement (if enabled)
    if (enabledPages.includes("pension") && pensionData) {
      max += 25;
      const totalPercent = (pensionData.employeePercent || 0) + (pensionData.employerPercent || 0);
      const isSalSac = pensionData.isSalarySacrifice;

      if (totalPercent >= 8) {
        earned += 15;
        wins.push({
          id: "pension_rate_good",
          module: "pension",
          type: "strength",
          title: "Retirement Goal Met",
          detail: `Total contributions at ${totalPercent}% meet or exceed the statutory 8% UK benchmark.`,
          impact: "high",
          metric: `${totalPercent}%`,
          actionRoute: "/app/pension",
        });
      } else {
        opps.push({
          id: "pension_rate_low",
          module: "pension",
          type: "improvement",
          title: "Increase Pension Contributions",
          detail: `Total contribution is ${totalPercent}%. Boosting contributions captures compound growth and tax relief.`,
          impact: "high",
          actionRoute: "/app/pension",
        });
      }

      criteria.push({
        id: "pension_rate",
        module: "pension",
        moduleLabel: "Pension",
        title: "Retirement Contributions (≥ 8%)",
        earnedPoints: totalPercent >= 8 ? 15 : 0,
        maxPoints: 15,
        isPassed: totalPercent >= 8,
        whatHelps: "Combined contributions meet or exceed the UK 8% statutory benchmark.",
        whatHurts: "Under-contributing, leaving free employer matching money on the table.",
        howToImprove: "Increase pension contribution percentage in profile settings.",
        actionRoute: "/app/pension",
      });

      if (isSalSac) {
        earned += 10;
        wins.push({
          id: "pension_salsac_win",
          module: "pension",
          type: "strength",
          title: "Salary Sacrifice Enabled",
          detail: "Pension contributions are exempt from employee and employer National Insurance.",
          impact: "medium",
          actionRoute: "/app/pension",
        });
      } else {
        opps.push({
          id: "pension_salsac_opp",
          module: "pension",
          type: "improvement",
          title: "Consider Salary Sacrifice",
          detail:
            "Ask your employer about pension salary sacrifice to save up to 2%–12% on National Insurance.",
          impact: "medium",
          actionRoute: "/app/pension",
        });
      }

      criteria.push({
        id: "pension_salsac",
        module: "pension",
        moduleLabel: "Pension",
        title: "Salary Sacrifice NI Efficiency",
        earnedPoints: isSalSac ? 10 : 0,
        maxPoints: 10,
        isPassed: Boolean(isSalSac),
        whatHelps: "Salary sacrifice exemption saves employee & employer National Insurance.",
        whatHurts: "Contributing from net pay without National Insurance savings.",
        howToImprove: "Ask your employer's HR or payroll team to enable salary sacrifice.",
        actionRoute: "/app/pension",
      });

      statuses.push({
        key: "pension",
        label: "Pension & Retirement",
        status: totalPercent >= 8 && isSalSac ? "optimal" : totalPercent >= 8 ? "good" : "action",
        summary: `${totalPercent}% total contribution`,
        score: totalPercent >= 8 ? (isSalSac ? 95 : 80) : 55,
      });
    }

    // 5. Mortgage Tools (if enabled and user has mortgage)
    if (enabledPages.includes("mortgage") && mortgageData?.mortgageBalance) {
      max += 20;
      const rate = mortgageData.interestRate || 4.5;
      const term = mortgageData.remainingTermYears || 25;

      if (rate <= 4.2) {
        earned += 12;
        wins.push({
          id: "mortgage_rate_ok",
          module: "mortgage",
          type: "strength",
          title: "Competitive Mortgage Rate",
          detail: `Secured borrowing rate at ${rate.toFixed(2)}% over ${term} remaining years.`,
          impact: "medium",
          metric: `${rate.toFixed(2)}%`,
          actionRoute: "/app/mortgage",
        });
      } else {
        earned += 8;
        opps.push({
          id: "mortgage_overpay_opp",
          module: "mortgage",
          type: "improvement",
          title: "Simulate Overpayments",
          detail: `At ${rate.toFixed(2)}% interest, a £100–£200 monthly overpayment significantly cuts long-term interest cost.`,
          impact: "medium",
          actionRoute: "/app/mortgage",
        });
      }

      criteria.push({
        id: "mortgage_efficiency",
        module: "mortgage",
        moduleLabel: "Mortgage",
        title: "Mortgage Rate & Overpayment Plan",
        earnedPoints: rate <= 4.2 ? 12 : 8,
        maxPoints: 20,
        isPassed: rate <= 4.2,
        whatHelps: "Secured competitive borrowing rate (≤ 4.2%) or simulating overpayments.",
        whatHurts: "High interest borrowing without simulating overpayments or reviewing deals.",
        howToImprove: "Run the Mortgage Overpayment Simulator to see long-term interest savings.",
        actionRoute: "/app/mortgage",
      });

      statuses.push({
        key: "mortgage",
        label: "Mortgage Tools",
        status: rate <= 4.2 ? "optimal" : "good",
        summary: `Rate: ${rate.toFixed(2)}% (${term} yrs)`,
        score: rate <= 4.2 ? 85 : 70,
      });
    }

    // 6. Tax & Self-Assessment (if enabled)
    if (enabledPages.includes("tax") && taxData) {
      max += 15;
      const records = taxData.recordsCount || 0;
      const taxDue = taxData.estimatedTaxDue || 0;

      if (records > 0) {
        earned += 10;
        wins.push({
          id: "tax_records_kept",
          module: "tax",
          type: "strength",
          title: "Tax Logs Up to Date",
          detail: `${records} income and expense transactions logged for tax year ${taxData.taxYear || "current"}.`,
          impact: "medium",
          actionRoute: "/app/tax",
        });
      } else {
        opps.push({
          id: "tax_records_none",
          module: "tax",
          type: "improvement",
          title: "Log Deductible Expenses",
          detail: "Record allowable business/property expenses to prevent overpaying income tax.",
          impact: "medium",
          actionRoute: "/app/tax",
        });
      }

      criteria.push({
        id: "tax_logs",
        module: "tax",
        moduleLabel: "Tax",
        title: "Tax Logs & Expense Tracking",
        earnedPoints: records > 0 ? 10 : 0,
        maxPoints: 10,
        isPassed: records > 0,
        whatHelps: "Logging all income and deductible business/property expenses up to date.",
        whatHurts: "Unrecorded deductible expenses risking overpaying HMRC income tax.",
        howToImprove: "Record all allowable business/rental expenses in the Tax section.",
        actionRoute: "/app/tax",
      });

      if (taxDue > 1500) {
        opps.push({
          id: "tax_reserve_due",
          module: "tax",
          type: "improvement",
          title: "Reserve Tax Liability",
          detail: `Estimated liability is ${formatCurrency(taxDue)}. Keep reserved in an easy-access account ahead of HMRC payment.`,
          impact: "high",
          metric: formatCurrency(taxDue),
          actionRoute: "/app/tax",
        });
      } else {
        earned += 5;
      }

      criteria.push({
        id: "tax_reserve",
        module: "tax",
        moduleLabel: "Tax",
        title: "Tax Liability Buffer",
        earnedPoints: taxDue <= 1500 ? 5 : 0,
        maxPoints: 5,
        isPassed: taxDue <= 1500,
        whatHelps: "Holding sufficient liquid reserves to pay HMRC liabilities without stress.",
        whatHurts: "Estimated liability (> £1,500) without a dedicated savings reserve.",
        howToImprove: "Set aside 20%–30% of freelance/rental profit in an accessible holding pot.",
        actionRoute: "/app/tax",
      });

      statuses.push({
        key: "tax",
        label: "Tax & Self-Assessment",
        status: records > 0 && taxDue < 3000 ? "optimal" : "good",
        summary: `${records} records (${formatCurrency(taxDue)} due)`,
        score: records > 0 ? 80 : 50,
      });
    }

    const calculatedScore = max > 0 ? Math.round((earned / max) * 100) : 80;
    const clampedScore = Math.min(100, Math.max(10, calculatedScore));

    let lvl = "Good";
    let color = "#3b82f6";
    if (clampedScore >= 85) {
      lvl = "Excellent";
      color = "#10b981";
    } else if (clampedScore >= 70) {
      lvl = "Strong";
      color = "#3b82f6";
    } else if (clampedScore >= 50) {
      lvl = "Fair";
      color = "#f59e0b";
    } else {
      lvl = "Needs Focus";
      color = "#ef4444";
    }

    return {
      score: clampedScore,
      rating: lvl,
      ratingColor: color,
      earnedPoints: earned,
      maxPoints: max,
      strengths: wins,
      improvements: opps,
      moduleStatuses: statuses,
      scoringCriteria: criteria,
    };
  }, [
    accountsData,
    budgetData,
    savingsData,
    pensionData,
    mortgageData,
    taxData,
    enabledPages,
    formatCurrency,
  ]);

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="financialHealth"
      hideOpenLink
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Customize the metrics, visibility, and breakdown displayed on your financial health overview."
          isOpen={isOpen}
          title="Financial Health Widget Settings"
          onClose={onClose}
        >
          {/* Show Score Number Toggle */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1,
            })}
          >
            <div>
              <div className={css({ fontSize: "sm", fontWeight: "semibold" })}>
                Show Score Number
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Show numeric 0–100 score along with rating
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle show score number"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showScore ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() => onUpdateConfig?.({ ...config, showNumericScore: !showScore })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showScore ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Show Detailed Breakdown Toggle */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 3,
            })}
          >
            <div>
              <div className={css({ fontSize: "sm", fontWeight: "semibold" })}>
                Show Detailed Breakdown
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Show strengths, improvements, and module status tabs
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle show detailed breakdown"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showBreakdown ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() =>
                onUpdateConfig?.({
                  ...config,
                  showBreakdown: !showBreakdown,
                  hideTabs: showBreakdown,
                })
              }
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showBreakdown ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Default View Tab */}
          {showBreakdown && (
            <div className={css({ mt: 3 })}>
              <div
                className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
              >
                Default View Tab
              </div>
              <div className={css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" })}>
                {[
                  { id: "overview", label: "Highlights" },
                  { id: "wins", label: "Strengths (Wins)" },
                  { id: "improvements", label: "To Improve" },
                  { id: "modules", label: "Module Status" },
                  { id: "scoring", label: "Scoring Rules" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={css({
                      padding: "8px",
                      borderRadius: "md",
                      border: "1px solid",
                      borderColor:
                        (config.defaultTab || "overview") === tab.id ? "primary" : "border",
                      backgroundColor:
                        (config.defaultTab || "overview") === tab.id
                          ? "rgba(99,99,241,0.08)"
                          : "surface",
                      color:
                        (config.defaultTab || "overview") === tab.id ? "primary" : "text.primary",
                      cursor: "pointer",
                      fontSize: "xs",
                      fontWeight: "medium",
                    })}
                    onClick={() => onUpdateConfig?.({ ...config, defaultTab: tab.id as any })}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </WidgetSettingsModal>
      )}
    >
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: { base: "10px", md: "14px" },
        })}
      >
        {/* Top Summary Banner */}
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { base: "8px 10px", md: "12px 16px" },
            borderRadius: "lg",
            backgroundColor: "surface",
            border: "1px solid",
            borderColor: "border",
            gap: "10px",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* Score Badge */}
            <div
              className={css({
                width: { base: "38px", md: "46px" },
                height: { base: "38px", md: "46px" },
                borderRadius: "full",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "2px solid",
              })}
              style={{
                borderColor: ratingColor,
                backgroundColor: `${ratingColor}15`,
              }}
            >
              {showScore ? (
                <span style={{ fontSize: "14px", fontWeight: "bold", color: ratingColor }}>
                  {score}
                </span>
              ) : (
                <FaShieldAlt style={{ color: ratingColor, fontSize: "16px" }} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: ratingColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {rating} Health
                </span>
                <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>•</span>
                <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                  {moduleStatuses.length} {moduleStatuses.length === 1 ? "section" : "sections"}{" "}
                  active
                </span>
              </div>
              <FLPText
                color="text.muted"
                fontSize="11px"
                className={css({
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  mt: "1px",
                })}
              >
                {strengths.length} {strengths.length === 1 ? "strength" : "strengths"} •{" "}
                {improvements.length} {improvements.length === 1 ? "opportunity" : "opportunities"}
              </FLPText>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              aria-label="How health score is calculated"
              title="See what counts towards your score"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: { base: "11px", sm: "xs" },
                fontWeight: "semibold",
                color: "primary",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                cursor: "pointer",
                padding: { base: "4px 8px", sm: "5px 10px" },
                borderRadius: "md",
                transition: "all 0.15s ease",
                flexShrink: 0,
                _hover: { backgroundColor: "rgba(99, 102, 241, 0.18)" },
              })}
              onClick={() => setIsMethodologyOpen(true)}
            >
              <FaInfoCircle size={11} />
              <span>How it's scored</span>
            </button>

            <div
              className={css({
                display: { base: "none", md: "flex" },
                alignItems: "center",
                gap: "6px",
              })}
            >
              <div
                className={css({
                  padding: "4px 8px",
                  borderRadius: "md",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "emerald.500",
                  fontSize: "xs",
                  fontWeight: "semibold",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <FaCheckCircle size={11} /> {strengths.length} Wins
              </div>
              <div
                className={css({
                  padding: "4px 8px",
                  borderRadius: "md",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  color: "warning.500",
                  fontSize: "xs",
                  fontWeight: "semibold",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <FaLightbulb size={11} /> {improvements.length} Tips
              </div>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Toggle Bar */}
        {showBreakdown && (
          <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-label={
                isCollapsed
                  ? "Expand financial health breakdown"
                  : "Collapse financial health breakdown"
              }
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 14px",
                borderRadius: "full",
                backgroundColor: isCollapsed ? "surface" : "rgba(99, 102, 241, 0.08)",
                border: "1px solid",
                borderColor: isCollapsed ? "border" : "primary",
                color: isCollapsed ? "text.muted" : "primary",
                fontSize: "xs",
                fontWeight: "semibold",
                cursor: "pointer",
                transition: "all 0.15s ease",
                _hover: {
                  borderColor: "primary",
                  color: "primary",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                },
              })}
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              <span>{isCollapsed ? "View Breakdown & Tips" : "Hide Breakdown"}</span>
              {isCollapsed ? <FaChevronDown size={10} /> : <FaChevronUp size={10} />}
            </button>
          </div>
        )}

        {/* Tabbed Section */}
        {showBreakdown && !isCollapsed && (
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: { base: "8px", md: "12px" },
            })}
          >
            {/* Tab Filters */}
            <div
              className={css({
                display: "flex",
                gap: "4px",
                borderBottom: "1px solid",
                borderColor: "border",
                paddingBottom: "6px",
                overflowX: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              })}
            >
              {[
                { id: "overview", label: "Highlights" },
                { id: "wins", label: `Wins (${strengths.length})` },
                { id: "improvements", label: `To Improve (${improvements.length})` },
                { id: "modules", label: `Modules (${moduleStatuses.length})` },
                { id: "scoring", label: "Scoring Rules" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={css({
                      padding: { base: "3px 8px", md: "4px 10px" },
                      borderRadius: "md",
                      fontSize: { base: "10px", md: "xs" },
                      fontWeight: isActive ? "semibold" : "medium",
                      color: isActive ? "primary" : "text.muted",
                      backgroundColor: isActive ? "rgba(99, 102, 241, 0.08)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      "&:hover": { color: "primary" },
                    })}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Overview (Top Wins & Top Opportunities) */}
            {activeTab === "overview" && (
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: size === "wide" ? { base: "1fr", md: "1fr 1fr" } : "1fr",
                  gap: { base: "8px", md: "12px" },
                })}
              >
                {/* Wins list */}
                <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "emerald.500",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    })}
                  >
                    <FaTrophy size={11} />
                    <span>What's Working Well</span>
                  </div>
                  {strengths.slice(0, size === "wide" ? 3 : 2).map((item) => (
                    <div
                      key={item.id}
                      className={css({
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: { base: "6px 8px", md: "8px 10px" },
                        borderRadius: "md",
                        backgroundColor: "rgba(16, 185, 129, 0.04)",
                        border: "1px solid rgba(16, 185, 129, 0.18)",
                      })}
                    >
                      <FaCheckCircle
                        className={css({
                          color: "emerald.500",
                          fontSize: "13px",
                          marginTop: "2px",
                          flexShrink: 0,
                        })}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <FLPText
                            fontSize="xs"
                            className={css({ fontSize: { base: "11px", md: "xs" } })}
                            fontWeight="bold"
                            color="text.primary"
                          >
                            {item.title}
                          </FLPText>
                          {item.metric && (
                            <span
                              className={css({
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "emerald.500",
                                marginLeft: "4px",
                              })}
                            >
                              {item.metric}
                            </span>
                          )}
                        </div>
                        <FLPText
                          fontSize="10px"
                          color="text.muted"
                          style={{ marginTop: "1px", lineHeight: "1.3" }}
                        >
                          {item.detail}
                        </FLPText>
                      </div>
                    </div>
                  ))}
                  {strengths.length === 0 && (
                    <FLPText fontSize="xs" color="text.muted">
                      Add more account & budget details to unlock your financial strengths.
                    </FLPText>
                  )}
                </div>

                {/* Opportunities list */}
                <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "warning.500",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    })}
                  >
                    <FaLightbulb size={11} />
                    <span>Areas to Improve</span>
                  </div>
                  {improvements.slice(0, size === "wide" ? 3 : 2).map((item) => (
                    <Link
                      key={item.id}
                      to={item.actionRoute}
                      className={css({
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: { base: "6px 8px", md: "8px 10px" },
                        borderRadius: "md",
                        backgroundColor: "rgba(245, 158, 11, 0.04)",
                        border: "1px solid rgba(245, 158, 11, 0.18)",
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "warning.500",
                          backgroundColor: "rgba(245, 158, 11, 0.08)",
                        },
                      })}
                    >
                      <FaExclamationTriangle
                        className={css({
                          color: "warning.500",
                          fontSize: "12px",
                          marginTop: "2px",
                          flexShrink: 0,
                        })}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <FLPText
                            fontSize="xs"
                            className={css({ fontSize: { base: "11px", md: "xs" } })}
                            fontWeight="bold"
                            color="text.primary"
                          >
                            {item.title}
                          </FLPText>
                          <FaArrowRight size={9} style={{ color: "var(--colors-text-muted)" }} />
                        </div>
                        <FLPText
                          fontSize="10px"
                          color="text.muted"
                          style={{ marginTop: "1px", lineHeight: "1.3" }}
                        >
                          {item.detail}
                        </FLPText>
                      </div>
                    </Link>
                  ))}
                  {improvements.length === 0 && (
                    <div
                      className={css({
                        padding: "10px",
                        borderRadius: "md",
                        backgroundColor: "rgba(16, 185, 129, 0.06)",
                        color: "emerald.500",
                        fontSize: "xs",
                        fontWeight: 600,
                      })}
                    >
                      No critical improvements needed right now! All your active sections are in
                      optimal shape.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Detailed Wins */}
            {activeTab === "wins" && (
              <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                {strengths.map((item) => (
                  <div
                    key={item.id}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "md",
                      backgroundColor: "rgba(16, 185, 129, 0.04)",
                      border: "1px solid rgba(16, 185, 129, 0.18)",
                    })}
                  >
                    <FaCheckCircle
                      className={css({
                        color: "emerald.500",
                        fontSize: "13px",
                        marginTop: "2px",
                        flexShrink: 0,
                      })}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FLPText fontSize="xs" fontWeight="bold">
                            {item.title}
                          </FLPText>
                          <span
                            className={css({
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: "full",
                              backgroundColor: "background",
                              color: "text.muted",
                              textTransform: "uppercase",
                            })}
                          >
                            {item.module}
                          </span>
                        </div>
                        {item.metric && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--colors-emerald-500)",
                            }}
                          >
                            {item.metric}
                          </span>
                        )}
                      </div>
                      <FLPText fontSize="11px" color="text.muted" style={{ marginTop: "2px" }}>
                        {item.detail}
                      </FLPText>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Detailed Improvements */}
            {activeTab === "improvements" && (
              <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                {improvements.map((item) => (
                  <Link
                    key={item.id}
                    to={item.actionRoute}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "md",
                      backgroundColor: "rgba(245, 158, 11, 0.04)",
                      border: "1px solid rgba(245, 158, 11, 0.18)",
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: "warning.500",
                        backgroundColor: "rgba(245, 158, 11, 0.08)",
                      },
                    })}
                  >
                    <FaLightbulb
                      className={css({
                        color: "warning.500",
                        fontSize: "13px",
                        marginTop: "2px",
                        flexShrink: 0,
                      })}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FLPText fontSize="xs" fontWeight="bold">
                            {item.title}
                          </FLPText>
                          <span
                            className={css({
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: "full",
                              backgroundColor:
                                item.impact === "high"
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "rgba(245, 158, 11, 0.12)",
                              color: item.impact === "high" ? "destructive" : "warning.500",
                              textTransform: "uppercase",
                            })}
                          >
                            {item.impact} impact
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--colors-primary)",
                            fontWeight: 600,
                          }}
                        >
                          Open {item.module} →
                        </span>
                      </div>
                      <FLPText fontSize="11px" color="text.muted" style={{ marginTop: "2px" }}>
                        {item.detail}
                      </FLPText>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Tab 4: Applicable Modules Grid */}
            {activeTab === "modules" && (
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: {
                    base: "1fr",
                    sm: size === "wide" ? "repeat(3, 1fr)" : "1fr 1fr",
                  },
                  gap: "8px",
                })}
              >
                {moduleStatuses.map((m) => {
                  const statusColors = {
                    optimal: {
                      bg: "rgba(16, 185, 129, 0.08)",
                      text: "emerald.500",
                      border: "rgba(16, 185, 129, 0.25)",
                    },
                    good: {
                      bg: "rgba(59, 130, 246, 0.08)",
                      text: "blue.500",
                      border: "rgba(59, 130, 246, 0.25)",
                    },
                    action: {
                      bg: "rgba(245, 158, 11, 0.08)",
                      text: "warning.500",
                      border: "rgba(245, 158, 11, 0.25)",
                    },
                  }[m.status];

                  return (
                    <div
                      key={m.key}
                      className={css({
                        padding: "8px 10px",
                        borderRadius: "md",
                        backgroundColor: "surface",
                        border: "1px solid",
                        borderColor: "border",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "4px",
                      })}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <FLPText fontSize="xs" fontWeight="semibold">
                          {m.label}
                        </FLPText>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "full",
                            backgroundColor: statusColors.bg,
                            color: `var(--colors-${statusColors.text})`,
                            border: `1px solid ${statusColors.border}`,
                            textTransform: "capitalize",
                          }}
                        >
                          {m.status}
                        </span>
                      </div>
                      <FLPText fontSize="10px" color="text.muted">
                        {m.summary}
                      </FLPText>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 5: Scoring Rules & What Counts */}
            {activeTab === "scoring" && (
              <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "md",
                    backgroundColor: "surface",
                    border: "1px solid var(--colors-border)",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                    Total:{" "}
                    <strong>
                      {earnedPoints} / {maxPoints} pts ({score}%)
                    </strong>{" "}
                    across your {moduleStatuses.length} active sections.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMethodologyOpen(true)}
                    className={css({
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "primary",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "0",
                      _hover: { textDecoration: "underline" },
                    })}
                  >
                    <FaInfoCircle size={11} /> View scoring tiers & guide →
                  </button>
                </div>

                <div className={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                  {scoringCriteria.map((c) => (
                    <div
                      key={c.id}
                      className={css({
                        padding: "8px 10px",
                        borderRadius: "md",
                        backgroundColor: "surface",
                        border: "1px solid",
                        borderColor: c.isPassed ? "rgba(16, 185, 129, 0.25)" : "border",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      })}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}
                        >
                          {c.isPassed ? (
                            <FaCheckCircle
                              className={css({
                                color: "emerald.500",
                                fontSize: "12px",
                                flexShrink: 0,
                              })}
                            />
                          ) : (
                            <FaExclamationTriangle
                              className={css({
                                color: "warning.500",
                                fontSize: "11px",
                                flexShrink: 0,
                              })}
                            />
                          )}
                          <FLPText fontSize="xs" fontWeight="bold">
                            {c.title}
                          </FLPText>
                          <span
                            className={css({
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: "full",
                              backgroundColor: "background",
                              color: "text.muted",
                              textTransform: "uppercase",
                            })}
                          >
                            {c.moduleLabel}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: c.isPassed
                              ? "var(--colors-emerald-500)"
                              : "var(--colors-warning-500)",
                            flexShrink: 0,
                          }}
                        >
                          {c.earnedPoints} / {c.maxPoints} pts
                        </span>
                      </div>

                      <div
                        className={css({
                          display: "grid",
                          gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                          gap: "6px",
                          fontSize: "10px",
                          padding: "6px 8px",
                          borderRadius: "md",
                          backgroundColor: "background",
                        })}
                      >
                        <div>
                          <span style={{ color: "var(--colors-emerald-500)", fontWeight: 700 }}>
                            ✓ Boosts:{" "}
                          </span>
                          <span style={{ color: "var(--colors-text-muted)" }}>{c.whatHelps}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--colors-warning-500)", fontWeight: 700 }}>
                            ✗ Hurts:{" "}
                          </span>
                          <span style={{ color: "var(--colors-text-muted)" }}>{c.whatHurts}</span>
                        </div>
                      </div>

                      {!c.isPassed && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "10px",
                            marginTop: "2px",
                          }}
                        >
                          <span style={{ color: "var(--colors-text-muted)" }}>
                            <strong>Improve:</strong> {c.howToImprove}
                          </span>
                          <Link
                            to={c.actionRoute}
                            style={{
                              color: "var(--colors-primary)",
                              fontWeight: 600,
                              textDecoration: "none",
                              flexShrink: 0,
                              marginLeft: "6px",
                            }}
                          >
                            Open {c.moduleLabel} →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ScoreMethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        score={score}
        rating={rating}
        ratingColor={ratingColor}
        earnedPoints={earnedPoints}
        maxPoints={maxPoints}
        criteria={scoringCriteria}
        enabledCount={moduleStatuses.length}
      />
    </DashboardWidgetCard>
  );
};

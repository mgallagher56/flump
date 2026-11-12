import { calculateSafeToSpend } from "@flump/finance-engine";
import { ChartFigure } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { FaArrowRight, FaBalanceScale, FaChartPie, FaExclamationTriangle } from "react-icons/fa";
import { FiAlertTriangle, FiCalendar, FiCompass, FiShield } from "react-icons/fi";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import {
  CATEGORY_COLOURS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getDaysUntilContractEnd,
  isPriorityBill,
  toMonthly,
} from "~/types/budget";
import {
  calculateRunwayStats,
  loadRunwaySettings,
  type RunwaySavedSettings,
} from "~/utils/runwayStorage";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface AccountDetail {
  account_id: string;
  month: number;
  year: number;
  value: number;
}

export interface BudgetDashboardProps {
  entries: BudgetEntry[];
  accounts: Account[];
  accountDetails: AccountDetail[];
  savingsBalance: number;
  mortgageBalance: number;
  onNavigateToCategory: (cat: BudgetCategory) => void;
  onNavigateToRunway: () => void;
  runwaySettings?: RunwaySavedSettings | null;
  customCategories?: string[];
  onAddSuggestedDefaults?: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const tabularStyle = css({ fontVariantNumeric: "tabular-nums" });

const EXPENSE_CATEGORIES: BudgetCategory[] = ["housing", "bills", "expenses"];

const BudgetDashboard: FC<BudgetDashboardProps> = ({
  entries,
  accounts,
  accountDetails,
  savingsBalance,
  onNavigateToCategory,
  onNavigateToRunway,
  runwaySettings,
  customCategories = [],
  onAddSuggestedDefaults,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const { formatCurrency } = useFormatCurrency();
  const reducedMotion = usePrefersReducedMotion();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const totals = useMemo(() => {
    const income = entries.filter((e) => e.isIncome).reduce((s, e) => s + toMonthly(e), 0);
    const expenses = entries
      .filter((e) => !e.isIncome && e.category !== "savings")
      .reduce((s, e) => s + toMonthly(e), 0);
    const budgetedSavings = entries
      .filter((e) => !e.isIncome && e.category === "savings")
      .reduce((s, e) => s + toMonthly(e), 0);
    return {
      income,
      expenses,
      budgetedSavings,
      surplus: income - expenses - budgetedSavings,
    };
  }, [entries]);

  const expenseCategories = useMemo(() => {
    const set = new Set<string>(EXPENSE_CATEGORIES);
    if (customCategories && customCategories.length > 0) {
      customCategories.forEach((c) => {
        if (c === "savings") return;
        const catEntries = entries.filter((e) => e.category === c);
        const isPureIncome = catEntries.length > 0 && catEntries.every((e) => e.isIncome);
        if (!isPureIncome) set.add(c);
      });
    }
    entries.forEach((e) => {
      if (!e.isIncome && e.category && e.category !== "savings") set.add(e.category);
    });
    return Array.from(set);
  }, [customCategories, entries]);

  const categoryTotals = useMemo(() => {
    return expenseCategories.map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat] || cat,
      colour: CATEGORY_COLOURS[cat] || "#6363f1",
      icon: CATEGORY_ICONS[cat] || "📁",
      total: entries.filter((e) => e.category === cat).reduce((s, e) => s + toMonthly(e), 0),
      count: entries.filter((e) => e.category === cat).length,
    }));
  }, [expenseCategories, entries]);

  const pieData = categoryTotals.filter((d) => d.total > 0);

  const housingSaved = entries
    .filter((e) => e.category === "savings")
    .reduce((s, e) => s + toMonthly(e), 0);

  const safeToSpend = useMemo(() => {
    const fixedBills = entries
      .filter((e) => !e.isIncome && (e.category === "housing" || e.category === "bills"))
      .reduce((s, e) => s + toMonthly(e), 0);
    const groceries = entries
      .filter(
        (e) =>
          !e.isIncome &&
          e.category === "expenses" &&
          (e.name.toLowerCase().includes("food") || e.name.toLowerCase().includes("grocer")),
      )
      .reduce((s, e) => s + toMonthly(e), 0);
    const minDebt = entries
      .filter(
        (e) =>
          !e.isIncome &&
          (e.name.toLowerCase().includes("card") ||
            e.name.toLowerCase().includes("loan") ||
            e.name.toLowerCase().includes("debt")),
      )
      .reduce((s, e) => s + toMonthly(e), 0);

    return calculateSafeToSpend(
      totals.income,
      fixedBills,
      minDebt,
      groceries || Math.round(totals.expenses * 0.2),
    );
  }, [entries, totals]);

  const fmt = (n: number | string | null | undefined) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return formatCurrency(0);
    return formatCurrency(Math.abs(val));
  };

  const surplusColour = totals.surplus >= 0 ? "#10b981" : "#ef4444";

  const runwayStats = useMemo(() => {
    const activeSettings =
      runwaySettings ?? (typeof window !== "undefined" ? loadRunwaySettings() : null);

    const stats = calculateRunwayStats({
      entries,
      accounts,
      accountDetails,
      savedSettings: activeSettings,
    });

    const getStatus = (m: number) => {
      if (m < 3)
        return { colour: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Critical", emoji: "🔴" };
      if (m < 6)
        return { colour: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Caution", emoji: "🟡" };
      if (m < 12)
        return { colour: "#f97316", bg: "rgba(249, 115, 22, 0.1)", label: "Moderate", emoji: "🟠" };
      return { colour: "#10b981", bg: "rgba(16, 185, 129, 0.1)", label: "Healthy", emoji: "🟢" };
    };

    const runwayMonths = stats.runwayMonths ?? Number.POSITIVE_INFINITY;
    const status = stats.monthlyBurn === 0 ? getStatus(999) : getStatus(runwayMonths);
    const displayMax = 24;
    const barPct = Math.min((runwayMonths / displayMax) * 100, 100);

    return {
      monthlyBurn: stats.monthlyBurn,
      runwayMonths,
      runwayLabel: stats.runwayLabel,
      status,
      barPct,
      displayMax,
      pool: stats.pool,
    };
  }, [entries, accounts, accountDetails, runwaySettings]);

  const cashFlowSplit = useMemo(() => {
    const priorityItems = entries.filter((e) => !e.isIncome && isPriorityBill(e));
    const flexibleItems = entries.filter(
      (e) => !e.isIncome && !isPriorityBill(e) && e.category !== "savings",
    );

    const priorityBudget = priorityItems.reduce((s, e) => s + toMonthly(e), 0);
    const flexibleBudget = flexibleItems.reduce((s, e) => s + toMonthly(e), 0);

    const billsWithCliffs = entries
      .filter((e) => !e.isIncome && e.category === "bills" && e.contractEndDate)
      .map((e) => ({
        ...e,
        daysUntil: getDaysUntilContractEnd(e.contractEndDate),
      }))
      .filter((e) => e.daysUntil !== null && e.daysUntil <= 30);

    return {
      priorityItems,
      flexibleItems,
      priorityBudget,
      flexibleBudget,
      billsWithCliffs,
    };
  }, [entries]);

  const cardBase = css({
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: isMobileVariant ? "12px" : "16px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface",
  });

  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: isMobileVariant ? "16px" : "24px",
      })}
      data-variant={isMobileVariant ? "mobile" : "desktop"}
    >
      {/* Empty State Banner */}
      {entries.length === 0 && (
        <div
          id="budget-empty-state-banner"
          className={css({
            padding: isMobileVariant ? "16px" : "20px 24px",
            borderRadius: "lg",
            border: "1px dashed",
            borderColor: "primary",
            backgroundColor: "rgba(99,99,241,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          })}
        >
          <div>
            <FLPHeading as="h3" size="sm">
              Your budget has no entries yet
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Start building your budget from scratch or load our suggested defaults to get started.
            </FLPText>
          </div>
          {onAddSuggestedDefaults && (
            <FLPButton
              id="empty-state-add-defaults-btn"
              size="sm"
              variant="outline"
              onClick={onAddSuggestedDefaults}
            >
              Add Suggested Defaults
            </FLPButton>
          )}
        </div>
      )}

      {/* Top KPI row */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobileVariant
            ? "1fr"
            : { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: isMobileVariant ? "10px" : "16px",
        })}
      >
        {/* Monthly Income */}
        <div className={cardBase}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Monthly Income
          </FLPText>
          <FLPHeading as="h2" color="success.500" size="2xl" style={{ marginTop: "4px" }}>
            {fmt(totals.income)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {entries.filter((e) => e.isIncome).length} source
            {entries.filter((e) => e.isIncome).length !== 1 ? "s" : ""}
          </FLPText>
        </div>

        {/* Monthly Expenses */}
        <div className={cardBase}>
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Monthly Expenses
          </FLPText>
          <FLPHeading as="h2" color="status.danger.text" size="2xl" style={{ marginTop: "4px" }}>
            {fmt(totals.expenses)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            across {expenseCategories.length} categories
          </FLPText>
        </div>

        {/* Surplus / Deficit */}
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: isMobileVariant ? "12px" : "16px",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: totals.surplus >= 0 ? "success.500" : "destructive",
            backgroundColor: totals.surplus >= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {totals.surplus < 0 && (
              <FaExclamationTriangle
                style={{ color: "var(--colors-status-danger-text)", fontSize: "14px" }}
              />
            )}
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              {totals.surplus >= 0 ? "Monthly Surplus" : "Monthly Deficit"}
            </FLPText>
          </div>
          <FLPHeading as="h2" size="2xl" style={{ color: surplusColour, marginTop: "4px" }}>
            {totals.surplus >= 0 ? "+" : "-"}
            {fmt(totals.surplus)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            {totals.surplus >= 0 ? "Available to save or pay down debt" : "Spending exceeds income"}
          </FLPText>
        </div>

        {/* Safe-to-Spend Weekly Allowance */}
        <div
          className={cardBase}
          style={{
            borderColor: "rgba(99, 99, 241, 0.4)",
            backgroundColor: "rgba(99, 99, 241, 0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FLPText
              color="text.muted"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              Safe-to-Spend
            </FLPText>
            <span
              style={{
                fontSize: "10px",
                backgroundColor: "rgba(99,99,241,0.15)",
                color: "#6363f1",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              Daily ~{fmt(safeToSpend.dailyAllowance)}
            </span>
          </div>
          <FLPHeading as="h2" color="primary" size="2xl" style={{ marginTop: "4px" }}>
            {fmt(safeToSpend.weeklyAllowance)}
            <span
              style={{ fontSize: "13px", color: "var(--colors-text-muted)", fontWeight: "normal" }}
            >
              /week
            </span>
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs">
            After fixed bills, debt, & groceries
          </FLPText>
        </div>
      </div>

      {/* Cash Flow & Safe-to-Spend: Priority Obligations vs Flexible / Discretionary Spend */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "1fr 1fr" },
          gap: "16px",
        })}
      >
        {/* Priority Obligations */}
        <div
          className={css({
            padding: isMobileVariant ? "16px" : "20px",
            borderRadius: "lg",
            border: "1px solid",
            borderColor: "rgba(99, 102, 241, 0.3)",
            backgroundColor: "rgba(99, 102, 241, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          })}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FiShield style={{ color: "var(--colors-primary)", fontSize: "16px" }} />
                <FLPHeading as="h3" size="sm">
                  Priority obligations (protected)
                </FLPHeading>
              </div>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                Rent/Mortgage, Council Tax, Energy & Water (Statutory UK protections)
              </FLPText>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "rgba(99, 102, 241, 0.15)",
                color: "#6366f1",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Non-negotiable
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-surface)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div>
              <FLPText color="text.muted" fontSize="xs">
                Planned Monthly
              </FLPText>
              <FLPHeading as="h4" size="md" style={{ marginTop: "2px" }}>
                {fmt(cashFlowSplit.priorityBudget)}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "normal",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  /mo
                </span>
              </FLPHeading>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FLPText color="text.muted" fontSize="xs">
              {cashFlowSplit.priorityItems.length} priority items tracked
            </FLPText>
            <FLPText color="success.500" fontSize="xs" fontWeight="semibold">
              Protected against secondary credit claims
            </FLPText>
          </div>
        </div>

        {/* Flexible & Discretionary Spend */}
        <div
          className={css({
            padding: isMobileVariant ? "16px" : "20px",
            borderRadius: "lg",
            border: "1px solid",
            borderColor: "rgba(16, 185, 129, 0.3)",
            backgroundColor: "rgba(16, 185, 129, 0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          })}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FiCompass style={{ color: "#0ea5e9", fontSize: "16px" }} />
                <FLPHeading as="h3" size="sm">
                  Flexible and discretionary spend
                </FLPHeading>
              </div>
              <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "2px" }}>
                Day-to-day lifestyle, dining, leisure & variable subscriptions
              </FLPText>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "var(--colors-status-positive-text)",
              }}
            >
              Safe-to-Spend
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--colors-surface)",
              border: "1px solid var(--colors-border)",
            }}
          >
            <div>
              <FLPText color="text.muted" fontSize="xs">
                Budgeted Limit
              </FLPText>
              <FLPHeading as="h4" size="md" style={{ marginTop: "2px" }}>
                {fmt(cashFlowSplit.flexibleBudget)}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "normal",
                    color: "var(--colors-text-muted)",
                  }}
                >
                  /mo
                </span>
              </FLPHeading>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FLPText color="text.muted" fontSize="xs">
              Weekly Burn Target:
            </FLPText>
            <FLPText color="primary" fontSize="xs" fontWeight="bold">
              {fmt(safeToSpend.weeklyAllowance)} / week
            </FLPText>
          </div>
        </div>
      </div>

      {/* Priority vs. Non-Priority Debt Guardrail Alert (Compact with Progressive Disclosure) */}
      {totals.surplus < 0 && (
        <div
          className={css({
            padding: "14px 18px",
            borderRadius: "lg",
            backgroundColor: { base: "destructive.bg", _dark: "rgba(239, 68, 68, 0.12)" },
            border: "1px solid",
            borderColor: { base: "destructive.border", _dark: "rgba(239, 68, 68, 0.35)" },
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaExclamationTriangle
                size={16}
                style={{ color: "var(--colors-status-danger-text)", flexShrink: 0 }}
              />
              <strong style={{ fontSize: "14px", color: "var(--colors-text-primary, #0f172a)" }}>
                Priority debt check active
              </strong>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "full",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "var(--colors-status-danger-text)",
                }}
              >
                Deficit: -{fmt(totals.surplus)}/mo
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--colors-text-secondary, #475569)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Never skip Priority Bills (Council Tax, Rent/Mortgage, Energy) to pay secondary credit
            cards or personal loans.
          </p>
          <details style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            <summary
              style={{ cursor: "pointer", fontWeight: "600", color: "var(--colors-primary)" }}
            >
              View Free UK Debt Helplines (StepChange, National Debtline)
            </summary>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "12px",
                paddingTop: "8px",
              }}
            >
              <span>Free UK Debt Support:</span>
              <a
                href="https://www.stepchange.org"
                rel="noreferrer"
                style={{ textDecoration: "underline", fontWeight: "bold" }}
                target="_blank"
              >
                StepChange (0800 138 1111)
              </a>
              <span>•</span>
              <a
                href="https://www.nationaldebtline.org"
                rel="noreferrer"
                style={{ textDecoration: "underline", fontWeight: "bold" }}
                target="_blank"
              >
                National Debtline (0808 808 4000)
              </a>
              <span>•</span>
              <a
                href="https://www.citizensadvice.org.uk"
                rel="noreferrer"
                style={{ textDecoration: "underline", fontWeight: "bold" }}
                target="_blank"
              >
                Citizens Advice
              </a>
            </div>
          </details>
        </div>
      )}

      {/* Bill & Subscription Contract Renewal Radar */}
      <div
        className={css({
          padding: "16px 20px",
          borderRadius: "lg",
          backgroundColor:
            cashFlowSplit.billsWithCliffs.length > 0
              ? "rgba(239, 68, 68, 0.06)"
              : "rgba(245, 158, 11, 0.06)",
          border: "1px solid",
          borderColor:
            cashFlowSplit.billsWithCliffs.length > 0
              ? "rgba(239, 68, 68, 0.3)"
              : "rgba(245, 158, 11, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        })}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "18px",
                color:
                  cashFlowSplit.billsWithCliffs.length > 0
                    ? "var(--colors-status-danger-text)"
                    : "#6363f1",
              }}
            >
              {cashFlowSplit.billsWithCliffs.length > 0 ? <FiAlertTriangle /> : <FiCalendar />}
            </span>
            <div>
              <FLPText fontSize="sm" fontWeight="bold">
                Upcoming bill renewals
                {cashFlowSplit.billsWithCliffs.length > 0 && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "#dc2626",
                    }}
                  >
                    {cashFlowSplit.billsWithCliffs.length} renewal deadline
                    {cashFlowSplit.billsWithCliffs.length > 1 ? "s" : ""} within 30 days
                  </span>
                )}
              </FLPText>
              <FLPText color="text.muted" fontSize="xs">
                Review recurring broadband, mobile SIM, and car insurance 30 days before expiration
                to avoid out-of-contract price spikes and redirect savings into debt payoff.
              </FLPText>
            </div>
          </div>
          <FLPButton size="sm" variant="outline" onClick={() => onNavigateToCategory("bills")}>
            Review Bills & Renewals →
          </FLPButton>
        </div>

        {cashFlowSplit.billsWithCliffs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              paddingTop: "4px",
              borderTop: "1px solid rgba(239, 68, 68, 0.15)",
            }}
          >
            {cashFlowSplit.billsWithCliffs.map((bill) => (
              <div
                key={bill.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: "var(--colors-surface)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{bill.name}</span>
                <span style={{ color: "var(--colors-text-muted)" }}>
                  ({fmt(toMonthly(bill))}/mo)
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: (bill.daysUntil ?? 0) <= 0 ? "#dc2626" : "#d97706",
                  }}
                >
                  {(bill.daysUntil ?? 0) <= 0
                    ? `🚨 Expired ${Math.abs(bill.daysUntil ?? 0)}d ago`
                    : `⚠️ Renews in ${bill.daysUntil}d`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart + Category breakdown */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "1fr 1fr" },
          gap: "16px",
        })}
      >
        {/* Pie Chart */}
        <FLPCard>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <FaChartPie style={{ color: "#6363f1" }} />
            <FLPHeading as="h3" size="sm">
              Expense Breakdown
            </FLPHeading>
          </div>
          {pieData.length > 0 ? (
            <div>
              <ChartFigure
                dataTable={
                  <table>
                    <caption>Monthly expenses by category</caption>
                    <thead>
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col">Per month</th>
                        <th scope="col">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((d) => (
                        <tr key={d.cat}>
                          <th scope="row">{d.label}</th>
                          <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(d.total)}</td>
                          <td style={{ fontVariantNumeric: "tabular-nums" }}>
                            {totals.expenses > 0
                              ? Math.round((d.total / totals.expenses) * 100)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                summary={`Monthly expenses total ${fmt(totals.expenses)}. ${pieData
                  .map(
                    (d) =>
                      `${d.label} ${fmt(d.total)} (${totals.expenses > 0 ? Math.round((d.total / totals.expenses) * 100) : 0}%)`,
                  )
                  .join(", ")}.`}
                hideTitle
                title="Expense breakdown by category"
              >
                <div style={{ position: "relative" }}>
                  <ResponsiveContainer height={200} width="100%">
                    <PieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={pieData}
                        dataKey="total"
                        innerRadius={55}
                        nameKey="label"
                        outerRadius={85}
                        paddingAngle={3}
                        isAnimationActive={!reducedMotion}
                      >
                        {pieData.map((d) => (
                          <Cell key={d.cat} fill={d.colour} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--colors-surface)",
                          border: "1px solid var(--colors-border)",
                          borderRadius: "8px",
                          color: "var(--colors-text-primary)",
                        }}
                        formatter={(value: any) => [`${fmt(value)}/mo`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered Donut Hole Metric */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--colors-text-muted)",
                        display: "block",
                        lineHeight: "1.2",
                      }}
                    >
                      Expenses
                    </span>
                    <strong
                      style={{
                        fontSize: "15px",
                        fontWeight: "800",
                        fontFamily: "var(--fonts-mono)",
                        color: "var(--colors-text-primary)",
                        lineHeight: "1.2",
                      }}
                      className="tabular-nums"
                    >
                      {fmt(totals.expenses)}
                    </strong>
                  </div>
                </div>
              </ChartFigure>
              <div
                className={css({
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "8px",
                  justifyContent: "center",
                })}
              >
                {pieData.map((d) => (
                  <div
                    key={d.cat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--colors-text-muted)",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: d.colour,
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      {d.label}{" "}
                      <strong style={{ color: "var(--colors-text-primary)" }}>
                        ({totals.expenses > 0 ? Math.round((d.total / totals.expenses) * 100) : 0}%)
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <FLPText color="text.muted" fontSize="sm">
                No expense data yet
              </FLPText>
            </div>
          )}
        </FLPCard>

        {/* Category cards */}
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            height: "100%",
            justifyContent: "space-between",
          })}
        >
          {categoryTotals.map((ct) => (
            <button
              key={ct.cat}
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderRadius: "md",
                border: "1px solid",
                borderColor: "border",
                backgroundColor: "surface",
                cursor: "pointer",
                transition: "all 0.2s",
                width: "100%",
                flex: 1,
                textAlign: "left",
                _hover: {
                  borderColor: "primary",
                  transform: "translateX(2px)",
                },
              })}
              type="button"
              onClick={() => onNavigateToCategory(ct.cat)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>{ct.icon}</span>
                <div>
                  <FLPText fontSize="sm" fontWeight="semibold">
                    {ct.label}
                  </FLPText>
                  <FLPText color="text.muted" fontSize="xs">
                    {ct.count} item{ct.count !== 1 ? "s" : ""}
                  </FLPText>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FLPText
                  fontWeight="semibold"
                  fontSize="sm"
                  style={{ color: CATEGORY_COLOURS[ct.cat] }}
                >
                  {fmt(ct.total)}/mo
                </FLPText>
                <FaArrowRight style={{ color: "#a1a1aa", fontSize: "12px" }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;

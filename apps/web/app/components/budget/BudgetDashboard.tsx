import { calculateSafeToSpend } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { FaArrowRight, FaBalanceScale, FaChartPie, FaExclamationTriangle } from "react-icons/fa";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
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

const EXPENSE_CATEGORIES: BudgetCategory[] = ["housing", "bills", "expenses", "savings"];

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
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const totals = useMemo(() => {
    const income = entries.filter((e) => e.isIncome).reduce((s, e) => s + toMonthly(e), 0);
    const expenses = entries.filter((e) => !e.isIncome).reduce((s, e) => s + toMonthly(e), 0);
    return { income, expenses, surplus: income - expenses };
  }, [entries]);

  const expenseCategories = useMemo(() => {
    const set = new Set<string>(EXPENSE_CATEGORIES);
    if (customCategories && customCategories.length > 0) {
      customCategories.forEach((c) => {
        const catEntries = entries.filter((e) => e.category === c);
        const isPureIncome = catEntries.length > 0 && catEntries.every((e) => e.isIncome);
        if (!isPureIncome) set.add(c);
      });
    }
    entries.forEach((e) => {
      if (!e.isIncome && e.category) set.add(e.category);
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

    const priorityActual = priorityItems.reduce(
      (s, e) => s + (e.actualMtdGbp !== undefined ? e.actualMtdGbp : toMonthly(e) * 0.92),
      0,
    );
    const flexibleActual = flexibleItems.reduce(
      (s, e) => s + (e.actualMtdGbp !== undefined ? e.actualMtdGbp : toMonthly(e) * 0.78),
      0,
    );

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
      priorityActual,
      flexibleActual,
      billsWithCliffs,
    };
  }, [entries]);

  const cardBase = css({
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: isMobileVariant ? "14px" : "20px",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border",
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
          <FLPHeading as="h2" color="destructive" size="2xl" style={{ marginTop: "4px" }}>
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
            padding: "20px",
            borderRadius: "lg",
            border: "2px solid",
            borderColor: totals.surplus >= 0 ? "success.500" : "destructive",
            backgroundColor: totals.surplus >= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {totals.surplus < 0 && (
              <FaExclamationTriangle style={{ color: "#ef4444", fontSize: "14px" }} />
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
            {totals.surplus >= 0 ? "Available to save or crush debt" : "Spending exceeds income"}
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
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>🛡️</span>
                <FLPHeading as="h3" size="sm">
                  Priority Obligations (Protected)
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
              }}
            >
              Non-negotiable
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
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
            <div>
              <FLPText color="text.muted" fontSize="xs">
                MTD Settled Actuals
              </FLPText>
              <FLPHeading as="h4" size="md" style={{ marginTop: "2px", color: "#6366f1" }}>
                {fmt(cashFlowSplit.priorityActual)}
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
                <span style={{ fontSize: "16px" }}>🎯</span>
                <FLPHeading as="h3" size="sm">
                  Flexible & Discretionary Spend
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
                color: "#10b981",
              }}
            >
              Safe-to-Spend
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
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
            <div>
              <FLPText color="text.muted" fontSize="xs">
                MTD Settled Actuals
              </FLPText>
              <FLPHeading as="h4" size="md" style={{ marginTop: "2px", color: "#10b981" }}>
                {fmt(cashFlowSplit.flexibleActual)}
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
              <FaExclamationTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
              <strong style={{ fontSize: "14px", color: "var(--colors-text-primary, #0f172a)" }}>
                UK FCA Priority Debt Guardrail Active
              </strong>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 8px",
                  borderRadius: "full",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
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
            <span style={{ fontSize: "20px" }}>
              {cashFlowSplit.billsWithCliffs.length > 0 ? "⚠️" : "📡"}
            </span>
            <div>
              <FLPText fontSize="sm" fontWeight="bold">
                Contract Renewal Radar
                {cashFlowSplit.billsWithCliffs.length > 0 && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "#dc2626",
                    }}
                  >
                    {cashFlowSplit.billsWithCliffs.length} Renewal Cliff
                    {cashFlowSplit.billsWithCliffs.length > 1 ? "s" : ""} Within 30 Days
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
                      fontSize: "11px",
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
                    {d.label}
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
        <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
          {categoryTotals.map((ct) => (
            <button
              key={ct.cat}
              className={css({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "md",
                border: "1px solid",
                borderColor: "border",
                backgroundColor: "surface",
                cursor: "pointer",
                transition: "all 0.2s",
                width: "100%",
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

      {/* Insights row */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "1fr 1fr" },
          gap: "16px",
        })}
      >
        {/* Savings comparison */}
        <FLPCard>
          <FLPHeading as="h3" size="sm" style={{ marginBottom: "12px" }}>
            💰 Savings Status
          </FLPHeading>
          <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "md",
                backgroundColor: "background",
                border: "1px solid",
                borderColor: "border",
              })}
            >
              <FLPText fontSize="sm" color="text.muted">
                Current savings pool
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold" style={{ color: "#10b981" }}>
                {fmt(savingsBalance)}
              </FLPText>
            </div>
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "md",
                backgroundColor: "background",
                border: "1px solid",
                borderColor: "border",
              })}
            >
              <FLPText fontSize="sm" color="text.muted">
                Budgeted savings/mo
              </FLPText>
              <FLPText fontSize="sm" fontWeight="bold">
                {fmt(housingSaved)}/mo
              </FLPText>
            </div>
            {savingsBalance > 0 && housingSaved > 0 && (
              <FLPText fontSize="xs" color="text.muted" style={{ lineHeight: "1.5" }}>
                At this rate you'll save an extra <strong>{fmt(housingSaved * 12)}</strong> per
                year.
              </FLPText>
            )}
          </div>
        </FLPCard>

        {/* Condensed Unemployment Runway Card */}
        <FLPCard>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "10px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>⏱️</span>
              <FLPHeading as="h3" size="sm">
                Unemployment Runway
              </FLPHeading>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: runwayStats.status.bg,
                color: runwayStats.status.colour,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{runwayStats.status.emoji}</span>
              {runwayStats.status.label}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "12px",
            }}
          >
            <FLPHeading as="h4" size="xl" style={{ color: runwayStats.status.colour, margin: 0 }}>
              {runwayStats.runwayLabel}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              Burn:{" "}
              <strong style={{ color: "var(--colors-text-primary)" }}>
                {fmt(runwayStats.monthlyBurn)}/mo
              </strong>
            </FLPText>
          </div>

          {/* Condensed Timeline Bar Chart */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                height: "10px",
                borderRadius: "999px",
                backgroundColor: "var(--colors-border)",
                overflow: "hidden",
                position: "relative",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${runwayStats.barPct}%`,
                  backgroundColor: runwayStats.status.colour,
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
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
              <span>0 mo</span>
              <span style={{ color: "#ef4444" }}>3 mo</span>
              <span style={{ color: "#f59e0b" }}>6 mo</span>
              <span style={{ color: "#10b981" }}>12 mo</span>
              <span>24+ mo</span>
            </div>
          </div>

          <FLPButton
            variant="outline"
            size="sm"
            onClick={onNavigateToRunway}
            style={{ width: "100%" }}
          >
            <FaBalanceScale style={{ marginRight: "8px" }} />
            Open Runway Calculator
          </FLPButton>
        </FLPCard>
      </div>
    </div>
  );
};

export default BudgetDashboard;

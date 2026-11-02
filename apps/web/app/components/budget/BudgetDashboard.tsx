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
import { CATEGORY_COLOURS, CATEGORY_ICONS, CATEGORY_LABELS, toMonthly } from "~/types/budget";
import { loadRunwaySettings, type RunwaySavedSettings } from "~/utils/runwayStorage";

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

  const categoryTotals = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      colour: CATEGORY_COLOURS[cat],
      icon: CATEGORY_ICONS[cat],
      total: entries.filter((e) => e.category === cat).reduce((s, e) => s + toMonthly(e), 0),
      count: entries.filter((e) => e.category === cat).length,
    }));
  }, [entries]);

  const pieData = categoryTotals.filter((d) => d.total > 0);

  const housingSaved = entries
    .filter((e) => e.category === "savings")
    .reduce((s, e) => s + toMonthly(e), 0);

  const fmt = (n: number | string | null | undefined) => {
    const val = Number(n);
    if (!Number.isFinite(val)) return formatCurrency(0);
    return formatCurrency(Math.abs(val));
  };

  const surplusColour = totals.surplus >= 0 ? "#10b981" : "#ef4444";

  const runwayStats = useMemo(() => {
    const activeSettings =
      runwaySettings ?? (typeof window !== "undefined" ? loadRunwaySettings() : null);

    let pool = savingsBalance;
    if (activeSettings?.includedAccounts && accounts && accounts.length > 0) {
      pool =
        accounts
          .filter((a) => {
            const t = a.type?.toLowerCase().trim();
            const isLiquid =
              t === "current" ||
              t === "saving" ||
              t === "savings" ||
              t === "investment" ||
              t === "investments";
            if (!isLiquid) return false;
            return activeSettings.includedAccounts[a.id] !== false;
          })
          .reduce((sum, a) => {
            const details = (accountDetails || [])
              .filter((d: any) => (d.account_id || d.accountId) === a.id)
              .sort((x, y) => (x.year !== y.year ? y.year - x.year : y.month - x.month));
            const latestVal = details.length > 0 ? Number(details[0].value) : 0;
            const bal =
              Number.isFinite(latestVal) && latestVal > 0 ? latestVal : Number(a.balance) || 0;
            return sum + bal;
          }, 0) + (activeSettings.severanceLump || 0);
    }

    const nonPrimaryIncome = entries
      .filter((e) => {
        if (!e.isIncome || e.isPrimaryIncome) return false;
        if (activeSettings?.keptIncome) {
          return activeSettings.keptIncome[e.id] !== false;
        }
        return true;
      })
      .reduce((s, e) => s + toMonthly(e), 0);

    const expenses = entries
      .filter((e) => {
        if (e.isIncome) return false;
        if (activeSettings?.keptExpenses) {
          return !!activeSettings.keptExpenses[e.id];
        }
        return e.isEssential;
      })
      .reduce((s, e) => s + toMonthly(e), 0);

    const extraCut = activeSettings?.extraMonthlyCut || 0;
    const monthlyBurn = Math.max(0, expenses - nonPrimaryIncome - extraCut);
    const runwayMonths = monthlyBurn > 0 ? pool / monthlyBurn : Number.POSITIVE_INFINITY;

    const years = Math.floor(runwayMonths / 12);
    const months = Math.floor(runwayMonths % 12);
    const runwayLabel =
      monthlyBurn === 0
        ? "Infinite (No burn)"
        : runwayMonths > 120
          ? `${Math.floor(runwayMonths / 12)}+ years`
          : years > 0
            ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
            : `${Math.floor(runwayMonths)} months`;

    const getStatus = (m: number) => {
      if (m < 3)
        return { colour: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Critical", emoji: "🔴" };
      if (m < 6)
        return { colour: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Caution", emoji: "🟡" };
      if (m < 12)
        return { colour: "#f97316", bg: "rgba(249, 115, 22, 0.1)", label: "Moderate", emoji: "🟠" };
      return { colour: "#10b981", bg: "rgba(16, 185, 129, 0.1)", label: "Healthy", emoji: "🟢" };
    };

    const status = monthlyBurn === 0 ? getStatus(999) : getStatus(runwayMonths);
    const displayMax = 24;
    const barPct = Math.min((runwayMonths / displayMax) * 100, 100);

    return {
      monthlyBurn,
      runwayMonths,
      runwayLabel,
      status,
      barPct,
      displayMax,
      pool,
    };
  }, [entries, savingsBalance, accounts, accountDetails, runwaySettings]);

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
      {/* Top KPI row */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: isMobileVariant ? "1fr" : { base: "1fr", md: "repeat(3, 1fr)" },
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
            across {EXPENSE_CATEGORIES.length} categories
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
            {totals.surplus >= 0 ? "Available to save or invest" : "Spending exceeds income"}
          </FLPText>
        </div>
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

import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { calculateRunwayStats, loadRunwaySettings } from "~/utils/runwayStorage";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface BudgetWidgetConfig {
  showRunway?: boolean;
  primaryMetric?: "surplus" | "savingsRate";
}

export interface BudgetWidgetProps {
  data: {
    monthlyIncome: number;
    annualSalary?: number;
    monthlyExpenses: number;
    monthlySurplus: number;
    savingsRatePct: number;
    runwayMonths: number | null;
    runwayLabel?: string;
    budgetedSavings?: number;
    livingExpenses?: number;
    rawEntries?: any[];
    rawAccounts?: any[];
    rawAccountDetails?: any[];
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: BudgetWidgetConfig;
  onUpdateConfig?: (config: BudgetWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const BudgetWidget: FC<BudgetWidgetProps> = ({
  data,
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
  const showRunway = config.showRunway !== false;
  const primaryMetric = config.primaryMetric || "surplus";

  // With no income or expenses entered, runway cannot be calculated: never show 0 or "No burn".
  const budgetKnown = data.monthlyIncome > 0 || data.monthlyExpenses > 0;

  const runwayDisplay = useMemo(() => {
    if (!budgetKnown) return "Not set";
    if (typeof window !== "undefined" && data.rawEntries && data.rawAccounts) {
      const activeSettings = loadRunwaySettings();
      if (activeSettings) {
        const stats = calculateRunwayStats({
          entries: data.rawEntries,
          accounts: data.rawAccounts,
          accountDetails: data.rawAccountDetails,
          savedSettings: activeSettings,
        });
        return stats.shortLabel;
      }
    }
    if (data.runwayMonths !== null && data.runwayMonths !== undefined) {
      if (!Number.isFinite(data.runwayMonths)) return "No burn";
      if (data.runwayMonths <= 0) return "0 mos";
      if (data.runwayMonths > 120) return `${Math.floor(data.runwayMonths / 12)}+ yrs`;
      const years = Math.floor(data.runwayMonths / 12);
      const months = Math.round((data.runwayMonths % 12) * 10) / 10;
      if (years > 0) {
        return months > 0
          ? `${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`
          : `${years} yr${years !== 1 ? "s" : ""}`;
      }
      return `${Math.round(data.runwayMonths * 10) / 10} mos`;
    }
    if (data.runwayLabel && !data.runwayLabel.toLowerCase().includes("runway")) {
      return data.runwayLabel;
    }
    return "Not set";
  }, [data, budgetKnown]);

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="budget"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Configure how your budget and runway metrics are displayed."
          isOpen={isOpen}
          title="Budget Widget Settings"
          onClose={onClose}
        >
          <div>
            <div
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Primary Highlight Metric
            </div>
            <div className={css({ display: "flex", gap: "8px" })}>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: primaryMetric === "surplus" ? "primary" : "border",
                  backgroundColor: primaryMetric === "surplus" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, primaryMetric: "surplus" })}
              >
                Monthly Surplus
              </button>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: primaryMetric === "savingsRate" ? "primary" : "border",
                  backgroundColor:
                    primaryMetric === "savingsRate" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, primaryMetric: "savingsRate" })}
              >
                Savings Rate %
              </button>
            </div>
          </div>

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            })}
          >
            <div>
              <div className={css({ fontSize: "sm", fontWeight: "semibold" })}>
                Show Emergency Runway
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Estimated months of survival based on essential expenses
              </div>
            </div>
            <button
              type="button"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showRunway ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() => onUpdateConfig?.({ ...config, showRunway: !showRunway })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showRunway ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>
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
        {/* Prominent Monthly Income & Annual Salary Highlight */}
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: "lg",
            backgroundColor: "surface.sunken",
            border: "1px solid",
            borderColor: "border.subtle",
          })}
        >
          <div>
            <FLPText color="text.muted" fontSize="10px" fontWeight="semibold">
              Monthly take-home
            </FLPText>
            <span
              className="tabular-nums"
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--colors-text-primary)",
              }}
            >
              {formatCurrency(data.monthlyIncome)}/mo
            </span>
          </div>
          {Boolean(data.annualSalary && data.annualSalary > 0) && (
            <div style={{ textAlign: "right" }}>
              <FLPText color="text.muted" fontSize="10px" fontWeight="semibold">
                Gross salary
              </FLPText>
              <span
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--colors-text-primary)",
                }}
              >
                {formatCurrency(data.annualSalary as number)}/yr
              </span>
            </div>
          )}
        </div>

        {/* Metric Row */}
        <div
          className={css({
            display: "flex",
            flexDirection: { base: "column", sm: size === "wide" ? "row" : "column", md: "row" },
            justifyContent: "space-between",
            alignItems: {
              base: "flex-start",
              sm: size === "wide" ? "flex-end" : "flex-start",
              md: "flex-end",
            },
            gap: { base: "6px", md: "12px" },
          })}
        >
          <div>
            <FLPText color="text.muted" fontSize="10px" fontWeight="semibold">
              {primaryMetric === "surplus"
                ? data.monthlySurplus >= 0
                  ? "Monthly surplus"
                  : "Monthly deficit"
                : "Savings rate"}
            </FLPText>
            <FLPHeading
              as="h2"
              color={
                primaryMetric === "surplus" && data.monthlySurplus < 0
                  ? "destructive.500"
                  : "text.primary"
              }
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {primaryMetric === "surplus"
                ? `${data.monthlySurplus >= 0 ? "+" : "-"}${formatCurrency(Math.abs(data.monthlySurplus))}/mo`
                : `${data.savingsRatePct}%`}
            </FLPHeading>
            {primaryMetric === "savingsRate" &&
              Boolean(data.budgetedSavings && data.budgetedSavings > 0) && (
                <FLPText color="text.muted" fontSize="10px" style={{ marginTop: "2px" }}>
                  Incl. {formatCurrency(data.budgetedSavings || 0)}/mo budgeted
                </FLPText>
              )}
          </div>

          {showRunway && (
            <div
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: { base: "3px 8px", md: "6px 12px" },
                borderRadius: "md",
                backgroundColor:
                  data.runwayMonths !== undefined && data.runwayMonths < 1
                    ? "rgba(239,68,68,0.1)"
                    : data.runwayMonths !== undefined && data.runwayMonths < 3
                      ? "rgba(245,158,11,0.1)"
                      : "rgba(16,185,129,0.08)",
                border: "1px solid",
                borderColor:
                  data.runwayMonths !== undefined && data.runwayMonths < 1
                    ? "rgba(239,68,68,0.3)"
                    : data.runwayMonths !== undefined && data.runwayMonths < 3
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(16,185,129,0.25)",
              })}
            >
              <FLPText color="text.muted" fontSize="10px" fontWeight="semibold">
                Runway:
              </FLPText>
              <FLPText
                fontWeight="bold"
                style={{
                  color:
                    data.runwayMonths !== undefined && data.runwayMonths < 1
                      ? "var(--colors-destructive-500, #ef4444)"
                      : data.runwayMonths !== undefined && data.runwayMonths < 3
                        ? "#d97706"
                        : "var(--colors-success-500, #10b981)",
                }}
                className={css({ fontSize: { base: "xs", md: "sm" } })}
              >
                {runwayDisplay}
              </FLPText>
            </div>
          )}
        </div>

        {/* Income vs Expenses Bar */}
        <div className={css({ display: "flex", flexDirection: "column", gap: "4px" })}>
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              fontSize: { base: "11px", md: "xs" },
            })}
          >
            <span style={{ color: "var(--colors-status-positive-text)", fontWeight: 600 }}>
              In: {formatCurrency(data.monthlyIncome)}
            </span>
            <span style={{ color: "var(--colors-status-danger-text)", fontWeight: 600 }}>
              {data.budgetedSavings && data.budgetedSavings > 0
                ? `Living: ${formatCurrency(data.livingExpenses ?? data.monthlyExpenses - data.budgetedSavings)}`
                : `Out: ${formatCurrency(data.monthlyExpenses)}`}
            </span>
          </div>
          <div
            className={css({
              height: { base: "6px", md: "8px" },
              borderRadius: "full",
              backgroundColor: "border",
              overflow: "hidden",
              display: "flex",
            })}
          >
            {data.monthlyIncome > 0 &&
              (data.budgetedSavings && data.budgetedSavings > 0 ? (
                <>
                  <div
                    title={`Living Expenses: ${formatCurrency(data.livingExpenses ?? data.monthlyExpenses - data.budgetedSavings)}`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((data.livingExpenses ?? data.monthlyExpenses - data.budgetedSavings) /
                          (data.monthlyIncome || 1)) *
                          100,
                      )}%`,
                      backgroundColor: "#ef4444",
                    }}
                  />
                  <div
                    title={`Budgeted Savings: ${formatCurrency(data.budgetedSavings)}`}
                    style={{
                      width: `${Math.min(
                        100,
                        (data.budgetedSavings / (data.monthlyIncome || 1)) * 100,
                      )}%`,
                      backgroundColor: "#10b981",
                    }}
                  />
                </>
              ) : (
                <div
                  style={{
                    width: `${Math.min(100, (data.monthlyExpenses / (data.monthlyIncome || 1)) * 100)}%`,
                    backgroundColor: data.monthlySurplus >= 0 ? "#10b981" : "#ef4444",
                    borderRadius: "full",
                  }}
                />
              ))}
          </div>
        </div>
      </div>
    </DashboardWidgetCard>
  );
};

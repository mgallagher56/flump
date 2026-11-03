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

  const runwayDisplay = useMemo(() => {
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
    return (
      data.runwayLabel ||
      (data.runwayMonths !== null
        ? data.runwayMonths > 120
          ? `${Math.floor(data.runwayMonths / 12)}+ yrs`
          : `${data.runwayMonths} mos`
        : "Not set")
    );
  }, [data]);

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
            <FLPText
              color="text.muted"
              fontSize="10px"
              fontWeight="semibold"
              textTransform="uppercase"
            >
              {primaryMetric === "surplus"
                ? data.monthlySurplus >= 0
                  ? "Monthly Surplus"
                  : "Monthly Deficit"
                : "Savings Rate"}
            </FLPText>
            <FLPHeading
              as="h2"
              color={
                primaryMetric === "surplus"
                  ? data.monthlySurplus >= 0
                    ? "success.500"
                    : "destructive.500"
                  : data.savingsRatePct > 0
                    ? "success.500"
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
                backgroundColor: "rgba(99,99,241,0.06)",
                border: "1px solid rgba(99,99,241,0.15)",
              })}
            >
              <FLPText
                color="text.muted"
                fontSize="10px"
                fontWeight="bold"
                textTransform="uppercase"
              >
                Runway:
              </FLPText>
              <FLPText
                color="primary"
                fontWeight="bold"
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
            <span style={{ color: "#10b981", fontWeight: 600 }}>
              In: {formatCurrency(data.monthlyIncome)}
            </span>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>
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

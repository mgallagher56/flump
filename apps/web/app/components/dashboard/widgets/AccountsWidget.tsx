import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface AccountsWidgetConfig {
  showAllocationBar?: boolean;
  highlightMetric?: "netWorth" | "assets";
  excludedTypes?: string[];
}

export interface AccountsWidgetProps {
  data: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    accountsCount: number;
    typeTotals: Record<string, number>;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: AccountsWidgetConfig;
  onUpdateConfig?: (config: AccountsWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

const TYPE_COLORS: Record<string, string> = {
  Current: "#6366f1",
  Saving: "#10b981",
  Investment: "#818cf8",
  Pension: "#a78bfa",
  "Credit Card": "#f43f5e",
  Mortgage: "#f59e0b",
  Loan: "#fb7185",
  Owed: "#06b6d4",
};

export const AccountsWidget: FC<AccountsWidgetProps> = ({
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
  const showBar = config.showAllocationBar !== false;
  const highlightMetric = config.highlightMetric || "netWorth";
  const excludedTypes = config.excludedTypes || [];

  const filteredTypeTotals = Object.entries(data.typeTotals || {}).filter(
    ([type]) => !excludedTypes.includes(type),
  );

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="accounts"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Customise what metrics and accounts appear on your accounts widget."
          isOpen={isOpen}
          title="Accounts Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Primary Highlight Metric
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: highlightMetric === "netWorth" ? "primary" : "border",
                  backgroundColor:
                    highlightMetric === "netWorth" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, highlightMetric: "netWorth" })}
              >
                Net Worth
              </button>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: highlightMetric === "assets" ? "primary" : "border",
                  backgroundColor:
                    highlightMetric === "assets" ? "rgba(99,99,241,0.08)" : "surface",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "medium",
                })}
                onClick={() => onUpdateConfig?.({ ...config, highlightMetric: "assets" })}
              >
                Total Assets
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
                Asset Allocation Bar
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Show proportional color bar of account balances
              </div>
            </div>
            <button
              type="button"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showBar ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
                _after: { content: '""', position: "absolute", inset: "-10px 0" },
              })}
              onClick={() => onUpdateConfig?.({ ...config, showAllocationBar: !showBar })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showBar ? "22px" : "2px",
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
        {/* Main Stats Row */}
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
              {highlightMetric === "netWorth" ? "Total Net Worth" : "Total Assets"}
            </FLPText>
            <FLPHeading
              as="h2"
              color={
                highlightMetric === "netWorth" && data.netWorth < 0
                  ? "destructive.500"
                  : "text.primary"
              }
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {formatCurrency(highlightMetric === "netWorth" ? data.netWorth : data.totalAssets)}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              {data.accountsCount} active {data.accountsCount === 1 ? "account" : "accounts"}
            </FLPText>
            <div
              className={css({
                display: "flex",
                gap: "6px",
                fontSize: { base: "11px", md: "xs" },
                mt: "2px",
              })}
            >
              <span style={{ color: "var(--colors-status-positive-text)", fontWeight: 600 }}>
                +{formatCurrency(data.totalAssets)}
              </span>
              <span style={{ color: "var(--colors-status-danger-text)", fontWeight: 600 }}>
                -{formatCurrency(data.totalLiabilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        {showBar && data.totalAssets > 0 && (
          <div
            className={css({
              display: "flex",
              height: { base: "6px", md: "8px" },
              borderRadius: "full",
              overflow: "hidden",
              backgroundColor: "border",
            })}
          >
            {filteredTypeTotals.map(([type, val]) => {
              const pct = (val / data.totalAssets) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={type}
                  title={`${type}: ${formatCurrency(val)} (${pct.toFixed(0)}%)`}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: TYPE_COLORS[type] || "#a1a1aa",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Breakdown chips */}
        <div
          className={css({ display: "flex", flexWrap: "wrap", gap: { base: "4px", md: "6px" } })}
        >
          {filteredTypeTotals.slice(0, size === "wide" ? 6 : 2).map(([type, val]) => (
            <div
              key={type}
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: { base: "2px 6px", md: "4px 8px" },
                borderRadius: "md",
                backgroundColor: "background",
                border: "1px solid",
                borderColor: "border",
                fontSize: { base: "10px", md: "xs" },
              })}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: TYPE_COLORS[type] || "#888",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--colors-text-muted)" }}>{type}:</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(val)}</span>
            </div>
          ))}
          {filteredTypeTotals.length > (size === "wide" ? 6 : 2) && (
            <div
              className={css({
                display: "inline-flex",
                alignItems: "center",
                padding: { base: "2px 6px", md: "4px 8px" },
                borderRadius: "md",
                backgroundColor: "surface",
                border: "1px solid",
                borderColor: "border",
                fontSize: { base: "10px", md: "xs" },
                color: "text.muted",
              })}
            >
              +{filteredTypeTotals.length - (size === "wide" ? 6 : 2)} more
            </div>
          )}
        </div>
      </div>
    </DashboardWidgetCard>
  );
};

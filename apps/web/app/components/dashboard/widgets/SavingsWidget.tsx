import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface SavingsWidgetConfig {
  horizonYears?: 1 | 3 | 5;
  showCompoundReturn?: boolean;
}

export interface SavingsWidgetProps {
  data: {
    totalSavingsBalance: number;
    totalMonthlyContributions: number;
    weightedInterestRate: number;
    accountsCount: number;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: SavingsWidgetConfig;
  onUpdateConfig?: (config: SavingsWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const SavingsWidget: FC<SavingsWidgetProps> = ({
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
  const horizonYears = config.horizonYears || 1;
  const showReturn = config.showCompoundReturn !== false;

  // Simple compound interest calculation:
  // FV = P*(1+r/12)^(12*y) + PMT * [((1+r/12)^(12*y) - 1) / (r/12)]
  const r = (data.weightedInterestRate || 5.0) / 100 / 12;
  const n = horizonYears * 12;
  const p = data.totalSavingsBalance;
  const pmt = data.totalMonthlyContributions;

  let projectedTotal = p;
  if (r > 0) {
    projectedTotal = p * (1 + r) ** n + pmt * (((1 + r) ** n - 1) / r);
  } else {
    projectedTotal = p + pmt * n;
  }
  const interestEarned = Math.max(0, projectedTotal - p - pmt * n);

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="savings"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Adjust savings projection horizons and compound interest estimates."
          isOpen={isOpen}
          title="Savings Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Projection Horizon
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {([1, 3, 5] as const).map((years) => (
                <button
                  key={years}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: horizonYears === years ? "primary" : "border",
                    backgroundColor: horizonYears === years ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, horizonYears: years })}
                >
                  {years} {years === 1 ? "Year" : "Years"}
                </button>
              ))}
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
                Show estimated interest
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Display projected interest earned at current AER
              </div>
            </div>
            <button
              type="button"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showReturn ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() => onUpdateConfig?.({ ...config, showCompoundReturn: !showReturn })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showReturn ? "22px" : "2px",
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
              Total Savings & Investments
            </FLPText>
            <FLPHeading
              as="h2"
              color="success.500"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {formatCurrency(data.totalSavingsBalance)}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              Avg AER:{" "}
              <strong style={{ color: "var(--colors-text-primary)" }}>
                {data.weightedInterestRate.toFixed(2)}%
              </strong>
            </FLPText>
            <FLPText color="text.muted" fontSize="10px" style={{ marginTop: "1px" }}>
              Saving:{" "}
              <strong style={{ color: "#10b981" }}>
                +{formatCurrency(data.totalMonthlyContributions)}/mo
              </strong>
            </FLPText>
          </div>
        </div>

        {/* Projection callout */}
        {showReturn && (
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { base: "6px 10px", md: "10px 14px" },
              borderRadius: "lg",
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              gap: "8px",
            })}
          >
            <div>
              <div
                className={css({
                  fontSize: { base: "10px", md: "xs" },
                  fontWeight: "semibold",
                  color: "success.500",
                })}
              >
                {horizonYears}yr Forecast
              </div>
              <div className={css({ fontSize: "10px", color: "text.muted" })}>
                +{formatCurrency(interestEarned)} interest
              </div>
            </div>
            <div
              className={css({
                fontSize: { base: "sm", md: "md" },
                fontWeight: "bold",
                color: "text.primary",
              })}
            >
              {formatCurrency(projectedTotal)}
            </div>
          </div>
        )}
      </div>
    </DashboardWidgetCard>
  );
};

import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

const DEFAULT_RATES_LABEL = "Default: auto-enrolment minimum. Change in Profile";

export interface PensionWidgetConfig {
  targetRetirementAge?: number;
  showSalarySacrificeBadge?: boolean;
}

export interface PensionWidgetProps {
  data: {
    totalPensionBalance: number;
    potsCount: number;
    employeePercent: number | null;
    employerPercent: number | null;
    isSalarySacrifice: boolean | null;
    monthlyContributionEst: number | null;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: PensionWidgetConfig;
  onUpdateConfig?: (config: PensionWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const PensionWidget: FC<PensionWidgetProps> = ({
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
  const targetAge = config.targetRetirementAge || 65;
  const showBadge = config.showSalarySacrificeBadge !== false;
  const ratesKnown = data.employeePercent != null && data.employerPercent != null;
  const ratesAreDefault = data.employeePercent === 5 && data.employerPercent === 3;
  const totalPercent = (data.employeePercent ?? 0) + (data.employerPercent ?? 0);

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="pension"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Configure retirement age milestones and contribution displays."
          isOpen={isOpen}
          title="Pension Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Target Retirement Age
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {[58, 60, 65, 68].map((age) => (
                <button
                  key={age}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: targetAge === age ? "primary" : "border",
                    backgroundColor: targetAge === age ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, targetRetirementAge: age })}
                >
                  Age {age}
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
                Show Salary Sacrifice Tag
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Indicates whether workplace pension uses pre-tax sacrifice
              </div>
            </div>
            <button
              type="button"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showBadge ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() => onUpdateConfig?.({ ...config, showSalarySacrificeBadge: !showBadge })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showBadge ? "22px" : "2px",
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
              Total Pension Value
            </FLPText>
            <FLPHeading
              as="h2"
              color="text.primary"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {formatCurrency(data.totalPensionBalance)}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              {data.potsCount} {data.potsCount === 1 ? "pot" : "pots"} tracked
            </FLPText>
            {ratesKnown && (
              <div
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  mt: "2px",
                })}
              >
                <span
                  className={css({
                    fontSize: "10px",
                    fontWeight: "semibold",
                    padding: "2px 6px",
                    borderRadius: "full",
                    backgroundColor: "surface.sunken",
                    border: "1px solid",
                    borderColor: "border.subtle",
                    color: "text.primary",
                    fontVariantNumeric: "tabular-nums",
                  })}
                >
                  {totalPercent}% total contribution
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { base: "6px 10px", md: "10px 14px" },
            borderRadius: "lg",
            backgroundColor: "surface.sunken",
            border: "1px solid",
            borderColor: "border.subtle",
            fontSize: { base: "10px", md: "xs" },
            gap: "6px",
          })}
        >
          {ratesKnown ? (
            <div className={css({ fontVariantNumeric: "tabular-nums" })}>
              <span className={css({ color: "text.muted" })}>Rates: </span>
              <strong>{data.employeePercent}%</strong> + <strong>{data.employerPercent}%</strong>
              {ratesAreDefault && (
                <span className={css({ color: "text.muted", display: "block", fontSize: "10px" })}>
                  {DEFAULT_RATES_LABEL}
                </span>
              )}
            </div>
          ) : (
            <div className={css({ color: "text.muted" })}>Contribution rates not set</div>
          )}
          {showBadge && data.isSalarySacrifice !== null && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: data.isSalarySacrifice ? "#10b981" : "var(--colors-text-muted)",
              }}
            >
              {data.isSalarySacrifice ? "Sal Sacrifice" : "Net Pay"}
            </span>
          )}
        </div>
      </div>
    </DashboardWidgetCard>
  );
};

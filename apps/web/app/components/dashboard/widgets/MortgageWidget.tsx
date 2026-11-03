import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { DashboardWidgetCard } from "../DashboardWidgetCard";
import { WidgetSettingsModal } from "../WidgetSettingsModal";

export interface MortgageWidgetConfig {
  overpaymentAmount?: number;
  showMonthlyPayment?: boolean;
  mortgageType?: "repayment" | "interest-only";
}

export interface MortgageWidgetProps {
  data: {
    mortgageBalance: number;
    interestRate: number;
    remainingTermYears: number;
    hasMortgageAccount: boolean;
  };
  editMode: boolean;
  size: "normal" | "wide";
  config?: MortgageWidgetConfig;
  onUpdateConfig?: (config: MortgageWidgetConfig) => void;
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
}

export const MortgageWidget: FC<MortgageWidgetProps> = ({
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
  const overpayment = config.overpaymentAmount ?? 200;
  const showPayment = config.showMonthlyPayment !== false;
  const isInterestOnly = config.mortgageType === "interest-only";

  // Monthly mortgage calculation:
  // Repayment: M = P * [ i(1 + i)^n ] / [ (1 + i)^n – 1]
  // Interest Only: M = P * i
  const p = Math.abs(data.mortgageBalance);
  const i = (data.interestRate || 4.5) / 100 / 12;
  const n = (data.remainingTermYears || 25) * 12;
  let monthlyPayment = 0;
  if (i > 0 && n > 0 && p > 0) {
    if (isInterestOnly) {
      monthlyPayment = p * i;
    } else {
      monthlyPayment = (p * (i * (1 + i) ** n)) / ((1 + i) ** n - 1);
    }
  }

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="mortgage"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
      renderSettings={(isOpen, onClose) => (
        <WidgetSettingsModal
          description="Customize mortgage calculation and overpayment simulation defaults."
          isOpen={isOpen}
          title="Mortgage Widget Settings"
          onClose={onClose}
        >
          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Mortgage Repayment Type
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: !isInterestOnly ? "primary" : "border",
                  backgroundColor: !isInterestOnly ? "rgba(99,99,241,0.08)" : "surface",
                  color: !isInterestOnly ? "primary" : "text.primary",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "semibold",
                })}
                onClick={() => onUpdateConfig?.({ ...config, mortgageType: "repayment" })}
              >
                Repayment
              </button>
              <button
                type="button"
                className={css({
                  flex: 1,
                  padding: "8px",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: isInterestOnly ? "primary" : "border",
                  backgroundColor: isInterestOnly ? "rgba(99,99,241,0.08)" : "surface",
                  color: isInterestOnly ? "primary" : "text.primary",
                  cursor: "pointer",
                  fontSize: "xs",
                  fontWeight: "semibold",
                })}
                onClick={() => onUpdateConfig?.({ ...config, mortgageType: "interest-only" })}
              >
                Interest Only
              </button>
            </div>
          </div>

          <div>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", display: "block", mb: 2 })}
            >
              Default Overpayment Simulation
            </span>
            <div className={css({ display: "flex", gap: "8px" })}>
              {[100, 200, 300, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={css({
                    flex: 1,
                    padding: "8px",
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: overpayment === amt ? "primary" : "border",
                    backgroundColor: overpayment === amt ? "rgba(99,99,241,0.08)" : "surface",
                    cursor: "pointer",
                    fontSize: "xs",
                    fontWeight: "medium",
                  })}
                  onClick={() => onUpdateConfig?.({ ...config, overpaymentAmount: amt })}
                >
                  +{formatCurrency(amt)}
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
                Show Estimated Monthly Payment
              </div>
              <div className={css({ fontSize: "xs", color: "text.muted" })}>
                Standard repayment based on term & rate
              </div>
            </div>
            <button
              type="button"
              className={css({
                width: "44px",
                height: "24px",
                borderRadius: "full",
                backgroundColor: showPayment ? "primary" : "border",
                border: "none",
                cursor: "pointer",
                position: "relative",
              })}
              onClick={() => onUpdateConfig?.({ ...config, showMonthlyPayment: !showPayment })}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: showPayment ? "22px" : "2px",
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
              Remaining Mortgage
            </FLPText>
            <FLPHeading
              as="h2"
              color="warning.500"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
              })}
            >
              {p > 0 ? formatCurrency(p) : "No Mortgage"}
            </FLPHeading>
          </div>
          <div
            className={css({
              textAlign: { base: "left", sm: size === "wide" ? "right" : "left", md: "right" },
            })}
          >
            <FLPText color="text.muted" fontSize="10px">
              Rate: <strong>{data.interestRate.toFixed(2)}%</strong>
            </FLPText>
            <FLPText color="text.muted" fontSize="10px" style={{ marginTop: "1px" }}>
              Term: <strong>{data.remainingTermYears} yrs</strong>
            </FLPText>
          </div>
        </div>

        {showPayment && p > 0 && (
          <div
            className={css({
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: { base: "6px 10px", md: "10px 14px" },
              borderRadius: "lg",
              backgroundColor: "rgba(245, 158, 11, 0.05)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              fontSize: { base: "10px", md: "xs" },
              gap: "6px",
            })}
          >
            <div>
              <span style={{ color: "var(--colors-text-muted)" }}>
                {isInterestOnly ? "Payment (IO):" : "Monthly:"}
              </span>{" "}
              <strong>{formatCurrency(monthlyPayment)}/mo</strong>
            </div>
            <div style={{ color: "var(--colors-primary)", fontWeight: 600 }}>
              +{formatCurrency(overpayment)} →
            </div>
          </div>
        )}
      </div>
    </DashboardWidgetCard>
  );
};

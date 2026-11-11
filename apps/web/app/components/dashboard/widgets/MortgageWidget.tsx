import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { Link } from "react-router";
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
    interestRate: number | null;
    remainingTermYears: number | null;
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

const tabularStyle = css({ fontVariantNumeric: "tabular-nums" });

const promptLinkStyle = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
});

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
  // Never assume a rate or term: without both, no payment is calculated.
  const termKnown = data.interestRate != null && data.remainingTermYears != null;
  const i = (data.interestRate ?? 0) / 100 / 12;
  const n = (data.remainingTermYears ?? 0) * 12;
  let monthlyPayment = 0;
  if (termKnown && i > 0 && n > 0 && p > 0) {
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
              color="text.primary"
              className={css({
                fontSize: { base: "lg", sm: "xl", md: "2xl" },
                lineHeight: "tight",
                fontVariantNumeric: "tabular-nums",
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
            {data.interestRate != null && (
              <FLPText color="text.muted" fontSize="10px" className={tabularStyle}>
                Rate: <strong>{data.interestRate.toFixed(2)}%</strong>
              </FLPText>
            )}
            {data.remainingTermYears != null && (
              <FLPText
                color="text.muted"
                fontSize="10px"
                className={tabularStyle}
                style={{ marginTop: "1px" }}
              >
                Term: <strong>{data.remainingTermYears} yrs</strong>
              </FLPText>
            )}
          </div>
        </div>

        {p > 0 && !termKnown && (
          <FLPText color="text.muted" fontSize="xs">
            <Link className={promptLinkStyle} to="/app/mortgage">
              Add your rate and term on Mortgage
            </Link>
          </FLPText>
        )}

        {showPayment && p > 0 && termKnown && (
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
            <div>
              <span style={{ color: "var(--colors-text-muted)" }}>
                {isInterestOnly ? "Payment (IO):" : "Monthly:"}
              </span>{" "}
              <strong className={tabularStyle}>{formatCurrency(monthlyPayment)}/mo</strong>
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

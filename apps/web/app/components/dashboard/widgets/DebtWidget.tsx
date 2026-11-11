import { EmptyState } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCalendarCheck, FaFire } from "react-icons/fa";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { DebtSummary } from "~/utils/debtSummary";
import { DashboardWidgetCard } from "../DashboardWidgetCard";

export interface DebtWidgetProps {
  editMode: boolean;
  size: "normal" | "wide";
  onToggleSize: () => void;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragProps?: any;
  config?: any;
  data?: DebtSummary | null;
}

const contentStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px",
});

const statsGridStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
});

const statBoxStyle = css({
  padding: "12px",
  backgroundColor: "surface.subtle",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

const tabularStyle = css({ fontVariantNumeric: "tabular-nums" });

const headerRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

const highAprBadgeStyle = css({
  padding: "3px 8px",
  borderRadius: "full",
  fontSize: "11px",
  fontWeight: "semibold",
  backgroundColor: "status.danger.bg",
  color: "status.danger.text",
  border: "1px solid",
  borderColor: "status.danger.border",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontVariantNumeric: "tabular-nums",
});

const statLabelRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "text.muted",
});

const footerStyle = css({ paddingTop: "4px" });

export const DebtWidget: FC<DebtWidgetProps> = ({
  editMode,
  size,
  onToggleSize,
  onHide,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragProps,
  config: _config = {},
  data = null,
}) => {
  const { formatCurrency } = useFormatCurrency();

  return (
    <DashboardWidgetCard
      dragProps={dragProps}
      editMode={editMode}
      isFirst={isFirst}
      isLast={isLast}
      size={size}
      widgetKey="debt"
      onHide={onHide}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onToggleSize={onToggleSize}
    >
      <div className={contentStyle}>
        {data ? (
          <>
            <div className={headerRowStyle}>
              <div>
                <FLPText color="text.muted" fontSize="xs">
                  Total unsecured debt
                </FLPText>
                <FLPHeading as="h3" color="text.primary" size="2xl">
                  <span className={tabularStyle}>{formatCurrency(data.totalDebt)}</span>
                </FLPHeading>
              </div>
              {data.highInterestCount > 0 ? (
                <span className={highAprBadgeStyle}>
                  <FaFire size={11} /> {data.highInterestCount} high APR{" "}
                  {data.highInterestCount === 1 ? "account" : "accounts"}
                </span>
              ) : null}
            </div>

            <div className={statsGridStyle}>
              <div className={statBoxStyle}>
                <div className={statLabelRowStyle}>
                  <FaCalendarCheck size={14} />
                  <FLPText color="text.muted" fontSize="xs">
                    Debt-free date
                  </FLPText>
                </div>
                <FLPText className={tabularStyle} fontSize="sm" fontWeight="bold">
                  {data.debtFreeDate ?? "Not calculated"}
                </FLPText>
              </div>

              <div className={statBoxStyle}>
                <FLPText color="text.muted" fontSize="xs">
                  {data.debts.some((d) => d.minimumPaymentEstimated)
                    ? "Monthly minimums (estimated)"
                    : "Monthly minimums"}
                </FLPText>
                <FLPText className={tabularStyle} fontSize="sm" fontWeight="bold">
                  {formatCurrency(data.monthlyMinimumTotal)}
                </FLPText>
              </div>
            </div>

            <div className={footerStyle}>
              <FLPText color="text.muted" fontSize="xs">
                Debt-free date assumes minimum payments only.
              </FLPText>
            </div>
          </>
        ) : (
          <EmptyState
            description="Add a credit card, loan or overdraft on Accounts to see your payoff date."
            headingLevel="h3"
            id="debt-widget-empty"
            title="No debts added"
          />
        )}
      </div>
    </DashboardWidgetCard>
  );
};

export default DebtWidget;

import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCalendarCheck, FaFire, FaPiggyBank } from "react-icons/fa";
import { Link } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
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
  data?: any;
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
  backgroundColor: "surface",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

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
  data = {},
}) => {
  const { formatCurrency } = useFormatCurrency();

  const totalDebt = data.totalDebt || 4650;
  const debtFreeDate = data.debtFreeDate || "August 2026";
  const interestSaved = data.interestSaved || 840;
  const highInterestAccounts = data.highInterestCount || 2;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <FLPText color="text.muted" fontSize="xs">
              Total Unsecured Debt
            </FLPText>
            <FLPHeading as="h3" color="red.600" size="2xl">
              {formatCurrency(totalDebt)}
            </FLPHeading>
          </div>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "full",
              fontSize: "11px",
              fontWeight: "bold",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaFire size={11} /> {highInterestAccounts} High APR Accounts
          </span>
        </div>

        <div className={statsGridStyle}>
          <div className={statBoxStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981" }}>
              <FaCalendarCheck size={14} />
              <FLPText color="text.muted" fontSize="xs">
                Debt-Free Date
              </FLPText>
            </div>
            <FLPText fontSize="sm" fontWeight="bold">
              {debtFreeDate}
            </FLPText>
          </div>

          <div className={statBoxStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6363f1" }}>
              <FaPiggyBank size={14} />
              <FLPText color="text.muted" fontSize="xs">
                Interest Saved
              </FLPText>
            </div>
            <FLPText fontSize="sm" fontWeight="bold">
              {formatCurrency(interestSaved)}
            </FLPText>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "4px",
          }}
        >
          <FLPText color="text.muted" fontSize="xs">
            ⚡ Avalanche payoff active (+£50/mo surplus)
          </FLPText>
          <Link to="/app/debt">
            <FLPButton size="sm" variant="outline">
              Open debt payoff →
            </FLPButton>
          </Link>
        </div>
      </div>
    </DashboardWidgetCard>
  );
};

export default DebtWidget;

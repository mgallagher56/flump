import { Button } from "@repo/ui";
import { css, cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { promoCliffContainer } from "./PromoCliffTracker.styles";

export interface PromoCliffAlert {
  debtId: string;
  debtName: string;
  promoExpiryDate: string;
  projectedBalanceAtExpiryGbp: number;
  revertApr: number;
  requiredMonthlyToClearBeforeCliff: number;
}

export interface PromoCliffTrackerProps {
  alerts: PromoCliffAlert[];
  onAllocateSurplus?: (amount: number) => void;
  className?: string;
}

export const PromoCliffTracker: FC<PromoCliffTrackerProps> = ({
  alerts,
  onAllocateSurplus,
  className,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className={cx(promoCliffContainer(), className)} data-testid="promo-cliff-tracker">
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <FaExclamationTriangle className={css({ color: "status.danger.solid" })} size={16} />
        <h4
          className={css({
            fontFamily: "display",
            fontSize: "xs",
            fontWeight: "bold",
            color: "status.danger.text",
            margin: "0",
          })}
        >
          0% Promotional Balance Expiry Warning
        </h4>
      </div>

      {alerts.map((alert) => (
        <div
          key={alert.debtId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <p
            className={css({
              fontSize: "xs",
              color: "text.primary",
              margin: "0",
            })}
          >
            <strong>{alert.debtName}</strong> promotional 0% APR expires on{" "}
            <strong className={css({ fontVariantNumeric: "tabular-nums" })}>
              {alert.promoExpiryDate}
            </strong>
            . At current repayment rates,{" "}
            <span
              className={css({
                fontVariantNumeric: "tabular-nums",
                fontWeight: "semibold",
              })}
            >
              £{alert.projectedBalanceAtExpiryGbp.toLocaleString("en-GB")}
            </span>{" "}
            will revert to{" "}
            <strong className={css({ fontVariantNumeric: "tabular-nums" })}>
              {alert.revertApr}% APR
            </strong>
            .
          </p>

          {onAllocateSurplus && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAllocateSurplus(alert.requiredMonthlyToClearBeforeCliff)}
            >
              Allocate{" "}
              <span className={css({ fontVariantNumeric: "tabular-nums" })}>
                £{alert.requiredMonthlyToClearBeforeCliff.toLocaleString("en-GB")}
              </span>
              /mo to Clear
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PromoCliffTracker;

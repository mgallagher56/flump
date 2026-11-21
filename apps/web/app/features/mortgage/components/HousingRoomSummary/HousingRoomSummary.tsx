import { type Figure, type HousingRoom, isFigureKnown } from "@flump/finance-engine";
import { Button, Switch } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  factLabel,
  factRow,
  factValue,
  missingActions,
  summaryCard,
  summaryHeader,
  summarySubtitle,
  summaryTitle,
  toggleAmount,
  toggleList,
  toggleRow,
} from "./HousingRoomSummary.styles";

export interface HousingRoomSummaryProps {
  housingRoom: Figure<HousingRoom>;
  includeSavings: boolean;
  includeOtherSpending: boolean;
  onIncludeSavingsChange: (next: boolean) => void;
  onIncludeOtherSpendingChange: (next: boolean) => void;
  onNavigate?: (to: string) => void;
}

function housingLabel(kind: HousingRoom["currentHousingKind"]): string {
  switch (kind) {
    case "rent":
      return "Current rent";
    case "mortgage":
      return "Current mortgage payment";
    default:
      return "Current housing payment";
  }
}

/**
 * Displays the user's saved budget toggles (planned savings, other spending) and current
 * housing payment as plain facts beside "Left each month before housing" (E39 section 4b).
 */
export const HousingRoomSummary: FC<HousingRoomSummaryProps> = ({
  housingRoom,
  includeSavings,
  includeOtherSpending,
  onIncludeSavingsChange,
  onIncludeOtherSpendingChange,
  onNavigate,
}) => {
  const { formatCurrency } = useFormatCurrency();

  if (!isFigureKnown(housingRoom)) {
    return (
      <section aria-labelledby="housing-room-heading" className={summaryCard()}>
        <div className={summaryHeader}>
          <h2 className={summaryTitle} id="housing-room-heading">
            Your details
          </h2>
          <p className={summarySubtitle}>
            Add your salary in Settings and your essentials in Budget to see what your figures leave
            each month before housing.
          </p>
        </div>
        {onNavigate ? (
          <div className={missingActions}>
            <Button size="sm" variant="outline" onClick={() => onNavigate("/app/profile")}>
              Open Settings
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("/app/budget")}>
              Open Budget
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  const room = housingRoom.value;

  return (
    <section aria-labelledby="housing-room-heading" className={summaryCard()}>
      <div className={summaryHeader}>
        <h2 className={summaryTitle} id="housing-room-heading">
          Your details
        </h2>
        <p className={summarySubtitle}>
          Choose whether to subtract your planned savings or other spending from the figure above.
        </p>
      </div>

      <div className={toggleList}>
        <div className={toggleRow}>
          <Switch
            checked={includeSavings}
            label="Subtract planned savings"
            onChange={(e) => onIncludeSavingsChange(e.target.checked)}
          />
          <span
            className={toggleAmount}
            data-testid="planned-savings-amount"
            id="planned-savings-amount"
          >
            {formatCurrency(room.plannedSavings)} a month
          </span>
        </div>

        <div className={toggleRow}>
          <Switch
            checked={includeOtherSpending}
            label="Subtract other spending"
            onChange={(e) => onIncludeOtherSpendingChange(e.target.checked)}
          />
          <span
            className={toggleAmount}
            data-testid="other-spending-amount"
            id="other-spending-amount"
          >
            {formatCurrency(room.otherSpending)} a month
          </span>
        </div>
      </div>

      {room.currentHousingMonthly !== null ? (
        <div className={factRow} data-testid="current-housing-fact" id="current-housing-fact">
          <span className={factLabel}>{housingLabel(room.currentHousingKind)}</span>
          <span className={factValue}>
            {formatCurrency(room.currentHousingMonthly)} a month
            {room.currentHousingEstimated ? " (estimate)" : ""}
          </span>
        </div>
      ) : null}
    </section>
  );
};

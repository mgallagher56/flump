import { Button } from "@repo/ui";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { duplicateDebtNotice } from "./DuplicateDebtNotice.styles";

export interface DuplicateDebtNoticeProps {
  /** The budget entry that looks like the debt's payment. */
  rowName: string;
  debtAccountName: string;
  /** Pounds a month: the entry's amount, equal to the debt's saved minimum payment. */
  monthlyAmount: number;
  /** Moves the entry to the "debt" category. Rejects when the save failed; the page says why. */
  onMove: () => Promise<void>;
  /** Keeps the entry where it is and stops asking about it. */
  onKeep: () => void;
}

/**
 * One quiet note on a budget entry that may be the same payment as a saved debt's minimum, so it
 * would be counted twice. It asks; nothing changes unless the person moves the entry.
 */
export const DuplicateDebtNotice: FC<DuplicateDebtNoticeProps> = ({
  rowName,
  debtAccountName,
  monthlyAmount,
  onMove,
  onKeep,
}) => {
  const slots = duplicateDebtNotice();
  const { formatCurrency } = useFormatCurrency();
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    setMoving(true);
    try {
      await onMove();
    } catch {
      // The page shows what went wrong; the note stays so it can be tried again.
    } finally {
      setMoving(false);
    }
  };

  return (
    <div aria-label={`About ${rowName}`} className={slots.root} role="note">
      <p className={slots.entry}>{rowName}</p>
      <p className={slots.text}>
        This looks like your {debtAccountName} payment of{" "}
        <span className={slots.amount}>
          {formatCurrency(monthlyAmount, { maximumFractionDigits: 0 })}
        </span>{" "}
        a month, which is already counted with your debts.
      </p>
      <p className={slots.text}>Move it to debts so it is counted once?</p>
      <div className={slots.actions}>
        <Button pending={moving} size="sm" variant="outline" onClick={handleMove}>
          Move to debts
        </Button>
        <Button disabled={moving} size="sm" variant="ghost" onClick={onKeep}>
          Keep it here
        </Button>
      </div>
    </div>
  );
};

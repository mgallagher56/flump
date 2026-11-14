import type { DebtItem } from "@flump/finance-engine";
import { CollapsibleDrawer, Icon, IconButton } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Pencil } from "lucide-react";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { AddDebtDialog } from "../AddDebtDialog";
import {
  balanceFigure,
  drawerWrap,
  listCard,
  listHeading,
  listReset,
  listSubtitle,
  rowDetail,
  rowFigures,
  rowItem,
  rowMain,
  rowName,
} from "./DebtAccountsList.styles";

export interface DebtAccountsListProps {
  debts: DebtItem[];
  /** Called from the edit dialog's "Delete debt" action; the page confirms before deleting. */
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, updates: Partial<DebtItem>) => void;
  /**
   * The debt whose edit form is open. Pass with `onEditingIdChange` to open it from elsewhere on
   * the page (the "Add a rate" prompt); leave both out and the list manages it.
   */
  editingId?: string | null;
  onEditingIdChange?: (id: string | null) => void;
  className?: string;
}

/** Law 3: a list over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const TYPE_LABELS: Record<string, string> = {
  credit_card: "Credit card",
  loan: "Personal loan",
  overdraft: "Overdraft",
  bnpl: "Buy now, pay later",
  car_finance: "Car finance or HP",
  other: "Other",
};

const typeLabel = (type: DebtItem["type"] | undefined): string =>
  (type && TYPE_LABELS[type]) || "Other";

/**
 * "Your debts" (E16 PR 6, R2-7): one figure per row, the balance owed (always shown as a positive
 * amount, though liabilities are stored negative). The row detail is the type label, plus "Rate
 * not added" as a prompt when the APR is missing. The rate and minimum payment are seen and
 * changed in the edit dialog, which also holds delete: one edit control per row. Rows are marked
 * `data-list-row`: the user's own list is budgeted per row (P1.4).
 */
export const DebtAccountsList: FC<DebtAccountsListProps> = ({
  debts,
  onDeleteDebt,
  onUpdateDebt,
  editingId: controlledEditingId,
  onEditingIdChange,
  className,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [ownEditingId, setOwnEditingId] = useState<string | null>(null);
  const editingId = controlledEditingId !== undefined ? controlledEditingId : ownEditingId;
  const setEditingId = (id: string | null) => {
    setOwnEditingId(id);
    onEditingIdChange?.(id);
  };
  const editingDebt = debts.find((d) => d.id === editingId);

  const renderRows = (rows: DebtItem[], label: string) => (
    <ul aria-label={label} className={listReset}>
      {rows.map((debt) => (
        <li className={rowItem} data-list-row="" key={debt.id}>
          <div className={rowMain}>
            <span className={rowName}>{debt.name}</span>
            <span className={rowDetail}>
              {typeLabel(debt.type)}
              {debt.aprKnown === false ? (
                <>
                  {" · "}
                  <span>Rate not added</span>
                </>
              ) : null}
            </span>
          </div>
          <div className={rowFigures}>
            <span className={balanceFigure}>{formatCurrency(Math.abs(debt.balance ?? 0))}</span>
            <IconButton
              data-debt-edit={debt.id}
              label={`Edit ${debt.name}`}
              size="md"
              type="button"
              onClick={() => setEditingId(debt.id)}
            >
              <Icon icon={Pencil} size="sm" />
            </IconButton>
          </div>
        </li>
      ))}
    </ul>
  );

  const visible = debts.slice(0, VISIBLE_ROWS);
  const rest = debts.slice(VISIBLE_ROWS);

  return (
    <section aria-labelledby="debt-accounts-heading" className={cx(listCard(), className)}>
      <div>
        <h2 className={listHeading} id="debt-accounts-heading" tabIndex={-1}>
          Your debts
        </h2>
        <p className={listSubtitle}>
          Select edit on a debt to see or change its rate and minimum payment.
        </p>
      </div>

      {debts.length === 0 ? (
        <p className={listSubtitle}>No debts added</p>
      ) : (
        <>
          {renderRows(visible, "Your debts")}
          {rest.length > 0 ? (
            <div className={drawerWrap}>
              <CollapsibleDrawer
                closedLabel="Show all debts"
                itemCount={rest.length}
                itemNoun={{ one: "more debt", other: "more debts" }}
                openLabel="Hide the rest"
                title="More debts"
              >
                {renderRows(rest, "More debts")}
              </CollapsibleDrawer>
            </div>
          ) : null}
        </>
      )}

      {editingDebt ? (
        <AddDebtDialog
          key={editingDebt.id}
          debt={editingDebt}
          isOpen
          onAddDebt={() => undefined}
          onClose={() => setEditingId(null)}
          onDeleteDebt={onDeleteDebt}
          onEditDebt={onUpdateDebt}
        />
      ) : null}
    </section>
  );
};

export default DebtAccountsList;

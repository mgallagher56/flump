import type { DebtItem } from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import AddDebtDialog from "./AddDebtDialog";

export interface DebtAccountsListProps {
  debts: DebtItem[];
  onAddDebt: () => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, updates: Partial<DebtItem>) => void;
}

const cardStyle = css({
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

const tableStyle = css({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  "& th": {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid",
    borderColor: "border",
    color: "text.muted",
    fontWeight: "600",
  },
  "& td": {
    padding: "12px",
    borderBottom: "1px solid",
    borderColor: "border",
  },
});

export const DebtAccountsList: FC<DebtAccountsListProps> = ({
  debts,
  onAddDebt,
  onDeleteDebt,
  onUpdateDebt,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingDebt = debts.find((d) => d.id === editingId);

  return (
    <FLPCard>
      <div className={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <FLPHeading as="h3" size="xl">
              Active liability accounts
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Manage your credit cards, loans, overdrafts, and store cards.
            </FLPText>
          </div>
          <FLPButton size="sm" variant="primary" onClick={onAddDebt}>
            <FaPlus /> Add debt
          </FLPButton>
        </div>

        {debts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <FLPText color="text.muted" fontSize="md">
              No active debts recorded.
            </FLPText>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={tableStyle}>
              <thead>
                <tr>
                  <th>Creditor</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>APR (%)</th>
                  <th>Minimum / mo</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => (
                  <tr key={debt.id}>
                    <td style={{ fontWeight: "600" }}>{debt.name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          backgroundColor: "var(--colors-surface-sunken)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "capitalize",
                        }}
                      >
                        {debt.type ? debt.type.replace("_", " ") : "Credit Card"}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--colors-status-danger-text)",
                        fontWeight: "600",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(debt.balance)}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {debt.aprKnown === false ? (
                        <span style={{ color: "var(--colors-text-muted)" }}>APR not set</span>
                      ) : (
                        <span
                          style={{
                            fontWeight: "bold",
                            color:
                              debt.apr > 15
                                ? "var(--colors-status-danger-text)"
                                : "var(--colors-status-warning-text)",
                          }}
                        >
                          {debt.apr}%
                        </span>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(debt.minimumPayment)}
                      {debt.minimumPaymentEstimated ? (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "11px",
                            color: "var(--colors-text-muted)",
                          }}
                        >
                          estimated
                        </span>
                      ) : null}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        aria-label={`Edit ${debt.name}`}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--colors-text-muted)",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                        type="button"
                        onClick={() => setEditingId(debt.id)}
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        aria-label={`Delete ${debt.name}`}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--colors-status-danger-text)",
                          cursor: "pointer",
                          padding: "4px 8px",
                        }}
                        type="button"
                        onClick={() => onDeleteDebt(debt.id)}
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingDebt ? (
        <AddDebtDialog
          key={editingDebt.id}
          debt={editingDebt}
          isOpen
          onAddDebt={() => undefined}
          onClose={() => setEditingId(null)}
          onEditDebt={onUpdateDebt}
        />
      ) : null}
    </FLPCard>
  );
};

export default DebtAccountsList;

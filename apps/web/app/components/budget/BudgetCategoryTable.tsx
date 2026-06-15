import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaEdit, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import { CATEGORY_COLOURS, CATEGORY_ICONS, CATEGORY_LABELS, toMonthly } from "~/types/budget";

interface BudgetCategoryTableProps {
  category: BudgetCategory;
  entries: BudgetEntry[];
  onAdd: (entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface EditRow {
  id: string | null; // null = new row
  name: string;
  amount: string;
  frequency: BudgetEntry["frequency"];
  notes: string;
  isEssential: boolean;
}

const EMPTY_ROW: EditRow = {
  id: null,
  name: "",
  amount: "",
  frequency: "monthly",
  notes: "",
  isEssential: true,
};

const inputStyle = css({
  width: "100%",
  padding: "6px 10px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "transparent",
  color: "text.primary",
  outline: "none",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const selectStyle = css({
  padding: "6px 10px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  cursor: "pointer",
  transition: "all 0.2s",
});

const BudgetCategoryTable: FC<BudgetCategoryTableProps> = ({
  category,
  entries,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [editingRow, setEditingRow] = useState<EditRow | null>(null);
  const [saving, setSaving] = useState(false);

  const isIncome = category === "income";
  const colour = CATEGORY_COLOURS[category];
  const total = entries.reduce((sum, e) => sum + toMonthly(e), 0);

  const startEdit = (entry: BudgetEntry) => {
    setEditingRow({
      id: entry.id,
      name: entry.name,
      amount: String(entry.amount),
      frequency: entry.frequency,
      notes: entry.notes ?? "",
      isEssential: entry.isEssential,
    });
  };

  const startNew = () => {
    setEditingRow({ ...EMPTY_ROW });
  };

  const cancelEdit = () => setEditingRow(null);

  const saveRow = async () => {
    if (!editingRow || !editingRow.name.trim() || !editingRow.amount) return;
    setSaving(true);
    try {
      if (editingRow.id) {
        await onUpdate(editingRow.id, {
          name: editingRow.name.trim(),
          amount: Number(editingRow.amount),
          frequency: editingRow.frequency,
          notes: editingRow.notes || null,
          isEssential: editingRow.isEssential,
        });
      } else {
        await onAdd({
          category,
          name: editingRow.name.trim(),
          amount: Number(editingRow.amount),
          frequency: editingRow.frequency,
          isIncome,
          isPrimaryIncome: false,
          isEssential: editingRow.isEssential,
          notes: editingRow.notes || null,
          isDefault: false,
        });
      }
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await onDelete(id);
  };

  const formatAmount = (entry: BudgetEntry) => {
    const monthly = toMonthly(entry);
    const prefix = isIncome ? "+" : "-";
    const symbol = "£";
    return `${prefix}${symbol}${monthly.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`;
  };

  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: "0",
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "border",
        overflow: "hidden",
      })}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          backgroundColor: "surface",
          borderBottom: "1px solid",
          borderColor: "border",
        })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{CATEGORY_ICONS[category]}</span>
          <div>
            <FLPHeading as="h3" size="sm" style={{ color: colour }}>
              {CATEGORY_LABELS[category]}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="xs">
              {entries.length} items · Total{" "}
              <strong style={{ color: isIncome ? "#10b981" : "inherit" }}>
                £
                {total.toLocaleString("en-GB", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                /mo
              </strong>
            </FLPText>
          </div>
        </div>
        <FLPButton size="sm" variant="outline" onClick={startNew}>
          <FaPlus style={{ marginRight: "6px" }} />
          Add
        </FLPButton>
      </div>

      {/* Table */}
      <div className={css({ backgroundColor: "background" })}>
        {entries.length === 0 && !editingRow && (
          <div
            className={css({
              padding: "32px",
              textAlign: "center",
              color: "text.muted",
              fontSize: "sm",
            })}
          >
            No items yet.{" "}
            <button
              className={css({
                color: "primary",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "sm",
              })}
              type="button"
              onClick={startNew}
            >
              Add one →
            </button>
          </div>
        )}

        {entries.map((entry) => {
          const isEditing = editingRow?.id === entry.id;
          return (
            <div
              key={entry.id}
              className={css({
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                alignItems: "center",
                gap: "12px",
                padding: "12px 20px",
                borderBottom: "1px solid",
                borderColor: "border",
                transition: "background-color 0.15s",
                _hover: { backgroundColor: "rgba(99, 99, 241, 0.03)" },
              })}
            >
              {isEditing ? (
                <>
                  <div
                    className={css({
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr",
                      gap: "8px",
                      alignItems: "center",
                    })}
                  >
                    <input
                      className={inputStyle}
                      placeholder="Name"
                      type="text"
                      value={editingRow.name}
                      onChange={(e) => setEditingRow((r) => r && { ...r, name: e.target.value })}
                    />
                    <input
                      className={inputStyle}
                      min="0"
                      placeholder="Amount"
                      step="0.01"
                      type="number"
                      value={editingRow.amount}
                      onChange={(e) => setEditingRow((r) => r && { ...r, amount: e.target.value })}
                    />
                    <select
                      className={selectStyle}
                      value={editingRow.frequency}
                      onChange={(e) =>
                        setEditingRow(
                          (r) =>
                            r && {
                              ...r,
                              frequency: e.target.value as BudgetEntry["frequency"],
                            },
                        )
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <FLPButton disabled={saving} size="sm" variant="primary" onClick={saveRow}>
                    <FaSave />
                  </FLPButton>
                  <FLPButton size="sm" variant="outline" onClick={cancelEdit}>
                    <FaTimes />
                  </FLPButton>
                  <div />
                </>
              ) : (
                <>
                  <div>
                    <FLPText fontSize="sm" fontWeight="medium">
                      {entry.name}
                    </FLPText>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginTop: "2px",
                      }}
                    >
                      <FLPText color="text.muted" fontSize="xs">
                        {entry.frequency}
                      </FLPText>
                      {entry.isEssential ? (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            color: "#10b981",
                            fontWeight: 600,
                          }}
                        >
                          essential
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(156, 163, 175, 0.15)",
                            color: "#9ca3af",
                            fontWeight: 600,
                          }}
                        >
                          discretionary
                        </span>
                      )}
                      {entry.isPrimaryIncome && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            color: "#3b82f6",
                            fontWeight: 600,
                          }}
                        >
                          primary
                        </span>
                      )}
                    </div>
                  </div>
                  <FLPText
                    fontWeight="semibold"
                    fontSize="sm"
                    style={{ color: isIncome ? "#10b981" : undefined, textAlign: "right" }}
                  >
                    {formatAmount(entry)}
                  </FLPText>
                  <button
                    className={css({
                      color: "text.muted",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "sm",
                      transition: "color 0.15s",
                      _hover: { color: "primary" },
                    })}
                    title="Edit"
                    type="button"
                    onClick={() => startEdit(entry)}
                  >
                    <FaEdit size={13} />
                  </button>
                  {!entry.isPrimaryIncome && (
                    <button
                      className={css({
                        color: "text.muted",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "sm",
                        transition: "color 0.15s",
                        _hover: { color: "destructive" },
                      })}
                      title="Delete"
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <FaTrash size={13} />
                    </button>
                  )}
                  {entry.isPrimaryIncome && <div />}
                </>
              )}
            </div>
          );
        })}

        {/* New row form */}
        {editingRow && editingRow.id === null && (
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              alignItems: "center",
              gap: "12px",
              padding: "12px 20px",
              backgroundColor: "rgba(99, 99, 241, 0.04)",
              borderTop: "1px solid",
              borderColor: "border",
            })}
          >
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "8px",
                alignItems: "center",
              })}
            >
              <input
                // biome-ignore lint/a11y/noAutofocus: intentional for new row UX
                autoFocus
                className={inputStyle}
                placeholder="Name (e.g. Netflix)"
                type="text"
                value={editingRow.name}
                onChange={(e) => setEditingRow((r) => r && { ...r, name: e.target.value })}
              />
              <input
                className={inputStyle}
                min="0"
                placeholder="Amount £"
                step="0.01"
                type="number"
                value={editingRow.amount}
                onChange={(e) => setEditingRow((r) => r && { ...r, amount: e.target.value })}
              />
              <select
                className={selectStyle}
                value={editingRow.frequency}
                onChange={(e) =>
                  setEditingRow(
                    (r) =>
                      r && {
                        ...r,
                        frequency: e.target.value as BudgetEntry["frequency"],
                      },
                  )
                }
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <FLPButton
              disabled={saving || !editingRow.name || !editingRow.amount}
              size="sm"
              variant="primary"
              onClick={saveRow}
            >
              <FaSave style={{ marginRight: "4px" }} /> Save
            </FLPButton>
            <FLPButton size="sm" variant="outline" onClick={cancelEdit}>
              Cancel
            </FLPButton>
            <div />
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetCategoryTable;

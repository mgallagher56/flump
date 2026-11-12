import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaEdit, FaPlus, FaSave, FaTimes, FaTrash } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCheckbox from "~/components/core/inputs/checkbox/FLPCheckbox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { useResponsive } from "~/context/ResponsiveContext";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { BudgetCategory, BudgetEntry } from "~/types/budget";
import {
  CATEGORY_COLOURS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getDaysUntilContractEnd,
  toMonthly,
} from "~/types/budget";
import { roundTo2dp } from "~/utils/roundTo2dp";

export interface BudgetCategoryTableProps {
  category: BudgetCategory;
  entries: BudgetEntry[];
  onAdd: (entry: Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdate: (id: string, update: Partial<BudgetEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeleteCategory?: (category: string) => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

interface EditRow {
  id: string | null; // null = new row
  name: string;
  amount: string;
  frequency: BudgetEntry["frequency"];
  notes: string;
  isEssential: boolean;
  contractEndDate: string;
}

const EMPTY_ROW: EditRow = {
  id: null,
  name: "",
  amount: "",
  frequency: "monthly",
  notes: "",
  isEssential: true,
  contractEndDate: "",
};

const inputStyle = (isMobile?: boolean) =>
  css({
    width: "100%",
    padding: isMobile ? "10px 12px" : "6px 10px",
    fontSize: isMobile ? "16px" : "sm",
    minHeight: isMobile ? "44px" : undefined,
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

const selectStyle = (isMobile?: boolean) =>
  css({
    padding: isMobile ? "10px 12px" : "6px 10px",
    fontSize: isMobile ? "16px" : "sm",
    minHeight: isMobile ? "44px" : undefined,
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    color: "text.primary",
    outline: "none",
    cursor: "pointer",
    transition: "all 0.2s",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  });

const BudgetCategoryTable: FC<BudgetCategoryTableProps> = ({
  category,
  entries,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteCategory,
  isMobile: propIsMobile,
  variant = "desktop",
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const { formatCurrency, symbol } = useFormatCurrency();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

  const [editingRow, setEditingRow] = useState<EditRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const renderRenewalBadge = (entry: BudgetEntry) => {
    if (!entry.contractEndDate) return null;
    const days = getDaysUntilContractEnd(entry.contractEndDate);
    if (days === null) return null;
    if (days <= 0) {
      return (
        <span
          style={{
            fontSize: "10px",
            padding: "1px 6px",
            borderRadius: "4px",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: "var(--colors-status-danger-text)",
            fontWeight: 700,
          }}
        >
          🚨 Expired {Math.abs(days)}d ago
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span
          style={{
            fontSize: "10px",
            padding: "1px 6px",
            borderRadius: "4px",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "var(--colors-status-warning-text)",
            fontWeight: 700,
          }}
        >
          ⚠️ Renews in {days}d (Price Hike Risk)
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: "10px",
          padding: "1px 6px",
          borderRadius: "4px",
          backgroundColor: "rgba(107, 114, 128, 0.1)",
          color: "#6b7280",
          fontWeight: 500,
        }}
      >
        Renews in {days}d
      </span>
    );
  };

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
      contractEndDate: entry.contractEndDate ?? "",
    });
  };

  const startNew = () => {
    setEditingRow({ ...EMPTY_ROW });
  };

  const cancelEdit = () => setEditingRow(null);

  const saveRow = async () => {
    if (!editingRow?.name.trim() || !editingRow.amount) return;
    setSaving(true);
    try {
      if (editingRow.id) {
        await onUpdate(editingRow.id, {
          name: editingRow.name.trim(),
          amount: roundTo2dp(Number(editingRow.amount)),
          frequency: editingRow.frequency,
          notes: editingRow.notes || null,
          isEssential: editingRow.isEssential,
          contractEndDate: editingRow.contractEndDate.trim() || null,
        });
      } else {
        await onAdd({
          category,
          name: editingRow.name.trim(),
          amount: roundTo2dp(Number(editingRow.amount)),
          frequency: editingRow.frequency,
          isIncome,
          isPrimaryIncome: false,
          isEssential: editingRow.isEssential,
          notes: editingRow.notes || null,
          isDefault: false,
          contractEndDate: editingRow.contractEndDate.trim() || null,
        });
      }
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  const entryToDelete = entries.find((entry) => entry.id === deleteId);

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatAmount = (entry: BudgetEntry) => {
    const monthly = toMonthly(entry);
    const prefix = isIncome ? "+" : "-";
    return `${prefix}${formatCurrency(Math.abs(monthly))}/mo`;
  };

  const formatFrequencyDetail = (entry: BudgetEntry) => {
    if (entry.frequency === "annual") {
      return `annual (${formatCurrency(Number(entry.amount) || 0)}/yr)`;
    }
    if (entry.frequency === "weekly") {
      return `weekly (${formatCurrency(Number(entry.amount) || 0)}/wk)`;
    }
    return entry.frequency;
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
      data-variant={isMobileVariant ? "mobile" : "desktop"}
    >
      {/* Header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobileVariant ? "12px 14px" : "16px 20px",
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
              <strong
                style={{ color: isIncome ? "var(--colors-status-positive-text)" : "inherit" }}
              >
                {formatCurrency(Number.isFinite(total) ? total : 0)}
                /mo
              </strong>
            </FLPText>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onDeleteCategory && entries.length === 0 && (
            <FLPButton
              id="delete-category-btn"
              isMobile={isMobileVariant}
              size="sm"
              variant="outline"
              onClick={() => onDeleteCategory(category)}
            >
              <FaTrash style={{ marginRight: "6px" }} />
              Delete Category
            </FLPButton>
          )}
          <FLPButton
            id="add-entry-btn"
            isMobile={isMobileVariant}
            size="sm"
            variant="outline"
            onClick={startNew}
          >
            <FaPlus style={{ marginRight: "6px" }} />
            Add
          </FLPButton>
        </div>
      </div>

      {/* Table / Mobile Card Stack */}
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
                display: isMobileVariant ? "flex" : "grid",
                flexDirection: isMobileVariant ? "column" : undefined,
                gridTemplateColumns: isMobileVariant ? undefined : "1fr auto auto auto",
                alignItems: isMobileVariant ? "stretch" : "center",
                gap: isMobileVariant ? "8px" : "12px",
                padding: isMobileVariant ? "14px" : "12px 20px",
                borderBottom: "1px solid",
                borderColor: "border",
                transition: "background-color 0.15s",
                _hover: { backgroundColor: "rgba(99, 99, 241, 0.03)" },
              })}
            >
              {isEditing ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div
                      className={css({
                        display: "grid",
                        gridTemplateColumns: isMobileVariant ? "1fr" : "2fr 1fr 1fr",
                        gap: "8px",
                        alignItems: "center",
                      })}
                    >
                      <input
                        className={inputStyle(isMobileVariant)}
                        placeholder="Name"
                        type="text"
                        value={editingRow.name}
                        onChange={(e) => setEditingRow((r) => r && { ...r, name: e.target.value })}
                      />
                      <input
                        className={inputStyle(isMobileVariant)}
                        min="0"
                        placeholder={`Amount (${symbol})`}
                        step="0.01"
                        type="number"
                        value={editingRow.amount}
                        onChange={(e) =>
                          setEditingRow((r) => r && { ...r, amount: e.target.value })
                        }
                      />
                      <select
                        className={selectStyle(isMobileVariant)}
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
                    <div
                      className={css({
                        display: "grid",
                        gridTemplateColumns: isMobileVariant || isIncome ? "1fr" : "1fr auto",
                        gap: "12px",
                        alignItems: "center",
                      })}
                    >
                      <input
                        className={inputStyle(isMobileVariant)}
                        placeholder="Notes (optional)"
                        type="text"
                        value={editingRow.notes}
                        onChange={(e) => setEditingRow((r) => r && { ...r, notes: e.target.value })}
                      />
                      {category === "bills" && (
                        <input
                          className={inputStyle(isMobileVariant)}
                          placeholder="Contract end date (YYYY-MM-DD)"
                          title="Contract End Date (YYYY-MM-DD)"
                          type="date"
                          value={editingRow.contractEndDate}
                          onChange={(e) =>
                            setEditingRow((r) => r && { ...r, contractEndDate: e.target.value })
                          }
                        />
                      )}
                      {!isIncome && (
                        <FLPCheckbox
                          checked={editingRow.isEssential}
                          id={`edit-essential-${entry.id}`}
                          label={
                            <FLPText color="text.muted" fontSize="xs">
                              Essential expense
                            </FLPText>
                          }
                          size="sm"
                          onChange={(e) =>
                            setEditingRow((r) => r && { ...r, isEssential: e.target.checked })
                          }
                        />
                      )}
                    </div>
                  </div>
                  {isMobileVariant ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <FLPButton
                        disabled={saving}
                        isMobile
                        size="sm"
                        variant="primary"
                        onClick={saveRow}
                      >
                        <FaSave style={{ marginRight: "6px" }} /> Save
                      </FLPButton>
                      <FLPButton isMobile size="sm" variant="outline" onClick={cancelEdit}>
                        <FaTimes style={{ marginRight: "6px" }} /> Cancel
                      </FLPButton>
                    </div>
                  ) : (
                    <>
                      <FLPButton disabled={saving} size="sm" variant="primary" onClick={saveRow}>
                        <FaSave />
                      </FLPButton>
                      <FLPButton size="sm" variant="outline" onClick={cancelEdit}>
                        <FaTimes />
                      </FLPButton>
                      <div />
                    </>
                  )}
                </>
              ) : isMobileVariant ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <FLPText fontSize="sm" fontWeight="medium">
                      {entry.name}
                    </FLPText>
                    <FLPText
                      fontSize="sm"
                      fontWeight="semibold"
                      style={{ color: isIncome ? "var(--colors-status-positive-text)" : undefined }}
                    >
                      {formatAmount(entry)}
                    </FLPText>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <FLPText color="text.muted" fontSize="xs">
                        {formatFrequencyDetail(entry)}
                      </FLPText>
                      {entry.isEssential ? (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            color: "var(--colors-status-positive-text)",
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
                      {renderRenewalBadge(entry)}
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        className={css({
                          color: "text.muted",
                          background: "surface",
                          border: "1px solid",
                          borderColor: "border",
                          cursor: "pointer",
                          padding: "8px",
                          borderRadius: "md",
                          _hover: { color: "primary" },
                        })}
                        aria-label={`Edit category ${entry.name}`}
                        title="Edit"
                        type="button"
                        onClick={() => startEdit(entry)}
                      >
                        <FaEdit size={14} />
                      </button>
                      {!entry.isPrimaryIncome && (
                        <button
                          className={css({
                            color: "text.muted",
                            background: "surface",
                            border: "1px solid",
                            borderColor: "border",
                            cursor: "pointer",
                            padding: "8px",
                            borderRadius: "md",
                            _hover: { color: "status.danger.text" },
                          })}
                          aria-label={`Delete category ${entry.name}`}
                          title="Delete"
                          type="button"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <FaTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
                        {formatFrequencyDetail(entry)}
                      </FLPText>
                      {entry.isEssential ? (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            color: "var(--colors-status-positive-text)",
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
                      {renderRenewalBadge(entry)}
                      {entry.notes && (
                        <FLPText color="text.muted" fontSize="xs">
                          · {entry.notes}
                        </FLPText>
                      )}
                    </div>
                  </div>
                  <FLPText
                    fontSize="sm"
                    fontWeight="semibold"
                    style={{
                      color: isIncome ? "var(--colors-status-positive-text)" : undefined,
                      textAlign: "right",
                    }}
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
                    aria-label={`Edit category ${entry.name}`}
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
                        _hover: { color: "status.danger.text" },
                      })}
                      aria-label={`Delete category ${entry.name}`}
                      title="Delete"
                      type="button"
                      onClick={() => setDeleteId(entry.id)}
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
              display: isMobileVariant ? "flex" : "grid",
              flexDirection: isMobileVariant ? "column" : undefined,
              gridTemplateColumns: isMobileVariant ? undefined : "1fr auto auto auto",
              alignItems: isMobileVariant ? "stretch" : "center",
              gap: "12px",
              padding: isMobileVariant ? "14px" : "12px 20px",
              backgroundColor: "rgba(99, 99, 241, 0.04)",
              borderTop: "1px solid",
              borderColor: "border",
            })}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: isMobileVariant ? "1fr" : "2fr 1fr 1fr",
                  gap: "8px",
                  alignItems: "center",
                })}
              >
                <input
                  // biome-ignore lint/a11y/noAutofocus: intentional for new row UX
                  autoFocus
                  className={inputStyle(isMobileVariant)}
                  placeholder="Name (e.g. Netflix)"
                  type="text"
                  value={editingRow.name}
                  onChange={(e) => setEditingRow((r) => r && { ...r, name: e.target.value })}
                />
                <input
                  className={inputStyle(isMobileVariant)}
                  min="0"
                  placeholder={`Amount ${symbol}`}
                  step="0.01"
                  type="number"
                  value={editingRow.amount}
                  onChange={(e) => setEditingRow((r) => r && { ...r, amount: e.target.value })}
                />
                <select
                  className={selectStyle(isMobileVariant)}
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
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: isMobileVariant || isIncome ? "1fr" : "1fr auto",
                  gap: "12px",
                  alignItems: "center",
                })}
              >
                <input
                  className={inputStyle(isMobileVariant)}
                  placeholder="Notes (optional)"
                  type="text"
                  value={editingRow.notes}
                  onChange={(e) => setEditingRow((r) => r && { ...r, notes: e.target.value })}
                />
                {!isIncome && (
                  <FLPCheckbox
                    checked={editingRow.isEssential}
                    id="new-row-essential-checkbox"
                    label={
                      <FLPText color="text.muted" fontSize="xs">
                        Essential expense
                      </FLPText>
                    }
                    size="sm"
                    onChange={(e) =>
                      setEditingRow((r) => r && { ...r, isEssential: e.target.checked })
                    }
                  />
                )}
              </div>
            </div>
            <div
              style={
                isMobileVariant
                  ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }
                  : { display: "contents" }
              }
            >
              <FLPButton
                disabled={saving || !editingRow.name || !editingRow.amount}
                isMobile={isMobileVariant}
                size="sm"
                variant="primary"
                onClick={saveRow}
              >
                <FaSave style={{ marginRight: "4px" }} /> Save
              </FLPButton>
              <FLPButton
                isMobile={isMobileVariant}
                size="sm"
                variant="outline"
                onClick={cancelEdit}
              >
                Cancel
              </FLPButton>
            </div>
            {!isMobileVariant && <div />}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={entryToDelete !== undefined}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        pending={deleting}
        title={`Delete ${entryToDelete?.name ?? "entry"}?`}
        description="This removes the entry from your budget. This can't be undone."
        confirmLabel="Delete entry"
        tone="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default BudgetCategoryTable;

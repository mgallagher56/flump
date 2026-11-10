import {
  getCategoriesForSource,
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, useMemo, useState } from "react";
import {
  FaChevronRight,
  FaCopy,
  FaEdit,
  FaFileImage,
  FaFilePdf,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface TaxIncomeSectionCardProps {
  source: TaxSource;
  title: string;
  subtitle: string;
  icon: ReactNode;
  colorScheme: "blue" | "emerald" | "amber" | "purple";
  records: TaxRecord[];
  selectedTaxYear: string;
  previousTaxYear: string;
  isOpenDefault?: boolean;
  onOpenAddModal: (source: TaxSource, type?: "income" | "expense") => void;
  onOpenEditModal: (record: TaxRecord) => void;
  onDeleteRecord: (id: string, e: React.MouseEvent) => void;
  onOpenCopyModal: (source: TaxSource) => void;
  onQuickAdd: (record: {
    name: string;
    source: TaxSource;
    type: "income" | "expense";
    category: string;
    amount: number;
    frequency: "one-off" | "monthly" | "annual";
    date: string;
  }) => void;
  onViewReceipt: (record: TaxRecord) => void;
  contextBanner?: ReactNode;
}

export const TaxIncomeSectionCard: FC<TaxIncomeSectionCardProps> = ({
  source,
  title,
  subtitle,
  icon,
  colorScheme,
  records,
  selectedTaxYear,
  previousTaxYear,
  isOpenDefault = true,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteRecord,
  onOpenCopyModal,
  onQuickAdd,
  onViewReceipt,
  contextBanner,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(isOpenDefault);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const { formatCurrencyDecimal } = useFormatCurrency();

  // Quick add state
  const categories = useMemo(() => getCategoriesForSource(source), [source]);
  const [quickName, setQuickName] = useState<string>("");
  const [quickType, setQuickType] = useState<"income" | "expense">("income");
  const [quickCategory, setQuickCategory] = useState<string>(categories[0]?.id || "");
  const [quickAmount, setQuickAmount] = useState<string>("");
  const [quickFrequency, setQuickFrequency] = useState<"one-off" | "monthly" | "annual">("monthly");

  // Filter records active in this section and tax year
  const sectionRecords = useMemo(() => {
    return records.filter(
      (r) => r.source === source && isRecordActiveInTaxYear(r, selectedTaxYear),
    );
  }, [records, source, selectedTaxYear]);

  // Totals for this section in the selected tax year
  const { totalIncome, totalExpenses, netTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const r of sectionRecords) {
      const annualVal = getRecordAnnualTotalForTaxYear(r, selectedTaxYear);
      if (r.type === "income") inc += annualVal;
      else exp += annualVal;
    }
    return {
      totalIncome: inc,
      totalExpenses: exp,
      netTotal: inc - exp,
    };
  }, [sectionRecords, selectedTaxYear]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickAmount) return;

    // Use April 1st of the selected tax year start
    const startYear = selectedTaxYear.split("/")[0];
    const defaultDate = `${startYear}-04-01`;

    onQuickAdd({
      name: quickName.trim(),
      source,
      type: quickType,
      category: quickCategory,
      amount: Number.parseFloat(quickAmount) || 0,
      frequency: quickFrequency,
      date: defaultDate,
    });

    setQuickName("");
    setQuickAmount("");
    setShowQuickAdd(false);
  };

  const getCategoryLabel = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || catId;
  };

  const colorTokens = {
    blue: {
      border: "rgba(59, 130, 246, 0.3)",
      badgeBg: "rgba(59, 130, 246, 0.12)",
      badgeText: "#2563EB",
      iconBg: "rgba(59, 130, 246, 0.15)",
    },
    emerald: {
      border: "rgba(16, 185, 129, 0.3)",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      badgeText: "#059669",
      iconBg: "rgba(16, 185, 129, 0.15)",
    },
    amber: {
      border: "rgba(245, 158, 11, 0.3)",
      badgeBg: "rgba(245, 158, 11, 0.12)",
      badgeText: "#D97706",
      iconBg: "rgba(245, 158, 11, 0.15)",
    },
    purple: {
      border: "rgba(139, 92, 246, 0.3)",
      badgeBg: "rgba(139, 92, 246, 0.12)",
      badgeText: "#7C3AED",
      iconBg: "rgba(139, 92, 246, 0.15)",
    },
  }[colorScheme];

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={css({
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "border",
        backgroundColor: "card",
        marginBottom: "20px",
        overflow: "hidden",
        boxShadow: "sm",
        transition: "border-color 0.2s",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        "&[open]": {
          borderColor: colorTokens.border,
        },
      })}
    >
      <summary
        className={css({
          display: "flex",
          flexDirection: { base: "column", md: "row" },
          alignItems: { base: "stretch", md: "center" },
          justifyContent: "space-between",
          padding: { base: "12px 14px", md: "16px 20px" },
          backgroundColor: "surface",
          cursor: "pointer",
          userSelect: "none",
          listStyle: "none",
          gap: { base: "12px", md: "16px" },
          "&::-webkit-details-marker": { display: "none" },
          "&:hover": { backgroundColor: "rgba(0,0,0,0.015)" },
        })}
      >
        {/* Left: Icon, Title, Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              backgroundColor: colorTokens.iconBg,
              color: colorTokens.badgeText,
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{ fontWeight: 700, fontSize: "15px", color: "var(--colors-text-primary)" }}
              >
                {title}
              </span>
              <span
                className={css({
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "1px 8px",
                  borderRadius: "full",
                  backgroundColor: colorTokens.badgeBg,
                  color: colorTokens.badgeText,
                })}
              >
                {sectionRecords.length} {sectionRecords.length === 1 ? "record" : "records"}
              </span>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--colors-text-muted)",
                display: "block",
                marginTop: "2px",
              }}
            >
              {subtitle}
            </span>
          </div>
        </div>

        {/* Right: Metrics Pills + Caret */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: { base: "100%", md: "auto" },
            gap: "12px",
            borderTop: { base: "1px dashed token(colors.border)", md: "none" },
            paddingTop: { base: "10px", md: 0 },
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              flex: 1,
            }}
          >
            {totalIncome > 0 && (
              <div style={{ textAlign: "right" }}>
                <span
                  style={{ fontSize: "10px", color: "var(--colors-text-muted)", display: "block" }}
                >
                  Income
                </span>
                <span
                  style={{ fontSize: "13px", fontWeight: 700, color: "var(--colors-success-500)" }}
                >
                  +{formatCurrencyDecimal(totalIncome)}
                </span>
              </div>
            )}
            {totalExpenses > 0 && (
              <div style={{ textAlign: "right" }}>
                <span
                  style={{ fontSize: "10px", color: "var(--colors-text-muted)", display: "block" }}
                >
                  Expenses
                </span>
                <span
                  style={{ fontSize: "13px", fontWeight: 700, color: "var(--colors-destructive)" }}
                >
                  -{formatCurrencyDecimal(totalExpenses)}
                </span>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <span
                style={{ fontSize: "10px", color: "var(--colors-text-muted)", display: "block" }}
              >
                Annual Net ({selectedTaxYear})
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: netTotal >= 0 ? "var(--colors-text-primary)" : "var(--colors-destructive)",
                }}
              >
                {formatCurrencyDecimal(netTotal)}
              </span>
            </div>
          </div>

          <div
            style={{
              color: "var(--colors-text-muted)",
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              marginLeft: "6px",
              flexShrink: 0,
            }}
          >
            <FaChevronRight size={14} />
          </div>
        </div>
      </summary>

      {/* Expanded Content Area */}
      <div
        className={css({
          padding: { base: "12px 14px", md: "16px 20px" },
          borderTop: "1px solid var(--colors-border)",
          maxWidth: "100%",
          boxSizing: "border-box",
        })}
      >
        {/* Context Banner */}
        {contextBanner && <div style={{ marginBottom: "16px" }}>{contextBanner}</div>}

        {/* Section Action Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <FLPButton size="sm" onClick={() => onOpenAddModal(source, "income")}>
              <FaPlus size={10} style={{ marginRight: "4px" }} /> Add Income
            </FLPButton>
            <FLPButton
              size="sm"
              variant="outline"
              onClick={() => onOpenAddModal(source, "expense")}
            >
              <FaPlus size={10} style={{ marginRight: "4px" }} /> Add Expense
            </FLPButton>
            <FLPButton size="sm" variant="outline" onClick={() => setShowQuickAdd((v) => !v)}>
              {showQuickAdd ? "Hide Quick-Add" : "Inline Quick-Add"}
            </FLPButton>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <FLPButton size="sm" variant="outline" onClick={() => onOpenCopyModal(source)}>
              <FaCopy size={11} style={{ marginRight: "6px" }} /> Copy from {previousTaxYear}
            </FLPButton>
          </div>
        </div>

        {/* Inline Quick Add Bar */}
        {showQuickAdd && (
          <form
            onSubmit={handleQuickSubmit}
            className={css({
              display: "grid",
              gridTemplateColumns: {
                base: "1fr",
                sm: "1fr 1fr",
                md: "2fr 1fr 1.5fr 1fr 1fr auto",
              },
              gap: "8px",
              padding: { base: "10px", md: "12px" },
              backgroundColor: "rgba(0,0,0,0.02)",
              border: "1px solid",
              borderColor: "border",
              borderRadius: "md",
              marginBottom: "16px",
              alignItems: "center",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            })}
          >
            <input
              type="text"
              placeholder="Record name (e.g. Poplar Rent, Adobe Sub)"
              required
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className={css({
                padding: "6px 10px",
                fontSize: "xs",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            />

            <select
              value={quickType}
              onChange={(e) => {
                const t = e.target.value as "income" | "expense";
                setQuickType(t);
                const first = categories.find((c) => c.type === t)?.id || categories[0]?.id || "";
                setQuickCategory(first);
              }}
              className={css({
                padding: "6px 8px",
                fontSize: "xs",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            >
              <option value="income">Income (+)</option>
              <option value="expense">Expense (-)</option>
            </select>

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className={css({
                padding: "6px 8px",
                fontSize: "xs",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            >
              {categories
                .filter((c) => c.type === quickType)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Amount (£)"
              required
              value={quickAmount}
              onChange={(e) => setQuickAmount(e.target.value)}
              className={css({
                padding: "6px 10px",
                fontSize: "xs",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            />

            <select
              value={quickFrequency}
              onChange={(e) => setQuickFrequency(e.target.value as any)}
              className={css({
                padding: "6px 8px",
                fontSize: "xs",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="one-off">One-off</option>
            </select>

            <FLPButton type="submit" size="sm">
              Add
            </FLPButton>
          </form>
        )}

        {/* Active Records Table */}
        {sectionRecords.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              backgroundColor: "rgba(0,0,0,0.01)",
              borderRadius: "8px",
              border: "1px dashed var(--colors-border)",
            }}
          >
            <FLPText color="text.muted" fontSize="sm">
              No active records logged for {title} in {selectedTaxYear}.
            </FLPText>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <FLPButton size="sm" onClick={() => onOpenAddModal(source, "income")}>
                <FaPlus size={10} style={{ marginRight: "4px" }} /> Add Record
              </FLPButton>
              <FLPButton size="sm" variant="outline" onClick={() => onOpenCopyModal(source)}>
                <FaCopy size={11} style={{ marginRight: "4px" }} /> Copy from {previousTaxYear}
              </FLPButton>
            </div>
          </div>
        ) : (
          <div
            className={css({
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              borderRadius: "md",
              border: "1px solid",
              borderColor: "border",
              boxSizing: "border-box",
            })}
          >
            <table
              style={{
                width: "100%",
                minWidth: "550px",
                borderCollapse: "collapse",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "rgba(0,0,0,0.02)",
                    borderBottom: "1px solid var(--colors-border)",
                  }}
                >
                  <th style={{ padding: "10px 14px" }}>Item Name</th>
                  <th style={{ padding: "10px 14px" }}>Category</th>
                  <th style={{ padding: "10px 14px" }}>Frequency</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>
                    Total in {selectedTaxYear}
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", width: "70px" }}>
                    Receipt
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", width: "90px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectionRecords.map((record) => {
                  const isIncome = record.type === "income";
                  const amt =
                    typeof record.amount === "string"
                      ? Number.parseFloat(record.amount)
                      : record.amount;
                  const annualVal = getRecordAnnualTotalForTaxYear(record, selectedTaxYear);

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onOpenEditModal(record)}
                      style={{
                        borderBottom: "1px solid var(--colors-border)",
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                      }}
                      className={css({
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                      })}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                        {record.name}
                        {record.endDate && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--colors-text-muted)",
                              marginLeft: "6px",
                            }}
                          >
                            (until {record.endDate})
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: "12px",
                          color: "var(--colors-text-muted)",
                        }}
                      >
                        {getCategoryLabel(record.category)}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textTransform: "capitalize",
                          fontSize: "12px",
                        }}
                      >
                        {record.frequency}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 500,
                          color: isIncome
                            ? "var(--colors-success-500)"
                            : "var(--colors-text-primary)",
                        }}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrencyDecimal(amt || 0)}
                        {record.frequency === "monthly" && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--colors-text-muted)",
                              marginLeft: "2px",
                            }}
                          >
                            /mo
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: isIncome
                            ? "var(--colors-success-500)"
                            : "var(--colors-destructive)",
                        }}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrencyDecimal(annualVal)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {record.receiptFilename ? (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(record)}
                            className={css({
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              border: "none",
                              background: "none",
                              color: "primary",
                              cursor: "pointer",
                              fontSize: "xs",
                              "&:hover": { textDecoration: "underline" },
                            })}
                          >
                            {record.receiptMimeType?.includes("pdf") ? (
                              <FaFilePdf size={13} style={{ color: "#EF4444" }} />
                            ) : (
                              <FaFileImage size={13} style={{ color: "#3B82F6" }} />
                            )}
                            View
                          </button>
                        ) : (
                          <span style={{ color: "var(--colors-text-muted)", fontSize: "11px" }}>
                            -
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button
                            type="button"
                            title="Edit record"
                            onClick={() => onOpenEditModal(record)}
                            className={css({
                              padding: "4px 6px",
                              border: "none",
                              background: "none",
                              color: "text.muted",
                              cursor: "pointer",
                              borderRadius: "sm",
                              "&:hover": {
                                color: "text.primary",
                                backgroundColor: "rgba(0,0,0,0.06)",
                              },
                            })}
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            type="button"
                            title="Delete record"
                            onClick={(e) => onDeleteRecord(record.id, e)}
                            className={css({
                              padding: "4px 6px",
                              border: "none",
                              background: "none",
                              color: "destructive",
                              cursor: "pointer",
                              borderRadius: "sm",
                              "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                            })}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
};

export default TaxIncomeSectionCard;

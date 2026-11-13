import {
  buildCopiedRecordForTaxYear,
  getCurrentUKTaxYear,
  getNextTaxYear,
  getPreviousTaxYear,
  getTaxYearForRecordDate,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import { Dialog } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaCopy, FaFilter } from "react-icons/fa";
import { useFetcher } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPText from "~/components/core/typography/FLPText";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";

export interface CopyTaxYearModalProps {
  open: boolean;
  onClose: () => void;
  records: TaxRecord[];
  initialSourceSection?: TaxSource | "all";
  initialSourceYear?: string;
  initialTargetYear?: string;
  availableYears: string[];
}

interface RowItemState {
  selected: boolean;
  name: string;
  amount: number;
}

export const CopyTaxYearModal: FC<CopyTaxYearModalProps> = ({
  open,
  onClose,
  records,
  initialSourceSection = "all",
  initialSourceYear,
  initialTargetYear,
  availableYears,
}) => {
  const fetcher = useFetcher();
  const { formatCurrencyDecimal } = useFormatCurrency();

  // Selected years
  const currentTaxYear = getCurrentUKTaxYear();
  const defaultTarget =
    initialTargetYear || availableYears[availableYears.length - 1] || currentTaxYear;
  const defaultSource = initialSourceYear || getPreviousTaxYear(defaultTarget);

  const [sourceYear, setSourceYear] = useState<string>(defaultSource);
  const [targetYear, setTargetYear] = useState<string>(defaultTarget);
  const [sectionFilter, setSectionFilter] = useState<TaxSource | "all">(initialSourceSection);
  const [recurringOnly, setRecurringOnly] = useState<boolean>(true);
  const [capPreviousOpenEnded, setCapPreviousOpenEnded] = useState<boolean>(true);

  // Sync initial props when opened
  useEffect(() => {
    if (open) {
      if (initialTargetYear) setTargetYear(initialTargetYear);
      if (initialSourceYear) setSourceYear(initialSourceYear);
      else if (initialTargetYear) setSourceYear(getPreviousTaxYear(initialTargetYear));
      if (initialSourceSection) setSectionFilter(initialSourceSection);
    }
  }, [open, initialTargetYear, initialSourceYear, initialSourceSection]);

  // Candidate records from source year
  const candidateRecords = useMemo(() => {
    return records.filter((r) => {
      if (!isRecordActiveInTaxYear(r, sourceYear)) return false;
      if (sectionFilter !== "all" && r.source !== sectionFilter) return false;
      if (recurringOnly && r.frequency === "one-off") return false;
      return true;
    });
  }, [records, sourceYear, sectionFilter, recurringOnly]);

  // Editable row state map: recordId -> RowItemState
  const [rowStates, setRowStates] = useState<Record<string, RowItemState>>({});

  // Reset row states when candidate records or target year change
  useEffect(() => {
    const nextStates: Record<string, RowItemState> = {};
    for (const record of candidateRecords) {
      const template = buildCopiedRecordForTaxYear(record, targetYear);
      const amt =
        typeof record.amount === "string" ? Number.parseFloat(record.amount) : record.amount;
      nextStates[record.id] = {
        selected: true,
        name: template.name,
        amount: amt || 0,
      };
    }
    setRowStates(nextStates);
  }, [candidateRecords, targetYear]);

  // Adjust all selected items by percentage
  const handleApplyPercentage = (pct: number) => {
    setRowStates((prev) => {
      const next = { ...prev };
      for (const id in next) {
        if (next[id].selected) {
          const original = records.find((r) => r.id === id);
          const baseAmt = original
            ? typeof original.amount === "string"
              ? Number.parseFloat(original.amount)
              : original.amount
            : next[id].amount;
          const adjusted = Math.round(baseAmt * (1 + pct / 100) * 100) / 100;
          next[id] = { ...next[id], amount: adjusted };
        }
      }
      return next;
    });
  };

  const allSelected =
    candidateRecords.length > 0 && candidateRecords.every((r) => rowStates[r.id]?.selected);

  const toggleSelectAll = () => {
    const nextVal = !allSelected;
    setRowStates((prev) => {
      const next = { ...prev };
      for (const r of candidateRecords) {
        if (next[r.id]) {
          next[r.id] = { ...next[r.id], selected: nextVal };
        }
      }
      return next;
    });
  };

  // Submit bulk create
  const handleSubmit = () => {
    const selectedRecordsToCopy: any[] = [];
    const capList: { id: string; endDate: string }[] = [];

    // Source year end date for capping open-ended records: e.g. "2024/25" -> "2025-03-31"
    const sourceEndYear = Number.parseInt(sourceYear.split("/")[0], 10) + 1;
    const sourceFiscalEnd = `${sourceEndYear}-03-31`;

    for (const r of candidateRecords) {
      const st = rowStates[r.id];
      if (st?.selected) {
        const payload = buildCopiedRecordForTaxYear(r, targetYear, st.amount);
        payload.name = st.name;
        selectedRecordsToCopy.push(payload);

        // If the original record was open-ended, cap it to prevent duplicate overlaps
        if (capPreviousOpenEnded && (!r.endDate || r.endDate > sourceFiscalEnd)) {
          capList.push({ id: r.id, endDate: sourceFiscalEnd });
        }
      }
    }

    if (selectedRecordsToCopy.length === 0) return;

    fetcher.submit(
      {
        intent: "bulk-create-transactions",
        records: JSON.stringify(selectedRecordsToCopy),
        capPreviousRecordIds: JSON.stringify(capList),
      },
      { method: "POST" },
    );

    onClose();
  };

  const selectedCount = candidateRecords.filter((r) => rowStates[r.id]?.selected).length;

  // Potential years to target (include available years, current year, next years)
  const allYearOptions = useMemo(() => {
    const cur = getCurrentUKTaxYear();
    const prevYr = getPreviousTaxYear(cur);
    const nextYr = getNextTaxYear(cur);
    const nextNextYr = getNextTaxYear(nextYr);
    const fromRecords = records.map((r) => getTaxYearForRecordDate(r.date));
    const set = new Set([...availableYears, ...fromRecords, prevYr, cur, nextYr, nextNextYr]);
    if (sourceYear) set.add(sourceYear);
    if (targetYear) set.add(targetYear);
    return Array.from(set).sort();
  }, [availableYears, records, sourceYear, targetYear]);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
      title="Copy figures and populate tax year"
      description="Carry over recurring figures (rent, expenses, retainers) from a previous year. Adjust values inline or apply an inflation percentage before saving."
      size="lg"
      id="copy-tax-year-dialog"
    >
      {/* Controls Bar: Source year to target year and scope */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1.4fr 1fr 1fr" },
          gap: "12px",
          padding: "14px",
          backgroundColor: "var(--colors-surface-sunken)",
          border: "1px solid",
          borderColor: "border",
          borderRadius: "md",
        })}
      >
        {/* Year Transfer */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="copy-source-year"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--colors-text-muted)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Source year
            </label>
            <select
              id="copy-source-year"
              value={sourceYear}
              onChange={(e) => setSourceYear(e.target.value)}
              className={css({
                width: "100%",
                padding: "6px 8px",
                fontSize: "sm",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            >
              {allYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <FaArrowRight
            style={{
              marginTop: "18px",
              color: "var(--colors-text-muted)",
              flexShrink: 0,
            }}
            size={12}
          />

          <div style={{ flex: 1 }}>
            <label
              htmlFor="copy-target-year"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--colors-text-muted)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Target year
            </label>
            <select
              id="copy-target-year"
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              className={css({
                width: "100%",
                padding: "6px 8px",
                fontSize: "sm",
                borderRadius: "sm",
                border: "1px solid token(colors.border)",
                backgroundColor: "surface",
              })}
            >
              {allYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section Filter */}
        <div>
          <label
            htmlFor="copy-section-scope"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--colors-text-muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Section scope
          </label>
          <select
            id="copy-section-scope"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value as any)}
            className={css({
              width: "100%",
              padding: "6px 8px",
              fontSize: "sm",
              borderRadius: "sm",
              border: "1px solid token(colors.border)",
              backgroundColor: "surface",
            })}
          >
            <option value="all">All income sections</option>
            <option value="rental">Rental property only</option>
            <option value="self-employed">Self-employed only</option>
            <option value="paye">PAYE employment only</option>
            <option value="savings">Savings and dividends only</option>
          </select>
        </div>

        {/* Quick Batch Options */}
        <div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--colors-text-muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Record type
          </span>
          <button
            type="button"
            onClick={() => setRecurringOnly((v) => !v)}
            className={css({
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "6px 10px",
              fontSize: "xs",
              fontWeight: "semibold",
              borderRadius: "sm",
              border: "1px solid token(colors.border)",
              backgroundColor: recurringOnly ? "var(--colors-status-info-bg)" : "surface",
              color: recurringOnly ? "status.info.text" : "text.muted",
              cursor: "pointer",
            })}
          >
            <FaFilter size={10} />
            {recurringOnly ? "Recurring or fixed only" : "All records (including one-offs)"}
          </button>
        </div>
      </div>

      {/* Batch Adjustments Toolbelt */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
            Adjust selected amounts:
          </span>
          <button
            type="button"
            onClick={() => handleApplyPercentage(0)}
            className={css({
              padding: "3px 8px",
              fontSize: "xs",
              borderRadius: "sm",
              border: "1px solid token(colors.border)",
              backgroundColor: "surface",
              cursor: "pointer",
              "&:hover": { backgroundColor: "var(--colors-surface-subtle)" },
              fontVariantNumeric: "tabular-nums",
            })}
          >
            0% (keep same)
          </button>
          <button
            type="button"
            onClick={() => handleApplyPercentage(2)}
            className={css({
              padding: "3px 8px",
              fontSize: "xs",
              borderRadius: "sm",
              border: "1px solid token(colors.border)",
              backgroundColor: "surface",
              cursor: "pointer",
              "&:hover": { backgroundColor: "var(--colors-surface-subtle)" },
              fontVariantNumeric: "tabular-nums",
            })}
          >
            +2%
          </button>
          <button
            type="button"
            onClick={() => handleApplyPercentage(5)}
            className={css({
              padding: "3px 8px",
              fontSize: "xs",
              borderRadius: "sm",
              border: "1px solid token(colors.border)",
              backgroundColor: "surface",
              cursor: "pointer",
              "&:hover": { backgroundColor: "var(--colors-surface-subtle)" },
              fontVariantNumeric: "tabular-nums",
            })}
          >
            +5%
          </button>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "var(--colors-text-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={capPreviousOpenEnded}
            onChange={(e) => setCapPreviousOpenEnded(e.target.checked)}
          />
          Cap previous open-ended records to 31 Mar
        </label>
      </div>

      {/* Records Table Scroll Area */}
      <section
        aria-label="Records to copy"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the wide table
        tabIndex={0}
        className={css({
          minHeight: 0,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
          border: "1px solid",
          borderColor: "border",
          borderRadius: "md",
        })}
      >
        {candidateRecords.length === 0 ? (
          <div
            style={{
              padding: "36px",
              textAlign: "center",
              color: "var(--colors-text-muted)",
              fontSize: "13px",
            }}
          >
            No active records found in {sourceYear} matching the selected criteria.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              minWidth: "500px",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "var(--colors-surface)",
                zIndex: 2,
                borderBottom: "1px solid var(--colors-border)",
              }}
            >
              <tr>
                <th style={{ padding: "10px 12px", width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Select All"
                  />
                </th>
                <th style={{ padding: "10px 12px" }}>New name ({targetYear})</th>
                <th style={{ padding: "10px 12px" }}>Section</th>
                <th style={{ padding: "10px 12px" }}>Frequency</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Previous</th>
                <th style={{ padding: "10px 12px", width: "130px", textAlign: "right" }}>
                  New amount (£)
                </th>
              </tr>
            </thead>
            <tbody>
              {candidateRecords.map((record) => {
                const st = rowStates[record.id] || {
                  selected: false,
                  name: record.name,
                  amount: Number(record.amount) || 0,
                };
                const isIncome = record.type === "income";

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: "1px solid var(--colors-border)",
                      backgroundColor: st.selected ? "transparent" : "var(--colors-surface-sunken)",
                      opacity: st.selected ? 1 : 0.6,
                    }}
                  >
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={st.selected}
                        onChange={(e) =>
                          setRowStates((prev) => ({
                            ...prev,
                            [record.id]: {
                              ...st,
                              selected: e.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <input
                        type="text"
                        value={st.name}
                        disabled={!st.selected}
                        onChange={(e) =>
                          setRowStates((prev) => ({
                            ...prev,
                            [record.id]: { ...st, name: e.target.value },
                          }))
                        }
                        className={css({
                          width: "100%",
                          padding: "4px 8px",
                          fontSize: "xs",
                          borderRadius: "sm",
                          border: "1px solid token(colors.border)",
                          backgroundColor: "surface",
                        })}
                      />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        className={css({
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "2px 6px",
                          borderRadius: "full",
                          textTransform: "uppercase",
                          backgroundColor:
                            record.source === "rental"
                              ? "var(--colors-status-warning-bg)"
                              : record.source === "self-employed"
                                ? "var(--colors-status-positive-bg)"
                                : record.source === "savings"
                                  ? "var(--colors-status-neutral-bg)"
                                  : "var(--colors-status-info-bg)",
                          color:
                            record.source === "rental"
                              ? "status.warning.text"
                              : record.source === "self-employed"
                                ? "status.positive.text"
                                : record.source === "savings"
                                  ? "status.neutral.text"
                                  : "status.info.text",
                        })}
                      >
                        {record.source}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        textTransform: "capitalize",
                      }}
                    >
                      {record.frequency}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: "12px",
                        color: "var(--colors-text-muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrencyDecimal(Number(record.amount) || 0)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!st.selected}
                        value={st.amount}
                        onChange={(e) =>
                          setRowStates((prev) => ({
                            ...prev,
                            [record.id]: {
                              ...st,
                              amount: Number.parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        className={css({
                          width: "100%",
                          padding: "4px 8px",
                          fontSize: "xs",
                          textAlign: "right",
                          borderRadius: "sm",
                          border: "1px solid token(colors.border)",
                          backgroundColor: "surface",
                          color: isIncome ? "status.positive.text" : "text.primary",
                          fontWeight: "semibold",
                          fontVariantNumeric: "tabular-nums",
                        })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Footer */}
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
          <FLPText fontSize="xs" color="text.muted" style={{ fontVariantNumeric: "tabular-nums" }}>
            <strong>{selectedCount}</strong> of {candidateRecords.length} records selected to copy
            into <strong>{targetYear}</strong>.
          </FLPText>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <FLPButton variant="outline" onClick={onClose}>
            Cancel
          </FLPButton>
          <FLPButton
            style={{ fontVariantNumeric: "tabular-nums" }}
            disabled={selectedCount === 0}
            loading={fetcher.state !== "idle"}
            onClick={handleSubmit}
          >
            <FaCopy size={12} style={{ marginRight: "6px" }} />
            Copy {selectedCount} records to {targetYear}
          </FLPButton>
        </div>
      </div>
    </Dialog>
  );
};

export default CopyTaxYearModal;

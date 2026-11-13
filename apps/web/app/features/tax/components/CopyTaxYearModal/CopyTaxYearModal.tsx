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
import { Button, CurrencyInput, Dialog, FormField, Icon, StatusBadge, TextInput } from "@repo/ui";
import { ArrowRight, Copy, Filter } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { nativeSelect } from "../../select.styles";
import { FREQUENCY_LABEL, SOURCE_LABEL } from "../../tax-labels";
import * as s from "./CopyTaxYearModal.styles";

const SOURCE_TONE = {
  rental: "warning",
  "self-employed": "positive",
  savings: "neutral",
  paye: "info",
} as const;

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

  const yearOptions = allYearOptions.map((y) => (
    <option key={y} value={y}>
      {y}
    </option>
  ));

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
      title="Copy figures and populate tax year"
      description="Carry over recurring figures (rent, expenses, retainers) from a previous year. Adjust values inline or add an inflation percentage before saving."
      size="lg"
      id="copy-tax-year-dialog"
    >
      <div className={s.body()}>
        <div className={s.controlsBar()}>
          <div className={s.yearTransfer()}>
            <div className={s.yearField()}>
              <FormField label="Source year">
                {(field) => (
                  // TODO(E15 T2.2b): swap for the @repo/ui Select primitive when it lands.
                  <select
                    id={field.id}
                    aria-describedby={field.describedBy}
                    className={nativeSelect()}
                    value={sourceYear}
                    onChange={(e) => setSourceYear(e.target.value)}
                  >
                    {yearOptions}
                  </select>
                )}
              </FormField>
            </div>
            <span className={s.yearArrow()}>
              <Icon icon={ArrowRight} size="sm" />
            </span>
            <div className={s.yearField()}>
              <FormField label="Target year">
                {(field) => (
                  <select
                    id={field.id}
                    aria-describedby={field.describedBy}
                    className={nativeSelect()}
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                  >
                    {yearOptions}
                  </select>
                )}
              </FormField>
            </div>
          </div>

          <FormField label="Section scope">
            {(field) => (
              <select
                id={field.id}
                aria-describedby={field.describedBy}
                className={nativeSelect()}
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as TaxSource | "all")}
              >
                <option value="all">All income sections</option>
                <option value="rental">Rental property only</option>
                <option value="self-employed">Self-employed only</option>
                <option value="paye">PAYE employment only</option>
                <option value="savings">Savings and dividends only</option>
              </select>
            )}
          </FormField>

          <div>
            <span className={s.fieldLabel()}>Record type</span>
            <button
              type="button"
              aria-pressed={recurringOnly}
              onClick={() => setRecurringOnly((v) => !v)}
              className={s.recurringToggle({ active: recurringOnly })}
            >
              <Icon icon={Filter} size="sm" />
              {recurringOnly ? "Recurring or fixed only" : "All records (including one-offs)"}
            </button>
          </div>
        </div>

        <div className={s.toolbar()}>
          <div className={s.adjustGroup()}>
            <span className={s.mutedText()}>Adjust selected amounts:</span>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => handleApplyPercentage(0)}
            >
              0% (keep same)
            </Button>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => handleApplyPercentage(2)}
            >
              +2%
            </Button>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => handleApplyPercentage(5)}
            >
              +5%
            </Button>
          </div>

          <label className={s.checkLabel()}>
            <input
              type="checkbox"
              className={s.checkbox()}
              checked={capPreviousOpenEnded}
              onChange={(e) => setCapPreviousOpenEnded(e.target.checked)}
            />
            Cap previous open-ended records to 31 Mar
          </label>
        </div>

        <section
          aria-label="Records to copy"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the wide table
          tabIndex={0}
          className={s.tableScroll()}
        >
          {candidateRecords.length === 0 ? (
            <div className={s.empty()}>
              No active records found in {sourceYear} matching the selected criteria.
            </div>
          ) : (
            <table className={s.table()}>
              <thead className={s.headRow()}>
                <tr>
                  <th className={s.th({ align: "center", narrow: true })}>
                    <input
                      type="checkbox"
                      className={s.checkbox()}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all records"
                    />
                  </th>
                  <th className={s.th()}>New name ({targetYear})</th>
                  <th className={s.th()}>Section</th>
                  <th className={s.th()}>Frequency</th>
                  <th className={s.th({ align: "end" })}>Previous</th>
                  <th className={s.th({ align: "end", amount: true })}>New amount (£)</th>
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
                    <tr key={record.id} className={s.row({ selected: st.selected })}>
                      <td className={s.td({ align: "center" })}>
                        <input
                          type="checkbox"
                          className={s.checkbox()}
                          aria-label={`Copy ${record.name}`}
                          checked={st.selected}
                          onChange={(e) =>
                            setRowStates((prev) => ({
                              ...prev,
                              [record.id]: { ...st, selected: e.target.checked },
                            }))
                          }
                        />
                      </td>
                      <td className={s.td()}>
                        <TextInput
                          aria-label={`New name for ${record.name}`}
                          autoComplete="off"
                          value={st.name}
                          disabled={!st.selected}
                          onChange={(e) =>
                            setRowStates((prev) => ({
                              ...prev,
                              [record.id]: { ...st, name: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className={s.td()}>
                        <StatusBadge variant={SOURCE_TONE[record.source]}>
                          {SOURCE_LABEL[record.source]}
                        </StatusBadge>
                      </td>
                      <td className={s.td()}>{FREQUENCY_LABEL[record.frequency]}</td>
                      <td className={s.td({ align: "end", muted: true })}>
                        {isIncome ? "+" : "-"}
                        {formatCurrencyDecimal(Number(record.amount) || 0)}
                      </td>
                      <td className={s.td({ align: "end" })}>
                        <CurrencyInput
                          aria-label={`New amount for ${record.name}`}
                          disabled={!st.selected}
                          value={st.amount}
                          onValueChange={(v) =>
                            setRowStates((prev) => ({
                              ...prev,
                              [record.id]: { ...st, amount: v ?? 0 },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className={s.footer()}>
          <p className={s.mutedText()}>
            <strong>{selectedCount}</strong> of {candidateRecords.length} records selected to copy
            into <strong>{targetYear}</strong>.
          </p>
          <div className={s.footerActions()}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={selectedCount === 0}
              pending={fetcher.state !== "idle"}
              onClick={handleSubmit}
            >
              <Icon icon={Copy} size="sm" />
              Copy {selectedCount} records to {targetYear}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default CopyTaxYearModal;

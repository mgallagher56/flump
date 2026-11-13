import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Select,
  Sheet,
  StatusBadge,
} from "@repo/ui";
import { type FC, useEffect, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { statusText } from "../../snapshotCopy";
import {
  type AccountDetailInput,
  addMonths,
  buildCheckInRows,
  buildSnapshotPayload,
  compareMonths,
  formatMonth,
  type MonthKey,
  type SnapshotAccountInput,
} from "../../snapshotModel";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import {
  accountList,
  accountName,
  accountRow,
  accountStatus,
  checkInIntro,
  connectedValue,
  footerRow,
  monthPicker,
  summaryLine,
} from "./CheckInSheet.styles";

export type CheckInMode = "checkIn" | "backfill";

export interface CheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: readonly SnapshotAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  /** "checkIn" records the current month; "backfill" lets the user pick any earlier month. */
  mode?: CheckInMode;
  onSave: SaveSnapshot;
}

/** Earliest month the backend accepts (E30 PR1 `EARLIEST_SNAPSHOT`). */
const EARLIEST_YEAR = 2000;

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, i, 1)),
  ),
}));

/**
 * The monthly check-in (E30). Lists every account with last month's value prefilled; connected
 * accounts are marked as filled in by the bank sync, and an account with no value this month says
 * when it was last updated. Saving writes saved data (`PUT /snapshots/:month`); an empty field is
 * skipped, so a partial save is fine. In back-fill mode the same list records an earlier month.
 */
export const CheckInSheet: FC<CheckInSheetProps> = ({
  open,
  onOpenChange,
  accounts,
  accountDetails,
  currentMonth,
  mode = "checkIn",
  onSave,
}) => {
  const { formatCurrencyDecimal } = useFormatCurrency();
  const isBackfill = mode === "backfill";
  const latestPast = addMonths(currentMonth, -1);
  const [month, setMonth] = useState<MonthKey>(isBackfill ? latestPast : currentMonth);
  const rows = useMemo(
    () => buildCheckInRows(accounts, accountDetails, month, currentMonth),
    [accounts, accountDetails, month, currentMonth],
  );
  const [values, setValues] = useState<Record<string, number | null>>({});
  const [pending, setPending] = useState(false);

  // Reseed whenever the sheet opens or the month changes, so the prefill matches the month shown.
  useEffect(() => {
    if (!open) return;
    setValues(Object.fromEntries(rows.map((r) => [r.accountId, r.prefill])));
  }, [open, rows]);

  useEffect(() => {
    if (open) setMonth(isBackfill ? latestPast : currentMonth);
  }, [open, isBackfill, latestPast, currentMonth]);

  const isCurrentMonth = month === currentMonth;
  const { payload, saved, skipped } = buildSnapshotPayload(rows, values, { isCurrentMonth });
  const manualCount = rows.filter((r) => !r.isConnected).length;

  const [year, monthPart] = month.split("-") as [string, string];
  const currentYear = Number(currentMonth.slice(0, 4));
  const yearOptions = Array.from({ length: currentYear - EARLIEST_YEAR + 1 }, (_, i) => {
    const y = String(currentYear - i);
    return { value: y, label: y };
  });
  const pickMonth = (nextYear: string, nextMonth: string) => {
    let next: MonthKey = `${nextYear}-${nextMonth}`;
    // Back-fill is for earlier months only; clamp a pick at or after this month to last month.
    if (compareMonths(next, latestPast) > 0) next = latestPast;
    setMonth(next);
  };

  const handleSave = async () => {
    if (saved === 0 || pending) return;
    setPending(true);
    const ok = await onSave({ month, payload, saved, skipped });
    setPending(false);
    if (ok) onOpenChange(false);
  };

  const title = isBackfill ? "Add an earlier month" : `Monthly check-in: ${formatMonth(month)}`;
  const description = isBackfill
    ? "Choose a month and enter the balances you had then. Leave any account empty to skip it."
    : "Confirm or update each balance. Leave any account empty to skip it for now.";

  return (
    <Sheet
      description={description}
      footer={
        <div className={footerRow()}>
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={saved === 0}
            id="snapshot-save"
            data-testid="snapshot-save"
            onClick={handleSave}
            pending={pending}
            type="button"
          >
            Save balances
          </Button>
        </div>
      }
      id="snapshot-check-in"
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      title={title}
    >
      {isBackfill ? (
        <fieldset className={monthPicker()}>
          <legend className={checkInIntro()}>Month to record</legend>
          <FormField label="Month">
            {(field) => (
              <Select
                {...controlProps(field)}
                onChange={(e) => pickMonth(year, e.target.value)}
                options={MONTH_OPTIONS}
                value={monthPart}
              />
            )}
          </FormField>
          <FormField label="Year">
            {(field) => (
              <Select
                {...controlProps(field)}
                onChange={(e) => pickMonth(e.target.value, monthPart)}
                options={yearOptions}
                value={year}
              />
            )}
          </FormField>
        </fieldset>
      ) : null}

      {rows.length === 0 ? (
        <p className={checkInIntro()}>Add an account first, then its balance appears here.</p>
      ) : (
        <ul aria-label={`Balances for ${formatMonth(month)}`} className={accountList()}>
          {rows.map((row) => {
            const label = row.isLiability ? `${row.name}: amount owed` : `${row.name}: balance`;
            return (
              <li className={accountRow()} key={row.accountId}>
                <div>
                  <p className={accountName()}>{row.name}</p>
                  {row.isConnected ? (
                    <StatusBadge variant="info">
                      {statusText("connected", month, row.lastRecordedMonth)}
                    </StatusBadge>
                  ) : (
                    <p className={accountStatus()}>
                      {statusText(row.status, month, row.lastRecordedMonth)}
                      {row.outsideNetWorth ? ". Not counted in net worth" : ""}
                    </p>
                  )}
                </div>
                {row.isConnected ? (
                  <p className={connectedValue()}>
                    {row.prefill === null ? "Not set" : formatCurrencyDecimal(row.prefill)}
                  </p>
                ) : (
                  <CurrencyInput
                    aria-label={label}
                    id={`snapshot-value-${row.accountId}`}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [row.accountId]: v }))}
                    value={values[row.accountId] ?? null}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {manualCount > 0 ? (
        <p aria-live="polite" className={summaryLine()}>
          {skipped === 0
            ? `${saved} of ${manualCount} balances ready to save.`
            : `${saved} of ${manualCount} balances ready to save. Empty ones keep their earlier values.`}
        </p>
      ) : null}
    </Sheet>
  );
};

export default CheckInSheet;

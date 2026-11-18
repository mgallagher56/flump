import type { TaxRecord, TaxSource } from "@flump/finance-engine";
import { type ReactElement, useState } from "react";
import { useFetcher } from "react-router";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { versionField } from "~/services/conflict";
import { TaxReceiptDialog } from "../components/TaxReceiptDialog";
import { TaxRecordDialog, type TaxRecordDraft } from "../components/TaxRecordDialog";
import { recordAmount, selectableCategories } from "../tax-labels";

export const emptyTaxRecordDraft = (
  source: TaxSource,
  type: "income" | "expense",
  date: string,
): TaxRecordDraft => ({
  name: "",
  source,
  type,
  // A new PAYE record starts on a bonus: salary comes from the saved profile only.
  category: selectableCategories(source, type)[0]?.id ?? "",
  amount: null,
  date,
  frequency: "monthly",
  endDate: "",
  notes: "",
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  receiptCleared: false,
});

export const draftFromTaxRecord = (record: TaxRecord): TaxRecordDraft => ({
  name: record.name,
  source: record.source,
  type: record.type,
  category: record.category,
  amount: recordAmount(record),
  date: record.date,
  frequency: record.frequency,
  endDate: record.endDate || "",
  notes: record.notes || "",
  receiptFilename: record.receiptFilename,
  receiptMimeType: record.receiptMimeType,
  receiptData: null,
  receiptCleared: false,
});

/** The first day of a tax year ("2026/27" is 6 April 2026), where new records start. */
const firstDayOf = (taxYear: string): string =>
  `${taxYear.split("/")[0] || new Date().getFullYear().toString()}-04-06`;

export interface UseTaxRecordEditorOptions {
  /** The saved records, so an edit sends the latest saved version. */
  records: TaxRecord[];
  /** The page's tax year: new records start on its first day. */
  taxYear: string;
}

/**
 * Adding, editing, deleting and viewing the receipt of one tax record, shared by the Self
 * Assessment page and each income source's page. It owns the page's fetcher, which posts to the
 * route the page is on, and returns the dialogs to render once at the foot of the page.
 */
export function useTaxRecordEditor({ records, taxYear }: UseTaxRecordEditorOptions) {
  const fetcher = useFetcher();
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
  const [draft, setDraft] = useState<TaxRecordDraft>(() =>
    emptyTaxRecordDraft("self-employed", "income", firstDayOf(taxYear)),
  );
  const [recordToDelete, setRecordToDelete] = useState<TaxRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<TaxRecord | null>(null);

  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setRecordToDelete(null) });
  // A failed add or edit is said on the page, never dropped silently. The dialog closes only once
  // the save lands, so a failed save keeps what the user entered.
  const saveOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setIsRecordDialogOpen(false) });

  const openAdd = (source: TaxSource, type: "income" | "expense") => {
    setEditingRecord(null);
    setDraft(emptyTaxRecordDraft(source, type, firstDayOf(taxYear)));
    // A new dialog never opens with the alert from an earlier failed save.
    saveOutcome.dismiss();
    setIsRecordDialogOpen(true);
  };

  const openEdit = (record: TaxRecord) => {
    setEditingRecord(record);
    setDraft(draftFromTaxRecord(record));
    saveOutcome.dismiss();
    setIsRecordDialogOpen(true);
  };

  const requestDelete = (id: string) => setRecordToDelete(records.find((r) => r.id === id) ?? null);

  const save = (values: TaxRecordDraft) => {
    const payload = {
      intent: editingRecord ? "update-transaction" : "create-transaction",
      id: editingRecord?.id || "",
      // The saved record's version, so a change made elsewhere is not overwritten.
      ...versionField(records.find((r) => r.id === editingRecord?.id) ?? editingRecord),
      name: values.name,
      source: values.source,
      type: values.type,
      category: values.category,
      amount: values.amount === null ? "" : values.amount.toString(),
      date: values.date,
      frequency: values.frequency,
      endDate: values.endDate || undefined,
      notes: values.notes || undefined,
      receiptFilename: values.receiptFilename || undefined,
      receiptMimeType: values.receiptMimeType || undefined,
      receiptData: values.receiptData || undefined,
      // An omitted receipt keeps the stored one; clearing must be said explicitly.
      receiptClear: values.receiptCleared && !values.receiptData ? "1" : undefined,
    };
    // fetcher.submit turns an undefined value into the text "undefined", which the backend
    // rejects (an end date of "undefined"), so absent fields are left out of the form data.
    const formData = Object.fromEntries(
      Object.entries(payload).filter((entry): entry is [string, string] => entry[1] !== undefined),
    );
    saveOutcome.begin();
    fetcher.submit(formData, { method: "POST" });
  };

  const confirmDelete = () => {
    if (!recordToDelete) return;
    deleteOutcome.begin();
    fetcher.submit({ intent: "delete-transaction", id: recordToDelete.id }, { method: "POST" });
  };

  const dialogs: ReactElement = (
    <>
      <TaxRecordDialog
        open={isRecordDialogOpen}
        onOpenChange={(open) => {
          setIsRecordDialogOpen(open);
          if (!open) saveOutcome.dismiss();
        }}
        mode={editingRecord ? "edit" : "add"}
        initial={draft}
        onSave={save}
        saveError={saveOutcome.error}
      />
      <TaxReceiptDialog record={receiptRecord} onClose={() => setReceiptRecord(null)} />
      <ConfirmDialog
        open={recordToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRecordToDelete(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${recordToDelete?.name ?? "this record"}?`}
        description="It will no longer count towards your estimate. This cannot be undone."
        confirmLabel="Delete record"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </>
  );

  return {
    fetcher,
    saveOutcome,
    isRecordDialogOpen,
    openAdd,
    openEdit,
    requestDelete,
    viewReceipt: setReceiptRecord,
    dialogs,
  };
}

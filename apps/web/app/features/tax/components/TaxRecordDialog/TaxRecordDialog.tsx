import { SUPPORTED_UK_TAX_YEARS, type TaxRecord, type TaxSource } from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  CurrencyInput,
  controlProps,
  DatePicker,
  Dialog,
  FormField,
  Icon,
  Select,
  TextInput,
} from "@repo/ui";
import { Camera, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { type ChangeEvent, type FC, type FormEvent, useEffect, useRef, useState } from "react";
import { isAcceptableReceiptFile, RECEIPT_ACCEPT } from "~/containers/tax/receipt-file";
import { linkableAccountsFor, linkFits, type TaxAccount } from "../../linkedAccounts";
import {
  CATEGORY_HINT,
  categoryShortLabel,
  FREQUENCY_OPTIONS,
  SOURCE_OPTIONS,
  selectableCategories,
} from "../../tax-labels";
import {
  fieldRow,
  footer,
  form,
  moreDetails,
  receiptBox,
  receiptChosen,
  receiptHint,
  receiptLabel,
  receiptName,
  savedLine,
  saveErrorText,
  uploadLabel,
  uploadRow,
} from "./TaxRecordDialog.styles";

export interface TaxRecordDraft {
  name: string;
  source: TaxSource;
  type: "income" | "expense";
  category: string;
  /** `null` while the field is empty; never coerced to 0. */
  amount: number | null;
  date: string;
  frequency: TaxRecord["frequency"];
  endDate: string;
  notes: string;
  receiptFilename: string | null;
  receiptMimeType: string | null;
  /** Data URL of a newly chosen file only; stored receipts are fetched from the receipt route. */
  receiptData: string | null;
  /** The user removed a stored receipt. */
  receiptCleared: boolean;
  /** The account the record describes (slice 7), or null when not linked. */
  accountId?: string | null;
}

export interface TaxRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: TaxRecordDraft;
  onSave: (draft: TaxRecordDraft) => void;
  /** Why the last save failed, shown inside the dialog (the page behind a modal is hidden). */
  saveError?: string | null;
  /** The user's accounts, for the "Linked account" choice on rental and savings records. */
  accounts?: readonly TaxAccount[];
  /**
   * Adding only: saves this record and keeps the dialog open for the next one (E38 S2). The
   * caller then passes a fresh `initial` and `savedName`; the dialog moves the focus to Name.
   */
  onSaveAndAddAnother?: (draft: TaxRecordDraft) => void;
  /** The record just saved with "Add and start another", said quietly at the top of the form. */
  savedName?: string | null;
  /** Counts saves made with "Add and start another", so the same name is said again. */
  savedCount?: number;
  /** A save is on its way: both add buttons wait, so a second press cannot add the record twice. */
  pending?: boolean;
}

/** The Name field's id, so the focus can return to it for the next record. */
const NAME_FIELD_ID = "tax-record-name";

type Errors = Partial<Record<"name" | "amount" | "date" | "receipt" | "category", string>>;

/** A saved record whose category no list holds (saved before categories were checked). */
const UNLISTED_CATEGORY_ERROR = "Choose a category from the list.";

// The page lists records by tax year and offers only the years the engine supports, so a record
// dated outside them could be saved and then never shown. Its date must fall inside them.
const firstStart = Number(SUPPORTED_UK_TAX_YEARS[0].slice(0, 4));
const lastStart = Number(SUPPORTED_UK_TAX_YEARS[SUPPORTED_UK_TAX_YEARS.length - 1].slice(0, 4));
/** The first and last days of the supported tax years, as ISO dates. */
const EARLIEST_RECORD_DATE = `${firstStart}-04-06`;
const LATEST_RECORD_DATE = `${lastStart + 1}-04-05`;
export const RECORD_DATE_RANGE_ERROR = `Enter a date between 6 April ${firstStart} and 5 April ${lastStart + 1}.`;

const validate = (draft: TaxRecordDraft): Errors => {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = "Enter a name for this record.";
  if (draft.amount === null || draft.amount <= 0) errors.amount = "Enter an amount above £0.";
  if (!draft.date) errors.date = "Enter the date of the first payment.";
  else if (draft.date < EARLIEST_RECORD_DATE || draft.date > LATEST_RECORD_DATE) {
    errors.date = RECORD_DATE_RANGE_ERROR;
  }
  return errors;
};

/** Add or edit one tax record. Holds the draft; the container builds the submitted payload. */
export const TaxRecordDialog: FC<TaxRecordDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
  saveError,
  accounts = [],
  onSaveAndAddAnother,
  savedName,
  savedCount = 0,
  pending = false,
}) => {
  const [draft, setDraft] = useState<TaxRecordDraft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [lastInitial, setLastInitial] = useState(initial);
  // Set by "Add and start another": when the next blank record arrives, Name takes the focus.
  const focusNameNext = useRef(false);

  // Reset when the dialog is reopened for a different record.
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setDraft(initial);
    setErrors({});
  }

  const set = <K extends keyof TaxRecordDraft>(key: K, value: TaxRecordDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // A record saved as PAYE salary keeps that category on offer; a new record never has it.
  const keptCategory = mode === "edit" ? initial.category : undefined;
  const changeSourceOrType = (source: TaxSource, type: "income" | "expense") =>
    setDraft((d) => ({
      ...d,
      source,
      type,
      category: selectableCategories(source, type, keptCategory)[0]?.id ?? "",
      // A link to an account that does not fit the new source is cleared.
      accountId: linkFits(source, d.accountId, accounts) ? d.accountId : null,
    }));

  const categories = selectableCategories(draft.source, draft.type, keptCategory);
  const linkable = linkableAccountsFor(draft.source, accounts);
  const linkedAccountId = linkFits(draft.source, draft.accountId, accounts)
    ? (draft.accountId as string)
    : "";

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAcceptableReceiptFile(file)) {
      e.target.value = "";
      setErrors((x) => ({ ...x, receipt: "Use a PNG, JPEG, WebP or PDF file up to 5 MB." }));
      return;
    }
    setErrors((x) => ({ ...x, receipt: undefined }));
    const reader = new FileReader();
    reader.onloadend = () =>
      setDraft((d) => ({
        ...d,
        receiptFilename: file.name,
        receiptMimeType: file.type,
        receiptData: reader.result as string,
        receiptCleared: false,
      }));
    reader.readAsDataURL(file);
  };

  const clearReceipt = () =>
    setDraft((d) => ({
      ...d,
      receiptFilename: null,
      receiptMimeType: null,
      receiptData: null,
      receiptCleared: true,
    }));

  /** The draft to save, or null (with the errors shown) when it is not complete. */
  const checked = (): TaxRecordDraft | null => {
    const found = validate(draft);
    if (!categories.some((c) => c.id === draft.category)) found.category = UNLISTED_CATEGORY_ERROR;
    setErrors(found);
    if (Object.keys(found).length > 0) return null;
    return { ...draft, accountId: linkedAccountId || null };
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    focusNameNext.current = false;
    const ready = checked();
    if (ready) onSave(ready);
  };

  const saveAndAddAnother = () => {
    if (pending) return;
    const ready = checked();
    if (!ready || !onSaveAndAddAnother) return;
    focusNameNext.current = true;
    onSaveAndAddAnother(ready);
  };

  // The next blank record has arrived after "Add and start another": start it at Name.
  useEffect(() => {
    if (!focusNameNext.current || !savedName) return;
    focusNameNext.current = false;
    document.getElementById(NAME_FIELD_ID)?.focus();
  }, [savedName, lastInitial]);

  const isPdf = draft.receiptMimeType?.includes("pdf");
  // Open "Category and notes" when editing a record that already has notes, so they are never hidden.
  // Also open it when the saved category is not on the list, so its error is never hidden.
  const initialUnlisted = !selectableCategories(initial.source, initial.type, keptCategory).some(
    (c) => c.id === initial.category,
  );
  const hasDetails = initial.notes.trim() !== "" || initialUnlisted;
  const draftUnlisted = !categories.some((c) => c.id === draft.category);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={mode === "edit" ? "Edit record" : "Add a record"}
      description="Income or an expense for one of your income sources. Regular records repeat until their end date."
      id="tax-record-dialog"
    >
      <form className={form()} noValidate onSubmit={submit}>
        {/* Always on the page while adding, so a screen reader hears each new line said into it. */}
        {mode === "add" ? (
          <p className={savedLine()} role="status">
            {savedName ? (
              <span key={savedCount}>{`${savedName} added. Add the next record.`}</span>
            ) : null}
          </p>
        ) : null}
        {/* Amount comes straight after the name; category and notes wait under a toggle named for them. */}
        <FormField id={NAME_FIELD_ID} label="Name" required error={errors.name}>
          {(field) => (
            <TextInput
              {...controlProps(field)}
              autoComplete="off"
              placeholder="For example, flat rent"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          )}
        </FormField>
        <div className={fieldRow()}>
          <FormField
            label="Amount"
            required
            error={errors.amount}
            hint={draft.frequency === "one-off" ? undefined : "Per payment"}
          >
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                value={draft.amount}
                onValueChange={(v) => set("amount", v)}
              />
            )}
          </FormField>
          <FormField label="How often">
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                value={draft.frequency}
                onChange={(e) => set("frequency", e.target.value as TaxRecord["frequency"])}
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
        <div className={fieldRow()}>
          <FormField
            label={draft.frequency === "one-off" ? "Date" : "First payment"}
            required
            error={errors.date}
          >
            {(field) => (
              <DatePicker
                {...controlProps(field)}
                clearable={false}
                max={LATEST_RECORD_DATE}
                min={EARLIEST_RECORD_DATE}
                value={draft.date}
                onValueChange={(next) => set("date", next)}
              />
            )}
          </FormField>
          {draft.frequency !== "one-off" ? (
            <FormField label="End date (optional)" hint="Leave empty if it carries on.">
              {(field) => (
                <DatePicker
                  {...controlProps(field)}
                  value={draft.endDate}
                  onValueChange={(next) => set("endDate", next)}
                />
              )}
            </FormField>
          ) : null}
        </div>
        <div className={fieldRow()}>
          <FormField label="Income source">
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                value={draft.source}
                onChange={(e) => changeSourceOrType(e.target.value as TaxSource, draft.type)}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Type">
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                value={draft.type}
                onChange={(e) =>
                  changeSourceOrType(draft.source, e.target.value as "income" | "expense")
                }
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>
            )}
          </FormField>
        </div>
        {linkable.length > 0 ? (
          <FormField
            label="Linked account"
            hint={
              draft.source === "rental"
                ? "The property or mortgage this record is for. Its share on Accounts is used."
                : "The account this income comes from."
            }
          >
            {(field) => (
              <Select
                id={field.id}
                aria-describedby={field.describedBy}
                value={linkedAccountId}
                onChange={(e) => set("accountId", e.target.value || null)}
              >
                <option value="">Not linked</option>
                {linkable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name?.trim() || "Unnamed account"}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        ) : null}
        <div className={receiptBox()}>
          <span className={receiptLabel()} id="tax-receipt-label">
            Receipt (optional)
          </span>
          <p className={receiptHint()}>An image or PDF up to 5 MB.</p>
          {draft.receiptFilename ? (
            <div className={receiptChosen()}>
              <span className={receiptName()}>
                <Icon icon={isPdf ? FileText : ImageIcon} size="sm" />
                <span>{draft.receiptFilename}</span>
              </span>
              <Button size="sm" type="button" variant="dangerSubtle" onClick={clearReceipt}>
                Remove receipt
              </Button>
            </div>
          ) : (
            <div className={uploadRow()}>
              <label className={uploadLabel()}>
                <Icon icon={Upload} size="sm" />
                Upload a file
                <input
                  accept={RECEIPT_ACCEPT}
                  aria-describedby="tax-receipt-label"
                  type="file"
                  onChange={onFile}
                />
              </label>
              <label className={uploadLabel()}>
                <Icon icon={Camera} size="sm" />
                Take a photo
                <input
                  accept={RECEIPT_ACCEPT}
                  aria-describedby="tax-receipt-label"
                  capture="environment"
                  type="file"
                  onChange={onFile}
                />
              </label>
            </div>
          )}
          {errors.receipt ? (
            <p className={receiptHint()} role="alert">
              {errors.receipt}
            </p>
          ) : null}
        </div>
        {saveError ? (
          <p className={saveErrorText()} role="alert">
            {saveError}
          </p>
        ) : null}
        <CollapsibleDrawer title="Category and notes" variant="quiet" defaultOpen={hasDetails}>
          <div className={moreDetails()}>
            <FormField
              label="Category"
              hint={CATEGORY_HINT[draft.category]}
              error={errors.category}
            >
              {(field) => (
                <Select
                  id={field.id}
                  aria-describedby={field.describedBy}
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {draftUnlisted ? (
                    <option value={draft.category} disabled>
                      Choose a category
                    </option>
                  ) : null}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryShortLabel(c)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Notes (optional)">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  autoComplete="off"
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              )}
            </FormField>
          </div>
        </CollapsibleDrawer>
        <div className={footer({ stacked: mode === "add" && Boolean(onSaveAndAddAnother) })}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "add" && onSaveAndAddAnother ? (
            <Button type="button" variant="secondary" onClick={saveAndAddAnother} pending={pending}>
              Add and start another
            </Button>
          ) : null}
          <Button type="submit" variant="primary" pending={pending}>
            {mode === "edit" ? "Save changes" : "Add record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

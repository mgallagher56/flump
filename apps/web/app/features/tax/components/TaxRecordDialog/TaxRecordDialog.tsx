import { getCategoriesForSource, type TaxRecord, type TaxSource } from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  Select,
  TextInput,
} from "@repo/ui";
import { Camera, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { type ChangeEvent, type FC, type FormEvent, useState } from "react";
import { isAcceptableReceiptFile, RECEIPT_ACCEPT } from "~/containers/tax/receipt-file";
import { FREQUENCY_OPTIONS, SOURCE_OPTIONS } from "../../tax-labels";
import {
  fieldRow,
  footer,
  form,
  receiptBox,
  receiptChosen,
  receiptHint,
  receiptLabel,
  receiptName,
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
}

export interface TaxRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial: TaxRecordDraft;
  onSave: (draft: TaxRecordDraft) => void;
}

type Errors = Partial<Record<"name" | "amount" | "date" | "receipt", string>>;

const validate = (draft: TaxRecordDraft): Errors => {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = "Enter a name for this record.";
  if (draft.amount === null || draft.amount <= 0) errors.amount = "Enter an amount above £0.";
  if (!draft.date) errors.date = "Enter the date of the first payment.";
  return errors;
};

/** Add or edit one tax record. Holds the draft; the container builds the submitted payload. */
export const TaxRecordDialog: FC<TaxRecordDialogProps> = ({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
}) => {
  const [draft, setDraft] = useState<TaxRecordDraft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [lastInitial, setLastInitial] = useState(initial);

  // Reset when the dialog is reopened for a different record.
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setDraft(initial);
    setErrors({});
  }

  const set = <K extends keyof TaxRecordDraft>(key: K, value: TaxRecordDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const changeSourceOrType = (source: TaxSource, type: "income" | "expense") =>
    setDraft((d) => ({
      ...d,
      source,
      type,
      category: getCategoriesForSource(source, type)[0]?.id ?? "",
    }));

  const categories = getCategoriesForSource(draft.source, draft.type);

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(draft);
  };

  const isPdf = draft.receiptMimeType?.includes("pdf");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={mode === "edit" ? "Edit record" : "Add a record"}
      description="Income or a cost for one of your income sources. Regular records repeat until their end date."
      id="tax-record-dialog"
    >
      <form className={form()} noValidate onSubmit={submit}>
        <FormField label="Name" required error={errors.name}>
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
                <option value="expense">Cost</option>
              </Select>
            )}
          </FormField>
        </div>

        <FormField label="Category">
          {(field) => (
            <Select
              id={field.id}
              aria-describedby={field.describedBy}
              value={draft.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
              <TextInput
                {...controlProps(field)}
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            )}
          </FormField>
          {draft.frequency !== "one-off" ? (
            <FormField label="End date (optional)" hint="Leave empty if it carries on.">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              )}
            </FormField>
          ) : null}
        </div>

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
              <Button size="sm" type="button" variant="ghost" onClick={clearReceipt}>
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

        <div className={footer()}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {mode === "edit" ? "Save changes" : "Add record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default TaxRecordDialog;

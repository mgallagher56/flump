import { Button, CurrencyInput, controlProps, Dialog, FormField, TextInput } from "@repo/ui";
import { type FC, type FormEvent, useState } from "react";
import type { BudgetEntry } from "~/types/budget";
import {
  checkbox,
  checkboxLabel,
  entryForm,
  fieldRow,
  formActions,
  nativeSelect,
} from "./BudgetEntryDialog.styles";

export interface EntryFormValues {
  name: string;
  /** `null` until the user types an amount. */
  amount: number | null;
  frequency: BudgetEntry["frequency"];
  notes: string;
  isEssential: boolean;
  contractEndDate: string;
}

export const EMPTY_ENTRY_VALUES: EntryFormValues = {
  name: "",
  amount: null,
  frequency: "monthly",
  notes: "",
  isEssential: true,
  contractEndDate: "",
};

export interface BudgetEntryDialogProps {
  mode: "add" | "edit";
  initial: EntryFormValues;
  categoryLabel: string;
  isIncome: boolean;
  /** Bills can carry a contract end date for the renewal reminders. */
  showContractDate: boolean;
  saving: boolean;
  onSave: (values: EntryFormValues) => void;
  onClose: () => void;
}

/** Add or edit one budget entry. Mount it only while open so the form restarts from `initial`. */
export const BudgetEntryDialog: FC<BudgetEntryDialogProps> = ({
  mode,
  initial,
  categoryLabel,
  isIncome,
  showContractDate,
  saving,
  onSave,
  onClose,
}) => {
  const [values, setValues] = useState<EntryFormValues>(initial);
  const set = <K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canSave = values.name.trim().length > 0 && values.amount !== null && !saving;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSave) onSave(values);
  };

  return (
    <Dialog
      id="budget-entry-dialog"
      open
      title={mode === "add" ? `Add to ${categoryLabel.toLowerCase()}` : "Edit entry"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form className={entryForm()} onSubmit={submit}>
        <FormField label="Name" required>
          {(field) => (
            <TextInput
              {...controlProps(field)}
              placeholder="For example, TV subscription"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          )}
        </FormField>
        <div className={fieldRow()}>
          <FormField label="Amount" required>
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                value={values.amount}
                onValueChange={(amount) => set("amount", amount)}
              />
            )}
          </FormField>
          <FormField label="How often">
            {(field) => (
              <select
                className={nativeSelect()}
                id={field.id}
                value={values.frequency}
                onChange={(e) => set("frequency", e.target.value as BudgetEntry["frequency"])}
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            )}
          </FormField>
        </div>
        <FormField label="Notes (optional)">
          {(field) => (
            <TextInput
              {...controlProps(field)}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          )}
        </FormField>
        {showContractDate && (
          <FormField
            label="Contract end date (optional)"
            hint="We show a renewal note 30 days before this date."
          >
            {(field) => (
              <TextInput
                {...controlProps(field)}
                type="date"
                value={values.contractEndDate}
                onChange={(e) => set("contractEndDate", e.target.value)}
              />
            )}
          </FormField>
        )}
        {!isIncome && (
          <label className={checkboxLabel()}>
            <input
              checked={values.isEssential}
              className={checkbox()}
              type="checkbox"
              onChange={(e) => set("isEssential", e.target.checked)}
            />
            Essential spending
          </label>
        )}
        <div className={formActions()}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSave} type="submit">
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

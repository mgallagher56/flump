import { Button, CurrencyInput, controlProps, Dialog, FormField, TextInput } from "@repo/ui";
import { type FC, type FormEvent, useState } from "react";
import { useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { accountForm, fieldRow, formActions, nativeSelect } from "./AddSavingsAccountDialog.styles";

export interface AddSavingsAccountDialogProps {
  accountToEdit?: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

type SavingsType = "Saving" | "Investment";

const toNumberOrNull = (value: unknown): number | null =>
  value !== undefined && value !== null && Number.isFinite(Number(value)) ? Number(value) : null;

interface AccountFormProps {
  accountToEdit?: Account | null;
  onClose: () => void;
}

/** Mounted only while the dialog is open, so the fields restart from the account being edited. */
const AccountForm: FC<AccountFormProps> = ({ accountToEdit, onClose }) => {
  const fetcher = useFetcher();
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || "");
  const [type, setType] = useState<SavingsType>(
    accountToEdit?.type === "Investment" ? "Investment" : "Saving",
  );
  const [balance, setBalance] = useState<number | null>(toNumberOrNull(accountToEdit?.balance));
  const [interestRate, setInterestRate] = useState<string>(
    accountToEdit?.interestRate !== undefined && accountToEdit.interestRate !== null
      ? String(accountToEdit.interestRate)
      : "4.5",
  );
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    accountToEdit ? toNumberOrNull(accountToEdit.monthlyContribution) : 100,
  );

  const canSave = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    fetcher.submit(
      {
        intent: isEditing ? "updateSavingsAccount" : "createSavingsAccount",
        accountId: accountToEdit?.id || "",
        name: name.trim(),
        type,
        balance: String(Number(balance) || 0),
        interestRate: interestRate !== "" ? String(Number(interestRate) || 0) : "0",
        monthlyContribution: String(Number(monthlyContribution) || 0),
      },
      { method: "POST", action: "/app/savings" },
    );
    onClose();
  };

  return (
    <form className={accountForm()} onSubmit={submit}>
      <FormField label="Account name" required>
        {(field) => (
          <TextInput
            {...controlProps(field)}
            placeholder="For example, Marcus easy access or Vanguard ISA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>

      <FormField label="Account type">
        {(field) => (
          // TODO(E15 T2.2b): swap for @repo/ui Select
          <select
            className={nativeSelect()}
            id={field.id}
            value={type}
            onChange={(e) => setType(e.target.value as SavingsType)}
          >
            <option value="Saving">Savings account or cash ISA</option>
            <option value="Investment">Investment or stocks and shares ISA</option>
          </select>
        )}
      </FormField>

      <div className={fieldRow()}>
        <FormField label="Current balance">
          {(field) => (
            <CurrencyInput {...controlProps(field)} value={balance} onValueChange={setBalance} />
          )}
        </FormField>
        <FormField label="Interest rate (AER, %)">
          {(field) => (
            <TextInput
              {...controlProps(field)}
              inputMode="decimal"
              max="100"
              min="0"
              placeholder="For example, 4.5"
              step="any"
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          )}
        </FormField>
      </div>

      <FormField hint="What you put into this account each month." label="Saved each month">
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            value={monthlyContribution}
            onValueChange={setMonthlyContribution}
          />
        )}
      </FormField>

      <div className={formActions()}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canSave} type="submit">
          {isEditing ? "Save changes" : "Add account"}
        </Button>
      </div>
    </form>
  );
};

export const AddSavingsAccountDialog: FC<AddSavingsAccountDialogProps> = ({
  accountToEdit,
  isOpen,
  onClose,
}) => (
  <Dialog
    id="savings-account-dialog"
    open={isOpen}
    title={accountToEdit ? "Edit savings account" : "Add a savings account"}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    {isOpen && (
      <AccountForm
        key={accountToEdit?.id ?? "new"}
        accountToEdit={accountToEdit}
        onClose={onClose}
      />
    )}
  </Dialog>
);

export default AddSavingsAccountDialog;

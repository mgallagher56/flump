import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  InlineAlert,
  PercentInput,
  Select,
  TextInput,
} from "@repo/ui";
import { Trash2 } from "lucide-react";
import { type FC, type FormEvent, useState } from "react";
import { useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import {
  INVESTMENT_SUBTYPE_OPTIONS,
  SAVINGS_SUBTYPE_OPTIONS,
} from "~/features/accounts/accountSubtypes";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { versionField } from "~/services/conflict";
import { isIsaAccount } from "../SavingsAccountsList/isaAllowance.utils";
import { accountForm, deleteAction, fieldRow, formActions } from "./AddSavingsAccountDialog.styles";

export interface AddSavingsAccountDialogProps {
  accountToEdit?: Account | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Editing only: shows "Delete account" in the dialog. The caller closes the dialog and asks for
   * confirmation before anything is deleted.
   */
  onDeleteRequest?: () => void;
}

type SavingsType = "Saving" | "Investment";

const ALL_SUBTYPE_OPTIONS = [
  ...SAVINGS_SUBTYPE_OPTIONS.map((o) => ({ ...o, type: "Saving" as SavingsType })),
  ...INVESTMENT_SUBTYPE_OPTIONS.map((o) => ({ ...o, type: "Investment" as SavingsType })),
];

const inferInitialSubtype = (account?: Account | null): string => {
  if (account?.accountSubtype) return account.accountSubtype;
  if (account?.type === "Investment") {
    return isIsaAccount(account?.name) ? "stocks_and_shares_isa" : "general_investment";
  }
  if (account?.type === "Saving") {
    return isIsaAccount(account?.name) ? "cash_isa" : "easy_access";
  }
  return "easy_access";
};

const toNumberOrNull = (value: unknown): number | null =>
  value !== undefined && value !== null && Number.isFinite(Number(value)) ? Number(value) : null;

interface AccountFormProps {
  accountToEdit?: Account | null;
  onClose: () => void;
  onDeleteRequest?: () => void;
}

/** Mounted only while the dialog is open, so the fields restart from the account being edited. */
const AccountForm: FC<AccountFormProps> = ({ accountToEdit, onClose, onDeleteRequest }) => {
  const fetcher = useFetcher();
  // The dialog closes only once the save lands, so a refused save keeps what was typed.
  const saveOutcome = useFetcherOutcome(fetcher, { onSuccess: onClose });
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || "");
  const [accountSubtype, setAccountSubtype] = useState<string>(() =>
    inferInitialSubtype(accountToEdit),
  );
  const type: SavingsType =
    ALL_SUBTYPE_OPTIONS.find((o) => o.value === accountSubtype)?.type ??
    (accountToEdit?.type === "Investment" ? "Investment" : "Saving");
  const isInvestment = type === "Investment";
  const [balance, setBalance] = useState<number | null>(toNumberOrNull(accountToEdit?.balance));
  // No assumed defaults: a new account starts with an empty rate and monthly amount, and empty
  // fields are saved as "not set" rather than 0.
  const [interestRate, setInterestRate] = useState<number | null>(
    toNumberOrNull(accountToEdit?.interestRate),
  );
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    toNumberOrNull(accountToEdit?.monthlyContribution),
  );

  const canSave = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || saveOutcome.pending) return;

    saveOutcome.begin();
    fetcher.submit(
      {
        intent: isEditing ? "updateSavingsAccount" : "createSavingsAccount",
        accountId: accountToEdit?.id || "",
        ...versionField(accountToEdit),
        name: name.trim(),
        type,
        accountSubtype,
        balance: String(Number(balance) || 0),
        interestRate: interestRate === null ? "" : String(interestRate),
        monthlyContribution: monthlyContribution === null ? "" : String(monthlyContribution),
      },
      { method: "POST", action: "/app/savings" },
    );
  };

  return (
    <form className={accountForm()} onSubmit={submit}>
      <FormField label="Account name" required>
        {(field) => (
          <TextInput
            {...controlProps(field)}
            placeholder="For example, easy access savings or Cash ISA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>

      <FormField label="Account type">
        {(field) => (
          <Select
            {...controlProps(field)}
            options={ALL_SUBTYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={accountSubtype}
            onChange={(e) => setAccountSubtype(e.target.value)}
          />
        )}
      </FormField>

      <div className={fieldRow()}>
        <FormField label="Current balance">
          {(field) => (
            <CurrencyInput {...controlProps(field)} value={balance} onValueChange={setBalance} />
          )}
        </FormField>
        <FormField
          hint={
            isInvestment
              ? "Used for projections only. Investment returns vary and are not guaranteed."
              : undefined
          }
          label={isInvestment ? "Estimated annual return (%)" : "Interest rate (AER)"}
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              max={100}
              min={0}
              value={interestRate}
              onValueChange={setInterestRate}
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

      {saveOutcome.error ? <InlineAlert tone="danger">{saveOutcome.error}</InlineAlert> : null}

      <div className={formActions()}>
        {isEditing && onDeleteRequest ? (
          <span className={deleteAction()}>
            <Button type="button" variant="ghost" onClick={onDeleteRequest}>
              <Icon icon={Trash2} size="sm" />
              Delete account
            </Button>
          </span>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canSave || saveOutcome.pending} type="submit">
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
  onDeleteRequest,
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
        onDeleteRequest={onDeleteRequest}
      />
    )}
  </Dialog>
);

export default AddSavingsAccountDialog;

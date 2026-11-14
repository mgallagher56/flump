import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  PercentInput,
  TextInput,
} from "@repo/ui";
import { type FC, type FormEvent, type ReactNode, useState } from "react";
import { useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import {
  accountForm,
  fieldRow,
  formActions,
  statusGroup,
  statusHint,
  statusLegend,
  statusName,
  statusOption,
  statusOptions,
} from "./AddPensionAccountDialog.styles";

export interface AddPensionAccountDialogProps {
  accountToEdit?: Account | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional trigger rendered beside the dialog. The caller wires its `onClick` to open the
   * dialog. There is no default trigger: the page header owns "Add pension pot".
   */
  triggerButton?: ReactNode;
}

const COMMON_PROVIDERS = [
  "Nest",
  "Aviva",
  "Scottish Widows",
  "The People's Pension",
  "Legal & General",
  "Vanguard SIPP",
  "Hargreaves Lansdown SIPP",
  "AJ Bell",
  "Standard Life",
  "Fidelity",
];

const DEFAULT_RATE = 5;

const toNumberOrNull = (value: unknown): number | null =>
  value !== undefined && value !== null && Number.isFinite(Number(value)) ? Number(value) : null;

interface PotFormProps {
  accountToEdit?: Account | null;
  onClose: () => void;
}

/** Mounted only while the dialog is open, so the fields restart from the pot being edited. */
const PotForm: FC<PotFormProps> = ({ accountToEdit, onClose }) => {
  const fetcher = useFetcher();
  const isEditing = !!accountToEdit;

  const [name, setName] = useState(accountToEdit?.name || "");
  const [balance, setBalance] = useState<number | null>(toNumberOrNull(accountToEdit?.balance));
  const [interestRate, setInterestRate] = useState<number | null>(
    accountToEdit ? toNumberOrNull(accountToEdit.interestRate) : DEFAULT_RATE,
  );
  const [isCurrent, setIsCurrent] = useState<boolean>(accountToEdit?.isCurrent !== false);
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    accountToEdit?.isCurrent !== false ? toNumberOrNull(accountToEdit?.monthlyContribution) : null,
  );

  const canSave = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    fetcher.submit(
      {
        intent: isEditing ? "updatePensionAccount" : "createPensionAccount",
        ...(isEditing && accountToEdit?.id ? { accountId: accountToEdit.id } : {}),
        name: name.trim(),
        balance: balance === null ? (isEditing ? "" : "0") : String(balance),
        interestRate:
          interestRate === null ? (isEditing ? "" : String(DEFAULT_RATE)) : String(interestRate),
        isCurrent: String(isCurrent),
        monthlyContribution:
          isCurrent && monthlyContribution !== null ? String(monthlyContribution) : "",
      },
      { method: "POST", action: "/app/pension" },
    );
    onClose();
  };

  return (
    <form className={accountForm()} onSubmit={submit}>
      <FormField
        hint="The workplace pension, personal pension or self-invested personal pension (SIPP) this pot is in."
        label="Pot or provider name"
        required
      >
        {(field) => (
          <>
            <TextInput
              {...controlProps(field)}
              list="pension-provider-suggestions"
              placeholder="For example, Nest Workplace Pension or Vanguard SIPP"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <datalist id="pension-provider-suggestions">
              {COMMON_PROVIDERS.map((provider) => (
                <option key={provider} value={provider} />
              ))}
            </datalist>
          </>
        )}
      </FormField>

      <fieldset className={statusGroup()}>
        <legend className={statusLegend()}>Pot status</legend>
        <div className={statusOptions()}>
          <label className={statusOption({ selected: isCurrent })}>
            <input
              checked={isCurrent}
              name="pot-status"
              type="radio"
              value="current"
              onChange={() => setIsCurrent(true)}
            />
            <span>
              <span className={statusName()}>Current pot</span>
              <span className={statusHint()}>Active workplace pension or SIPP</span>
            </span>
          </label>
          <label className={statusOption({ selected: !isCurrent })}>
            <input
              checked={!isCurrent}
              name="pot-status"
              type="radio"
              value="past"
              onChange={() => {
                setIsCurrent(false);
                setMonthlyContribution(null);
              }}
            />
            <span>
              <span className={statusName()}>Past pot</span>
              <span className={statusHint()}>Previous employer or frozen pot</span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className={fieldRow()}>
        <FormField label="Current value">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={balance}
              onValueChange={setBalance}
            />
          )}
        </FormField>
        <FormField label="Assumed growth a year">
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              max={25}
              min={0}
              value={interestRate}
              onValueChange={setInterestRate}
            />
          )}
        </FormField>
      </div>

      <FormField
        hint={
          isCurrent
            ? "A fixed amount you pay in yourself. Leave blank if payments come from your salary."
            : "Past pots take no regular payments. Their value can still change with investment returns."
        }
        label="Regular payment each month (optional)"
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            disabled={!isCurrent}
            min={0}
            placeholder={isCurrent ? "From salary" : "None for past pots"}
            value={isCurrent ? monthlyContribution : null}
            onValueChange={setMonthlyContribution}
          />
        )}
      </FormField>

      <div className={formActions()}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canSave} type="submit">
          {isEditing ? "Save changes" : "Add pot"}
        </Button>
      </div>
    </form>
  );
};

export const AddPensionAccountDialog: FC<AddPensionAccountDialogProps> = ({
  accountToEdit,
  isOpen,
  onClose,
  triggerButton,
}) => (
  <>
    {triggerButton}
    <Dialog
      id="pension-account-dialog"
      open={isOpen}
      title={accountToEdit ? "Edit pension pot" : "Add a pension pot"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {isOpen && (
        <PotForm key={accountToEdit?.id ?? "new"} accountToEdit={accountToEdit} onClose={onClose} />
      )}
    </Dialog>
  </>
);

export default AddPensionAccountDialog;

import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  InlineAlert,
  PercentInput,
  TextInput,
} from "@repo/ui";
import { Trash2 } from "lucide-react";
import { type FC, type FormEvent, type ReactNode, useState } from "react";
import { useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { accountFieldSet } from "~/features/accounts/accountFieldSet";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { versionField } from "~/services/conflict";
import {
  accountForm,
  deleteAction,
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
  /**
   * Editing only: shows "Delete pot" in the dialog. The caller closes the dialog and asks for
   * confirmation before anything is deleted.
   */
  onDeleteRequest?: () => void;
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

const toNumberOrNull = (value: unknown): number | null =>
  value !== undefined && value !== null && Number.isFinite(Number(value)) ? Number(value) : null;

interface PotFormProps {
  accountToEdit?: Account | null;
  onClose: () => void;
  onDeleteRequest?: () => void;
}

/** Mounted only while the dialog is open, so the fields restart from the pot being edited. */
const PotForm: FC<PotFormProps> = ({ accountToEdit, onClose, onDeleteRequest }) => {
  const fetcher = useFetcher();
  // The dialog closes only once the save lands, so a refused save keeps what was typed.
  const saveOutcome = useFetcherOutcome(fetcher, { onSuccess: onClose });
  const isEditing = !!accountToEdit;

  // What the form opened with, so an edit sends only what the user changed: a re-sent value
  // writes a history row for this month, so an untouched one is never sent (slice 4).
  const [opened] = useState(() => ({
    name: accountToEdit?.name || "",
    balance: toNumberOrNull(accountToEdit?.balance),
    // Blank by default: no rate means the page asks for one, never an assumed figure.
    interestRate: toNumberOrNull(accountToEdit?.interestRate),
    isCurrent: accountToEdit?.isCurrent !== false,
    monthlyContribution:
      accountToEdit?.isCurrent !== false
        ? toNumberOrNull(accountToEdit?.monthlyContribution)
        : null,
  }));
  const [name, setName] = useState(opened.name);
  const [balance, setBalance] = useState<number | null>(opened.balance);
  const [interestRate, setInterestRate] = useState<number | null>(opened.interestRate);
  const [isCurrent, setIsCurrent] = useState<boolean>(opened.isCurrent);
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(
    opened.monthlyContribution,
  );
  // The labels come from the one field set for a pension, shared with the Accounts dialog.
  const fieldSet = accountFieldSet({ type: "Pension" });

  const canSave = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || saveOutcome.pending) return;
    const monthly = isCurrent ? monthlyContribution : null;
    const values = {
      name: name.trim(),
      // A cleared value on an add is £0; a cleared value on an edit is not sent.
      balance: balance === null ? (isEditing ? "" : "0") : String(balance),
      // A cleared rate is saved as unset, never as an assumed figure.
      interestRate: interestRate === null ? "" : String(interestRate),
      isCurrent: String(isCurrent),
      monthlyContribution: monthly === null ? "" : String(monthly),
    };
    const changed = isEditing
      ? {
          ...(values.name !== opened.name ? { name: values.name } : {}),
          ...(balance !== null && balance !== opened.balance ? { balance: values.balance } : {}),
          ...(interestRate !== opened.interestRate ? { interestRate: values.interestRate } : {}),
          ...(isCurrent !== opened.isCurrent ? { isCurrent: values.isCurrent } : {}),
          ...(monthly !== opened.monthlyContribution
            ? { monthlyContribution: values.monthlyContribution }
            : {}),
        }
      : values;
    saveOutcome.begin();
    fetcher.submit(
      {
        intent: isEditing ? "updatePensionAccount" : "createPensionAccount",
        ...(isEditing && accountToEdit?.id
          ? { accountId: accountToEdit.id, ...versionField(accountToEdit) }
          : {}),
        ...changed,
      },
      { method: "POST", action: "/app/pension" },
    );
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
        <FormField label={fieldSet.interestRate?.label ?? "Assumed growth a year (optional)"}>
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
            ? "Paid into this pot on top of your workplace contributions from salary. Leave blank if there is none."
            : "Past pots take no regular payments. Their value can still change with investment returns."
        }
        label={fieldSet.monthlyContribution?.label ?? "Extra paid in each month (optional)"}
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            disabled={!isCurrent}
            min={0}
            placeholder={isCurrent ? "None" : "None for past pots"}
            value={isCurrent ? monthlyContribution : null}
            onValueChange={setMonthlyContribution}
          />
        )}
      </FormField>

      {saveOutcome.error ? <InlineAlert tone="danger">{saveOutcome.error}</InlineAlert> : null}

      <div className={formActions()}>
        {isEditing && onDeleteRequest ? (
          <span className={deleteAction()}>
            <Button type="button" variant="dangerSubtle" onClick={onDeleteRequest}>
              <Icon icon={Trash2} size="sm" />
              Delete pot
            </Button>
          </span>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canSave || saveOutcome.pending} type="submit">
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
  onDeleteRequest,
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
        <PotForm
          key={accountToEdit?.id ?? "new"}
          accountToEdit={accountToEdit}
          onClose={onClose}
          onDeleteRequest={onDeleteRequest}
        />
      )}
    </Dialog>
  </>
);

export default AddPensionAccountDialog;

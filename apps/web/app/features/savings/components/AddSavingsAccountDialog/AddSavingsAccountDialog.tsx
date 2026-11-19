import {
  type AccountOwnership,
  DEFAULT_JOINT_SHARE_PERCENT,
  describeJointWholeValue,
  INVESTMENT_RISK_NOTICE,
  isIsaAccount,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  Icon,
  InfoTip,
  InlineAlert,
  PercentInput,
  Select,
  TextInput,
} from "@repo/ui";
import { Trash2 } from "lucide-react";
import { type FC, type FormEvent, useState } from "react";
import { useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { accountFieldSet } from "~/features/accounts/accountFieldSet";
import {
  JointOwnershipFields,
  resolveSharePercent,
} from "~/features/accounts/components/JointOwnershipFields";
import {
  SAVINGS_KIND_GROUPS,
  savingsKindFromValue,
  savingsKindValueFor,
} from "~/features/accounts/savingsKinds";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { versionField } from "~/services/conflict";
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

/** InfoTip descriptions the fields name in aria-describedby (owner item 23). */
const RETURN_INFO_ID = "savings-account-return-info";
const MONTHLY_INFO_ID = "savings-account-monthly-info";

export const ISA_BECOMES_SOLE_NOTICE =
  "An ISA cannot be held jointly. Saving this makes the account yours only.";

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
  // One choice names the kind, and with it the stored type and subtype. A new account starts with
  // none chosen; an edited one starts from what is saved, and one saved without a subtype shows
  // its type's "Other" kind, so nothing is saved that the user did not choose.
  const [initialKindValue] = useState<string>(() =>
    accountToEdit ? savingsKindValueFor(accountToEdit.type, accountToEdit.accountSubtype) : "",
  );
  const [kindValue, setKindValue] = useState<string>(initialKindValue);
  const kind = savingsKindFromValue(kindValue);
  // Editing without touching the select keeps the stored type and subtype exactly as saved: the
  // select can only show the nearest kind (a subtype that does not belong to its type shows as
  // "Other"), so its value is sent only when the user changes it.
  const kindChanged = !isEditing || kindValue !== initialKindValue;
  const subtypeToSave = kindChanged ? (kind?.subtype ?? "") : (accountToEdit?.accountSubtype ?? "");
  // An ISA is held in one name (E34): a saved joint account saved as an ISA becomes sole.
  const becomesSole =
    isEditing &&
    accountToEdit?.ownership === "joint" &&
    isIsaAccount({ accountSubtype: subtypeToSave });
  const isInvestment = kind?.type === "Investment";
  // The fields for the chosen kind (the same set the Accounts dialog shows): a saver that is not
  // an ISA can be joint here too (SD-8).
  const fieldSet = accountFieldSet({
    type: kind?.type ?? accountToEdit?.type ?? "Saving",
    name,
    accountSubtype: subtypeToSave,
  });
  const [initialOwnership] = useState<AccountOwnership>(() =>
    accountToEdit?.ownership === "joint" ? "joint" : "sole",
  );
  const [initialShare] = useState<number | null>(() =>
    initialOwnership === "joint"
      ? (accountToEdit?.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT)
      : null,
  );
  const [ownership, setOwnership] = useState<AccountOwnership>(initialOwnership);
  const [sharePercent, setSharePercent] = useState<number | null>(
    initialShare ?? DEFAULT_JOINT_SHARE_PERCENT,
  );
  const effectiveOwnership: AccountOwnership =
    fieldSet.joint && ownership === "joint" ? "joint" : "sole";
  const shareToSave = resolveSharePercent(effectiveOwnership, sharePercent);
  // The whole stored balance. The caller passes the saved account, not a row at the user's share,
  // and a joint account says so beside the field (SD-1, JO-1, decision 9 A).
  const [initialBalance] = useState<number | null>(() => toNumberOrNull(accountToEdit?.balance));
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const jointNote = describeJointWholeValue(
    { type: kind?.type ?? "Saving", ownership: effectiveOwnership, sharePercent: shareToSave },
    "balance",
  );
  // No assumed defaults: a new account starts with an empty rate and monthly amount, and empty
  // fields are saved as "not set" rather than 0.
  const [initialRate] = useState<number | null>(() => toNumberOrNull(accountToEdit?.interestRate));
  const [interestRate, setInterestRate] = useState<number | null>(initialRate);
  const [initialMonthly] = useState<number | null>(() =>
    toNumberOrNull(accountToEdit?.monthlyContribution),
  );
  const [monthlyContribution, setMonthlyContribution] = useState<number | null>(initialMonthly);
  // An edit sends only the figures the user changed, so an untouched balance is never rewritten
  // (and writes no history row for this month).
  const changed = (now: number | null, before: number | null) => !isEditing || now !== before;
  const ownershipChanged =
    effectiveOwnership !== initialOwnership ||
    (effectiveOwnership === "joint" && shareToSave !== initialShare);

  const canSave = name.trim().length > 0 && kind !== null;
  // The add button stays enabled, as in every sheet (RC-12, P28): a missing field is named on press.
  const [showErrors, setShowErrors] = useState(false);
  const nameError =
    showErrors && name.trim().length === 0 ? "Enter a name for the account." : undefined;
  const kindError = showErrors && kind === null ? "Choose the kind of account." : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saveOutcome.pending) return;
    if (!canSave || !kind) {
      setShowErrors(true);
      return;
    }

    saveOutcome.begin();
    fetcher.submit(
      {
        intent: isEditing ? "updateSavingsAccount" : "createSavingsAccount",
        accountId: accountToEdit?.id || "",
        ...versionField(accountToEdit),
        ...(!isEditing || name.trim() !== (accountToEdit?.name ?? "") ? { name: name.trim() } : {}),
        ...(kindChanged ? { type: kind.type, accountSubtype: kind.subtype } : {}),
        // Sent only when changed (a new account sends a joint choice); an ISA is always sole.
        ...((isEditing ? ownershipChanged : effectiveOwnership === "joint")
          ? {
              ownership: effectiveOwnership,
              ...(shareToSave !== null ? { sharePercent: String(shareToSave) } : {}),
            }
          : {}),
        ...(changed(balance, initialBalance) ? { balance: String(Number(balance) || 0) } : {}),
        ...(changed(interestRate, initialRate)
          ? { interestRate: interestRate === null ? "" : String(interestRate) }
          : {}),
        ...(changed(monthlyContribution, initialMonthly)
          ? {
              monthlyContribution: monthlyContribution === null ? "" : String(monthlyContribution),
            }
          : {}),
      },
      { method: "POST", action: "/app/savings" },
    );
  };

  return (
    <form className={accountForm()} noValidate onSubmit={submit}>
      <FormField error={nameError} label="Account name" required>
        {(field) => (
          <TextInput
            {...controlProps(field)}
            // Short enough to show whole in a 320px field (P44).
            placeholder="For example, Cash ISA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>

      <FormField error={kindError} label="Kind of account" required>
        {(field) => (
          <Select
            {...controlProps(field)}
            placeholder="Choose the kind of account"
            value={kindValue}
            onChange={(e) => setKindValue(e.target.value)}
          >
            {SAVINGS_KIND_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.kinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}
      </FormField>

      <div className={fieldRow()}>
        <FormField hint={jointNote ?? undefined} label="Current balance">
          {(field) => (
            <CurrencyInput {...controlProps(field)} value={balance} onValueChange={setBalance} />
          )}
        </FormField>
        <FormField
          // The risk line stays visible (fixed wording); only the explanation moves to the "i".
          hint={isInvestment ? INVESTMENT_RISK_NOTICE : undefined}
          label={isInvestment ? "Estimated annual return (%)" : "Interest rate (AER)"}
          labelAddon={
            isInvestment ? (
              <InfoTip descriptionId={RETURN_INFO_ID} term="Estimated annual return">
                An estimate used for projections.
              </InfoTip>
            ) : undefined
          }
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              aria-describedby={
                [isInvestment ? RETURN_INFO_ID : undefined, field.describedBy]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              max={100}
              min={0}
              value={interestRate}
              onValueChange={setInterestRate}
            />
          )}
        </FormField>
      </div>

      {fieldSet.joint ? (
        <JointOwnershipFields
          ownership={ownership}
          sharePercent={sharePercent}
          onOwnershipChange={setOwnership}
          onSharePercentChange={setSharePercent}
        />
      ) : null}

      <FormField
        label="Saved each month"
        labelAddon={
          <InfoTip descriptionId={MONTHLY_INFO_ID} term="Saved each month">
            What you put into this account each month.
          </InfoTip>
        }
      >
        {(field) => (
          <CurrencyInput
            {...controlProps(field)}
            aria-describedby={[field.describedBy, MONTHLY_INFO_ID].filter(Boolean).join(" ")}
            value={monthlyContribution}
            onValueChange={setMonthlyContribution}
          />
        )}
      </FormField>

      {saveOutcome.error ? (
        <InlineAlert tone="danger">{saveOutcome.error}</InlineAlert>
      ) : becomesSole ? (
        <InlineAlert>{ISA_BECOMES_SOLE_NOTICE}</InlineAlert>
      ) : null}

      <div className={formActions()}>
        {isEditing && onDeleteRequest ? (
          <span className={deleteAction()}>
            <Button type="button" variant="dangerSubtle" onClick={onDeleteRequest}>
              <Icon icon={Trash2} size="sm" />
              Delete account
            </Button>
          </span>
        ) : null}
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saveOutcome.pending} type="submit">
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

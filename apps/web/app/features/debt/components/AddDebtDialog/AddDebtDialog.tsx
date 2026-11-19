import {
  type AccountOwnership,
  DEFAULT_JOINT_SHARE_PERCENT,
  type DebtItem,
  describeJointWholeValue,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  DatePicker,
  Dialog,
  FormField,
  InfoTip,
  InlineAlert,
  PercentInput,
  Select,
  TextInput,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, type FormEvent, useState } from "react";
import { accountFieldSet } from "~/features/accounts/accountFieldSet";
import {
  JointOwnershipFields,
  resolveSharePercent,
} from "~/features/accounts/components/JointOwnershipFields";
import { debtTypeToAccountType } from "~/features/debt/utils/debtAccountMapping";
import { debtForm, deleteAction, fieldRow, footerButton } from "./AddDebtDialog.styles";

/**
 * What the edit form needs on top of a debt row, whose minimum payment is at the user's share: the
 * whole stored payment and the ownership, so a joint debt is edited and saved whole (SD-7).
 */
export interface DebtEditSource {
  /** The stored amount owed, the whole of it (a joint debt's row holds only the user's share). */
  wholeBalance?: number;
  /** The stored monthly payment, the whole of it, when one is saved above £0. */
  wholeMinimumPayment?: number;
  ownership?: string | null;
  sharePercent?: number | null;
}

/** Ownership and share, saved with the debt: the same pair every account form shows (SD-8). */
export interface DebtOwnership {
  ownership?: AccountOwnership;
  sharePercent?: number | null;
}

export interface AddDebtDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDebt: (debt: Omit<DebtItem, "id"> & DebtOwnership) => void;
  /** When set the dialog edits this debt instead of adding one. Its type stays as saved. */
  debt?: DebtItem & DebtEditSource;
  /**
   * Called in edit mode with only the fields that changed. A caller that returns a promise keeps
   * the dialog open until it settles: `null` closes it, a message is shown and the fields stay.
   * A balance is the whole amount owed, never the user's share of it.
   */
  onEditDebt?: (
    id: string,
    updates: Partial<DebtItem> & DebtOwnership,
  ) => void | Promise<string | null>;
  /**
   * Edit mode only: the "Delete debt" action closes this dialog and calls this with the debt's id.
   * The page asks for confirmation before anything is deleted.
   */
  onDeleteDebt?: (id: string) => void;
}

const FORM_ID = "add-debt-form";
const CREDIT_LIMIT_INFO_ID = "add-debt-credit-limit-info";
const PROMO_END_INFO_ID = "add-debt-promo-end-info";

/** The field's own hint or error ids plus the InfoTip's hidden description, so both are read. */
const describedByWith = (describedBy: string | undefined, infoId: string): string =>
  [describedBy, infoId].filter(Boolean).join(" ");

const TYPE_OPTIONS: { value: NonNullable<DebtItem["type"]>; label: string }[] = [
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Personal loan" },
  { value: "overdraft", label: "Arranged overdraft" },
  { value: "bnpl", label: "Buy now, pay later" },
  { value: "car_finance", label: "Car finance or HP" },
  { value: "other", label: "Other debt" },
];

const toFieldValue = (value: number | undefined): number | null =>
  value === undefined || !Number.isFinite(value) ? null : value;

interface DebtFormProps extends Omit<AddDebtDialogProps, "isOpen" | "onDeleteDebt"> {}

/** Mounted only while the dialog is open, so the fields restart from the debt being edited. */
const DebtForm: FC<DebtFormProps> = ({ onClose, onAddDebt, debt, onEditDebt }) => {
  const isEdit = debt !== undefined;
  const [name, setName] = useState(debt?.name ?? "");
  // The whole amount owed, so a joint debt is edited and saved whole (decision 9 A).
  const [initialBalance] = useState<number | null>(() =>
    debt === undefined
      ? null
      : toFieldValue(debt.wholeBalance ?? Math.abs(Number(debt.balance ?? debt.balanceGbp ?? 0))),
  );
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const [apr, setApr] = useState<number | null>(
    debt?.aprKnown === false ? null : toFieldValue(debt?.apr),
  );
  // The whole stored payment: a joint debt's row holds only the user's share of it.
  const [initialMinimum] = useState<number | null>(() =>
    debt === undefined
      ? null
      : debt.wholeMinimumPayment !== undefined
        ? toFieldValue(debt.wholeMinimumPayment)
        : debt.minimumPaymentEstimated
          ? null
          : toFieldValue(debt.minimumPayment),
  );
  const [minimumPayment, setMinimumPayment] = useState<number | null>(initialMinimum);
  const [type, setType] = useState<DebtItem["type"]>(debt?.type ?? "credit_card");
  const [initialOwnership] = useState<AccountOwnership>(() =>
    debt?.ownership === "joint" ? "joint" : "sole",
  );
  const [initialShare] = useState<number | null>(() =>
    initialOwnership === "joint" ? (debt?.sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT) : null,
  );
  const [ownership, setOwnership] = useState<AccountOwnership>(initialOwnership);
  const [sharePercent, setSharePercent] = useState<number | null>(
    initialShare ?? DEFAULT_JOINT_SHARE_PERCENT,
  );
  const [creditLimit, setCreditLimit] = useState<number | null>(toFieldValue(debt?.creditLimitGbp));
  const [promoZeroPercentUntil, setPromoZeroPercentUntil] = useState<string>(
    debt?.promoAprExpiryDate ?? "",
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeType = isEdit ? debt?.type : type;
  // The fields for this kind of debt, the same set the Accounts dialog shows (SD-8).
  const fieldSet = accountFieldSet({ type: debtTypeToAccountType(activeType), name });
  const supportsCreditFields = fieldSet.creditFields;
  const effectiveOwnership: AccountOwnership =
    fieldSet.joint && ownership === "joint" ? "joint" : "sole";
  const shareToSave = resolveSharePercent(effectiveOwnership, sharePercent);
  const jointInput = { type: activeType, ownership: effectiveOwnership, sharePercent: shareToSave };
  // A joint debt's figures are the whole of it, and say so beside the field (decision 9 A).
  const balanceNote = describeJointWholeValue(jointInput, "balance");
  const minimumNote = describeJointWholeValue(jointInput, "monthly payment");

  const nameError = !name.trim() ? "Enter a name for this debt." : undefined;
  const balanceError = isEdit
    ? balance !== null && balance < 0
      ? "Enter the balance you owe, £0 or more."
      : undefined
    : supportsCreditFields
      ? balance === null || balance < 0
        ? "Enter the balance you owe, £0 or more."
        : undefined
      : balance === null || balance <= 0
        ? "Enter the balance you owe, more than £0."
        : undefined;
  const aprError = apr !== null && apr < 0 ? "APR cannot be negative." : undefined;
  const minimumError =
    minimumPayment !== null && minimumPayment < 0 ? "The minimum cannot be negative." : undefined;
  const creditLimitError =
    creditLimit !== null && creditLimit < 0 ? "Credit limit cannot be negative." : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (saving || nameError || balanceError || aprError || minimumError || creditLimitError) return;

    if (debt) {
      const updates: Partial<DebtItem> & DebtOwnership = {};
      if (name.trim() !== debt.name) updates.name = name.trim();
      // Compared with the whole amount owed the field opened with, so it is sent only when changed
      // (a re-sent balance writes a history row for this month).
      if (balance !== null && balance !== initialBalance) updates.balance = balance;
      if (
        effectiveOwnership !== initialOwnership ||
        (effectiveOwnership === "joint" && shareToSave !== initialShare)
      ) {
        updates.ownership = effectiveOwnership;
        updates.sharePercent = shareToSave;
      }
      const aprWasKnown = debt.aprKnown !== false;
      if (apr === null ? aprWasKnown : !aprWasKnown || apr !== debt.apr) {
        updates.apr = apr ?? 0;
        updates.aprKnown = apr !== null;
      }
      // Compared with what the field started from, so an untouched payment is never sent.
      if (minimumPayment !== initialMinimum) {
        updates.minimumPayment = minimumPayment ?? 0;
        updates.minimumPaymentEstimated = minimumPayment === null;
      }
      if (supportsCreditFields) {
        const prevLimit = debt.creditLimitGbp ?? null;
        if (creditLimit !== prevLimit) {
          updates.creditLimitGbp = creditLimit ?? undefined;
        }
        const prevPromo = debt.promoAprExpiryDate ?? "";
        if (promoZeroPercentUntil !== prevPromo) {
          updates.promoAprExpiryDate = promoZeroPercentUntil || undefined;
        }
      }
      if (Object.keys(updates).length > 0) {
        const result = onEditDebt?.(debt.id, updates);
        if (result instanceof Promise) {
          setSaving(true);
          setSaveError(null);
          const error = await result;
          setSaving(false);
          if (error !== null) {
            setSaveError(error);
            return;
          }
        }
      }
      onClose();
      return;
    }

    onAddDebt({
      name: name.trim(),
      balance: balance ?? 0,
      // A blank APR or minimum is unknown, never a made-up default. 0 is a real rate.
      apr: apr ?? 0,
      aprKnown: apr !== null,
      minimumPayment: minimumPayment ?? 0,
      minimumPaymentEstimated: minimumPayment === null,
      type,
      ...(effectiveOwnership === "joint"
        ? { ownership: effectiveOwnership, sharePercent: shareToSave }
        : {}),
      ...(supportsCreditFields && creditLimit !== null ? { creditLimitGbp: creditLimit } : {}),
      ...(supportsCreditFields && promoZeroPercentUntil
        ? { promoAprExpiryDate: promoZeroPercentUntil }
        : {}),
    });
    onClose();
  };

  return (
    <form className={debtForm()} id={FORM_ID} noValidate onSubmit={handleSubmit}>
      <FormField error={submitted ? nameError : undefined} label="Name of the debt" required>
        {(field) => (
          <TextInput
            {...controlProps(field)}
            placeholder="For example, car loan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>

      <div className={fieldRow()}>
        {isEdit ? null : (
          <FormField label="Type">
            {(field) => (
              <Select
                {...controlProps(field)}
                options={TYPE_OPTIONS}
                value={type}
                onChange={(e) => setType(e.target.value as DebtItem["type"])}
              />
            )}
          </FormField>
        )}
        <FormField
          error={submitted ? balanceError : undefined}
          hint={balanceNote ?? undefined}
          label="Balance you owe"
          required={!isEdit}
        >
          {(field) => (
            <CurrencyInput {...controlProps(field)} value={balance} onValueChange={setBalance} />
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

      <div className={fieldRow()}>
        <FormField
          error={aprError}
          label={fieldSet.interestRate?.label ?? "Interest rate (APR) (optional)"}
          labelAddon={
            <InfoTip term="Interest rate (APR)">
              The rate on your statement. Leave blank if you do not know it yet.
            </InfoTip>
          }
        >
          {(field) => <PercentInput {...controlProps(field)} value={apr} onValueChange={setApr} />}
        </FormField>
        <FormField
          error={minimumError}
          hint={minimumNote ?? undefined}
          label={fieldSet.monthlyContribution?.label ?? "Minimum payment each month (optional)"}
          labelAddon={
            <InfoTip term="Minimum payment">
              The amount on your statement. Leave blank if you do not know it yet.
            </InfoTip>
          }
        >
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              value={minimumPayment}
              onValueChange={setMinimumPayment}
            />
          )}
        </FormField>
      </div>
      {supportsCreditFields ? (
        <div className={fieldRow()}>
          <FormField
            error={creditLimitError}
            label="Credit limit (optional)"
            labelAddon={
              <InfoTip descriptionId={CREDIT_LIMIT_INFO_ID} term="Credit limit">
                Your card or overdraft limit, even if the balance is £0.
              </InfoTip>
            }
          >
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                aria-describedby={describedByWith(field.describedBy, CREDIT_LIMIT_INFO_ID)}
                min={0}
                value={creditLimit}
                onValueChange={setCreditLimit}
              />
            )}
          </FormField>
          <FormField
            label="0% interest period ends (optional)"
            labelAddon={
              <InfoTip descriptionId={PROMO_END_INFO_ID} term="0% interest period">
                When any 0% promotional interest period ends.
              </InfoTip>
            }
          >
            {(field) => (
              <DatePicker
                {...controlProps(field)}
                aria-describedby={describedByWith(field.describedBy, PROMO_END_INFO_ID)}
                clearable
                value={promoZeroPercentUntil}
                onValueChange={setPromoZeroPercentUntil}
              />
            )}
          </FormField>
        </div>
      ) : null}
      {saveError ? <InlineAlert tone="danger">{saveError}</InlineAlert> : null}
    </form>
  );
};

export const AddDebtDialog: FC<AddDebtDialogProps> = ({
  isOpen,
  onClose,
  onDeleteDebt,
  ...formProps
}) => {
  const { debt } = formProps;
  const isEdit = debt !== undefined;
  return (
    <Dialog
      closeLabel="Close"
      description={
        isEdit
          ? "Change any detail. Leave the APR or minimum blank if you do not know it yet."
          : "Add a credit card, loan or overdraft. Only the name and balance are needed."
      }
      footer={
        <>
          {debt && onDeleteDebt ? (
            <Button
              className={cx(deleteAction, footerButton)}
              type="button"
              variant="dangerSubtle"
              onClick={() => {
                onClose();
                onDeleteDebt(debt.id);
              }}
            >
              Delete debt
            </Button>
          ) : null}
          <Button className={footerButton} type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button className={footerButton} form={FORM_ID} type="submit">
            {isEdit ? "Save changes" : "Add debt"}
          </Button>
        </>
      }
      id="add-debt-dialog"
      open={isOpen}
      title={isEdit ? "Edit debt" : "Add a debt"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {isOpen ? (
        <DebtForm key={formProps.debt?.id ?? "new"} onClose={onClose} {...formProps} />
      ) : null}
    </Dialog>
  );
};

export default AddDebtDialog;

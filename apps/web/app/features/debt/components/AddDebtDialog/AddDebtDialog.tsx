import type { DebtItem } from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  PercentInput,
  TextInput,
} from "@repo/ui";
import { type FC, type FormEvent, useState } from "react";
import { debtForm, fieldRow, nativeSelect } from "./AddDebtDialog.styles";

export interface AddDebtDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDebt: (debt: Omit<DebtItem, "id">) => void;
  /**
   * When set the dialog edits this debt instead of adding one. Only the name,
   * APR and minimum payment can be edited: the balance is not sent on edit.
   */
  debt?: DebtItem;
  /** Called in edit mode with only the fields that changed. */
  onEditDebt?: (id: string, updates: Partial<DebtItem>) => void;
}

const FORM_ID = "add-debt-form";

const toFieldValue = (value: number | undefined): number | null =>
  value === undefined || !Number.isFinite(value) ? null : value;

interface DebtFormProps extends Omit<AddDebtDialogProps, "isOpen"> {}

/** Mounted only while the dialog is open, so the fields restart from the debt being edited. */
const DebtForm: FC<DebtFormProps> = ({ onClose, onAddDebt, debt, onEditDebt }) => {
  const isEdit = debt !== undefined;
  const [name, setName] = useState(debt?.name ?? "");
  const [balance, setBalance] = useState<number | null>(null);
  const [apr, setApr] = useState<number | null>(
    debt?.aprKnown === false ? null : toFieldValue(debt?.apr),
  );
  const [minimumPayment, setMinimumPayment] = useState<number | null>(
    debt === undefined || debt.minimumPaymentEstimated ? null : toFieldValue(debt.minimumPayment),
  );
  const [type, setType] = useState<DebtItem["type"]>("credit_card");
  const [submitted, setSubmitted] = useState(false);

  const nameError = !name.trim() ? "Enter a name for this debt." : undefined;
  const balanceError =
    !isEdit && (balance === null || balance <= 0)
      ? "Enter the balance you owe, more than £0."
      : undefined;
  const aprError = apr !== null && apr < 0 ? "APR cannot be negative." : undefined;
  const minimumError =
    minimumPayment !== null && minimumPayment < 0 ? "The minimum cannot be negative." : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || balanceError || aprError || minimumError) return;

    if (debt) {
      const updates: Partial<DebtItem> = {};
      if (name.trim() !== debt.name) updates.name = name.trim();
      const aprWasKnown = debt.aprKnown !== false;
      if (apr === null ? aprWasKnown : !aprWasKnown || apr !== debt.apr) {
        updates.apr = apr ?? 0;
        updates.aprKnown = apr !== null;
      }
      const minimumWasEstimated = debt.minimumPaymentEstimated === true;
      if (
        minimumPayment === null
          ? !minimumWasEstimated
          : minimumWasEstimated || minimumPayment !== debt.minimumPayment
      ) {
        updates.minimumPayment = minimumPayment ?? 0;
        updates.minimumPaymentEstimated = minimumPayment === null;
      }
      if (Object.keys(updates).length > 0) onEditDebt?.(debt.id, updates);
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
    });
    onClose();
  };

  return (
    <form className={debtForm()} id={FORM_ID} noValidate onSubmit={handleSubmit}>
      <FormField error={submitted ? nameError : undefined} label="Name of the debt" required>
        {(field) => (
          <TextInput
            {...controlProps(field)}
            placeholder="For example, Barclaycard Platinum, Klarna or overdraft"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>

      {isEdit ? null : (
        <div className={fieldRow()}>
          <FormField label="Type">
            {(field) => (
              // TODO(E15 T2.2b): swap for @repo/ui Select
              <select
                className={nativeSelect()}
                id={field.id}
                value={type}
                onChange={(e) => setType(e.target.value as DebtItem["type"])}
              >
                <option value="credit_card">Credit card</option>
                <option value="loan">Personal loan</option>
                <option value="overdraft">Arranged overdraft</option>
                <option value="bnpl">Buy-now-pay-later</option>
                <option value="car_finance">Car finance or HP</option>
                <option value="other">Other liability</option>
              </select>
            )}
          </FormField>
          <FormField error={submitted ? balanceError : undefined} label="Balance you owe" required>
            {(field) => (
              <CurrencyInput {...controlProps(field)} value={balance} onValueChange={setBalance} />
            )}
          </FormField>
        </div>
      )}

      <div className={fieldRow()}>
        <FormField
          error={aprError}
          hint="Optional. Leave blank if you do not know it yet."
          label="APR (%)"
        >
          {(field) => (
            <PercentInput
              {...controlProps(field)}
              placeholder="Not set"
              value={apr}
              onValueChange={setApr}
            />
          )}
        </FormField>
        <FormField
          error={minimumError}
          hint="Optional. Leave blank if you do not know it yet."
          label="Minimum payment each month"
        >
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              placeholder="Not set"
              value={minimumPayment}
              onValueChange={setMinimumPayment}
            />
          )}
        </FormField>
      </div>
    </form>
  );
};

export const AddDebtDialog: FC<AddDebtDialogProps> = ({ isOpen, onClose, ...formProps }) => {
  const isEdit = formProps.debt !== undefined;
  return (
    <Dialog
      closeLabel="Close"
      description={
        isEdit
          ? "Change the name, APR or minimum payment. Leave the APR or minimum blank if you do not know it yet."
          : "Log a credit card, loan or overdraft to model payoff. Only the name and balance are required."
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button form={FORM_ID} type="submit">
            {isEdit ? "Save changes" : "Add liability"}
          </Button>
        </>
      }
      id="add-debt-dialog"
      open={isOpen}
      title={isEdit ? "Edit debt" : "Add liability account"}
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

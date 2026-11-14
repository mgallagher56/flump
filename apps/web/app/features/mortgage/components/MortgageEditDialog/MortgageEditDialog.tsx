import {
  Button,
  CurrencyInput,
  controlProps,
  Dialog,
  FormField,
  InlineAlert,
  Money,
  PercentInput,
  RadioCardGroup,
  Select,
  TextInput,
} from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { dialogBody, editGrid, estimateRow, unsavedNote } from "./MortgageEditDialog.styles";

export type MortgageKind = "repayment" | "interest-only";

export interface MortgageAccountOption {
  id: string;
  name?: string;
  balance?: number;
}

export interface MortgageEditDialogProps {
  open: boolean;
  /** Closing the dialog (Cancel, Escape, the close button) discards the typed values. */
  onOpenChange: (open: boolean) => void;
  propertyCategory: "residential" | "btl";
  /** True when balance and rate can be stored (a linked account, or buy to let on the profile). */
  canSaveFigures: boolean;
  /** True when the term and fixed rate end date can be stored too (a linked mortgage account). */
  canSaveTerm: boolean;
  /**
   * Residential mortgage accounts the page can read from. The choice is not stored. There is no
   * "none" option: unlinking would blank the form and risk clearing stored figures on save.
   */
  mortgageAccounts?: readonly MortgageAccountOption[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
  editLoanAmount: number;
  /** Held as strings so a cleared field stays empty instead of showing 0. */
  editInterestRate: string;
  editRemainingTerm: string;
  editMortgageType: MortgageKind;
  /** Fixed rate end date being edited (YYYY-MM-DD, or "" for none). */
  editFixEndDate?: string;
  /** Payment for the values typed in the form; `null` when any is missing. */
  editPayment: number | null;
  saveError: string | null;
  onAddAccount: () => void;
  onSave: () => void;
  onEditLoanAmountChange: (value: number) => void;
  onEditInterestRateChange: (value: string) => void;
  onEditRemainingTermChange: (value: string) => void;
  onEditMortgageTypeChange: (value: MortgageKind) => void;
  onEditFixEndDateChange?: (value: string) => void;
}

const TYPE_OPTIONS = [
  { value: "repayment", label: "Repayment" },
  { value: "interest-only", label: "Interest-only" },
] as const;

/**
 * The one place saved mortgage figures change (E16 PR 6): balance, rate, years left, fixed rate end
 * date and repayment type, plus which mortgage account the page reads. Opened from "Edit" in
 * "Your details", the page prompt and the scenario zone's "Update your details".
 */
export const MortgageEditDialog: FC<MortgageEditDialogProps> = ({
  open,
  onOpenChange,
  propertyCategory,
  canSaveFigures,
  canSaveTerm,
  mortgageAccounts = [],
  selectedAccountId = null,
  onSelectAccount,
  editLoanAmount,
  editInterestRate,
  editRemainingTerm,
  editMortgageType,
  editFixEndDate = "",
  editPayment,
  saveError: errorText,
  onAddAccount,
  onSave,
  onEditLoanAmountChange,
  onEditInterestRateChange,
  onEditRemainingTermChange,
  onEditMortgageTypeChange,
  onEditFixEndDateChange,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const rateValue = editInterestRate.trim() === "" ? null : Number(editInterestRate);

  return (
    <Dialog
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </>
      }
      id="mortgage-edit-dialog"
      open={open}
      size="lg"
      title={
        propertyCategory === "btl" ? "Edit your buy to let mortgage" : "Edit your mortgage details"
      }
      onOpenChange={onOpenChange}
    >
      <div className={dialogBody()}>
        {errorText ? <InlineAlert tone="danger">{errorText}</InlineAlert> : null}

        {propertyCategory === "residential" && mortgageAccounts.length > 0 && onSelectAccount ? (
          <FormField label="Mortgage account">
            {(field) => (
              <Select
                {...controlProps(field)}
                data-testid="mortgage-account-select"
                options={mortgageAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.name ?? "Mortgage"} (${formatCurrency(Math.abs(account.balance ?? 0))})`,
                }))}
                value={selectedAccountId ?? ""}
                onChange={(event) => onSelectAccount(event.target.value || null)}
              />
            )}
          </FormField>
        ) : null}

        <div className={editGrid()}>
          {canSaveFigures ? (
            <>
              <FormField hint="Saved on your mortgage account" label="Remaining balance">
                {(field) => (
                  <CurrencyInput
                    {...controlProps(field)}
                    value={editLoanAmount > 0 ? editLoanAmount : null}
                    onValueChange={(v) => onEditLoanAmountChange(v ?? 0)}
                  />
                )}
              </FormField>
              <FormField label="Interest rate">
                {(field) => (
                  <PercentInput
                    {...controlProps(field)}
                    max={100}
                    min={0}
                    value={rateValue !== null && Number.isFinite(rateValue) ? rateValue : null}
                    onValueChange={(v) => onEditInterestRateChange(v === null ? "" : String(v))}
                  />
                )}
              </FormField>
            </>
          ) : (
            <div className={unsavedNote()}>
              <p>
                Your balance, rate and years left are saved on a mortgage account. Add one to keep
                these figures between visits.
              </p>
              <Button size="sm" variant="outline" onClick={onAddAccount}>
                Add mortgage account
              </Button>
            </div>
          )}
          {canSaveTerm ? (
            <FormField hint="Saved on your mortgage account" label="Years left">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  inputMode="decimal"
                  value={editRemainingTerm}
                  onChange={(e) => onEditRemainingTermChange(e.target.value)}
                />
              )}
            </FormField>
          ) : null}
          {canSaveTerm && onEditFixEndDateChange ? (
            <FormField label="Fixed rate end date (optional)">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  type="date"
                  value={editFixEndDate}
                  onChange={(e) => onEditFixEndDateChange(e.target.value)}
                />
              )}
            </FormField>
          ) : null}
        </div>

        <RadioCardGroup
          legend="Repayment type"
          options={TYPE_OPTIONS}
          value={editMortgageType}
          onValueChange={(value) => onEditMortgageTypeChange(value as MortgageKind)}
        />

        {canSaveFigures && canSaveTerm ? (
          <div className={estimateRow()}>
            <span>Monthly payment (estimate)</span>
            <Money fractionDigits={2} size="md" value={editPayment} />
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};

export default MortgageEditDialog;

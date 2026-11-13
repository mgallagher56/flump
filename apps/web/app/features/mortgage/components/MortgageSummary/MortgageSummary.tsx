import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  Num,
  StatusBadge,
  TextInput,
} from "@repo/ui";
import { Check, Home } from "lucide-react";
import type { FC } from "react";
import {
  editGrid,
  estimateRow,
  saveError,
  saveMessage,
  summaryActions,
  summaryCard,
  summaryDescription,
  summaryHeader,
  summaryTitle,
  summaryTitleRow,
  termValue,
  typeButtons,
  typeFieldset,
  typeLegend,
} from "./MortgageSummary.styles";

export type MortgageKind = "repayment" | "interest-only";

export interface MortgageSummaryProps {
  propertyCategory: "residential" | "btl";
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  mortgageType: MortgageKind;
  /** `null` when balance, rate or term is unknown. */
  monthlyPayment: number | null;
  isEditing: boolean;
  editLoanAmount: number;
  editInterestRate: string;
  editRemainingTerm: string;
  editMortgageType: MortgageKind;
  /** Estimate for the values typed in the edit form; `null` when any is missing. */
  editPayment: number | null;
  saveMessage: string | null;
  saveError: string | null;
  /** True when the term is stored on a linked mortgage account, so it persists between visits. */
  termSaved?: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onEditLoanAmountChange: (value: number) => void;
  onEditInterestRateChange: (value: string) => void;
  onEditRemainingTermChange: (value: string) => void;
  onEditMortgageTypeChange: (value: MortgageKind) => void;
}

export const MortgageSummary: FC<MortgageSummaryProps> = ({
  propertyCategory,
  loanAmount,
  interestRate,
  remainingTerm,
  mortgageType,
  monthlyPayment,
  isEditing,
  editLoanAmount,
  editInterestRate,
  editRemainingTerm,
  editMortgageType,
  editPayment,
  saveMessage: savedText,
  saveError: errorText,
  termSaved = false,
  onStartEditing,
  onCancelEditing,
  onSave,
  onEditLoanAmountChange,
  onEditInterestRateChange,
  onEditRemainingTermChange,
  onEditMortgageTypeChange,
}) => {
  const addAction = (label: string) => (
    <Button aria-label={`Add ${label}`} size="sm" variant="ghost" onClick={onStartEditing}>
      Add
    </Button>
  );
  const typeLabel = mortgageType === "repayment" ? "Repayment" : "Interest-only";

  return (
    <div
      className={summaryCard()}
      data-density="compact"
      data-testid="mortgage-summary"
      id="mortgage-summary"
    >
      <div className={summaryHeader()}>
        <div>
          <div className={summaryTitleRow()}>
            <Icon icon={Home} size="md" />
            <h2 className={summaryTitle()} id="mortgage-summary-title">
              Where you stand
            </h2>
            <StatusBadge variant="brand">
              {propertyCategory === "residential" ? "Primary residence" : "Buy to let"}
            </StatusBadge>
          </div>
          <p className={summaryDescription()}>
            The figures you entered. Saving updates your repayment type and, for a linked account,
            its interest rate.
          </p>
        </div>
        <div className={summaryActions()}>
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={onCancelEditing}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave}>
                Save
              </Button>
            </>
          ) : (
            <>
              {savedText && (
                <span className={saveMessage()} role="status">
                  <Icon icon={Check} size="sm" />
                  {savedText}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={onStartEditing}>
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {errorText && (
        <p className={saveError()} role="alert">
          {errorText}
        </p>
      )}

      {isEditing ? (
        <>
          <div className={editGrid()}>
            <FormField label="Remaining balance (£)">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  value={editLoanAmount}
                  onValueChange={(v) => onEditLoanAmountChange(v ?? 0)}
                />
              )}
            </FormField>
            <FormField label="Interest rate (%)">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  inputMode="decimal"
                  step="0.05"
                  type="number"
                  value={editInterestRate}
                  onChange={(e) => onEditInterestRateChange(e.target.value)}
                />
              )}
            </FormField>
            <FormField
              hint={termSaved ? "Stored on your mortgage account" : "Not saved – enter each visit"}
              label="Remaining term (years)"
            >
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  inputMode="numeric"
                  max="40"
                  min="1"
                  type="number"
                  value={editRemainingTerm}
                  onChange={(e) => onEditRemainingTermChange(e.target.value)}
                />
              )}
            </FormField>
            <fieldset className={typeFieldset()}>
              <legend className={typeLegend()}>Repayment type</legend>
              <div className={typeButtons()}>
                <Button
                  aria-pressed={editMortgageType === "repayment"}
                  size="sm"
                  variant={editMortgageType === "repayment" ? "primary" : "outline"}
                  onClick={() => onEditMortgageTypeChange("repayment")}
                >
                  Repayment
                </Button>
                <Button
                  aria-pressed={editMortgageType === "interest-only"}
                  size="sm"
                  variant={editMortgageType === "interest-only" ? "primary" : "outline"}
                  onClick={() => onEditMortgageTypeChange("interest-only")}
                >
                  Interest-only
                </Button>
              </div>
            </fieldset>
          </div>
          <div className={estimateRow()}>
            <span>Estimated monthly payment</span>
            <Money fractionDigits={2} size="md" value={editPayment} />
          </div>
        </>
      ) : (
        <KpiStrip columns={4}>
          <KpiCard
            emptyAction={addAction("remaining balance")}
            label="Remaining balance"
            value={loanAmount > 0 ? <Money size="lg" value={loanAmount} /> : null}
          />
          <KpiCard
            emptyAction={addAction("interest rate")}
            label="Interest rate"
            value={
              interestRate > 0 ? (
                <Num fractionDigits={2} kind="percent" size="lg" value={interestRate} />
              ) : null
            }
          />
          <KpiCard
            emptyAction={addAction("remaining term")}
            label="Remaining term"
            value={
              remainingTerm > 0 ? (
                <span className={termValue()}>
                  {remainingTerm} {remainingTerm === 1 ? "year" : "years"}
                </span>
              ) : null
            }
          />
          <KpiCard
            label="Monthly payment"
            subtext={typeLabel}
            value={
              monthlyPayment === null ? null : (
                <Money fractionDigits={2} size="lg" value={monthlyPayment} />
              )
            }
          />
        </KpiStrip>
      )}
    </div>
  );
};

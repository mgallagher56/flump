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
  savedLine,
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
  unsavedNote,
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
  /** True when balance and rate can be stored (a linked account, or buy to let on the profile). */
  canSaveFigures: boolean;
  /** True when the term can be stored too (a linked mortgage account). */
  canSaveTerm: boolean;
  /** "Last updated" wording for the Saved line, or `null` when no date is known. */
  lastUpdated: string | null;
  /** Opens the accounts page so a mortgage account can be added. */
  onAddAccount: () => void;
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
  canSaveFigures,
  canSaveTerm,
  lastUpdated,
  onAddAccount,
  onStartEditing,
  onCancelEditing,
  onSave,
  onEditLoanAmountChange,
  onEditInterestRateChange,
  onEditRemainingTermChange,
  onEditMortgageTypeChange,
}) => {
  // Figures that cannot be stored here send the user to add an account instead of an edit form
  // that would only hold them in memory.
  const addAction = (label: string, canStore: boolean) => {
    if (!canStore && canSaveFigures) return undefined;
    return (
      <Button
        aria-label={`Add ${label}`}
        size="sm"
        variant="ghost"
        onClick={canStore ? onStartEditing : onAddAccount}
      >
        Add
      </Button>
    );
  };
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
            Your saved figures. Changing a slider or tool below never changes them.
          </p>
          <p className={savedLine()} id="mortgage-saved-line">
            <Icon icon={Check} size="sm" />
            Saved{lastUpdated ? `. ${lastUpdated}` : ""}
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
            {canSaveFigures ? (
              <>
                <FormField hint="Saved to your mortgage" label="Remaining balance (£)">
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
              </>
            ) : (
              <div className={unsavedNote()}>
                <p>
                  Your balance, rate and term are saved on a mortgage account. Add one to keep these
                  figures between visits.
                </p>
                <Button size="sm" variant="outline" onClick={onAddAccount}>
                  Add mortgage account
                </Button>
              </div>
            )}
            {canSaveTerm ? (
              <FormField hint="Stored on your mortgage account" label="Remaining term (years)">
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
            ) : null}
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
          {canSaveFigures && canSaveTerm ? (
            <div className={estimateRow()}>
              <span>Estimated monthly payment</span>
              <Money fractionDigits={2} size="md" value={editPayment} />
            </div>
          ) : null}
        </>
      ) : (
        <KpiStrip columns={4}>
          <KpiCard
            emptyAction={addAction("remaining balance", canSaveFigures)}
            label="Remaining balance"
            tone="hero"
            value={
              loanAmount > 0 ? <Money size="kpi" tone="onContrast" value={loanAmount} /> : null
            }
          />
          <KpiCard
            emptyAction={addAction("interest rate", canSaveFigures)}
            label="Interest rate"
            value={
              interestRate > 0 ? (
                <Num fractionDigits={2} kind="percent" size="lg" value={interestRate} />
              ) : null
            }
          />
          <KpiCard
            emptyAction={addAction("remaining term", canSaveTerm)}
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

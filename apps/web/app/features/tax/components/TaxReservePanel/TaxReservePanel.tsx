import {
  getLatestSupportedUkTaxYear,
  getUkTaxYearRules,
  type TaxCalculationResult,
} from "@flump/finance-engine";
import { Button, Card, CurrencyInput, controlProps, FormField, Money, TextInput } from "@repo/ui";
import { type FC, type ReactNode, useEffect, useState } from "react";
import { NotSet } from "~/features/feedback/components/NotSet";
import { PaymentsOnAccountCard } from "../PaymentsOnAccountCard";
import {
  cardBody,
  cardIntro,
  cardTitle,
  list,
  paramsAndBreakdown,
  root,
  row,
  saveRow,
  taperLine,
} from "./TaxReservePanel.styles";

/** The Personal Allowance taper band (copy audit ruling 6). */
const LATEST_RULES = getUkTaxYearRules(getLatestSupportedUkTaxYear());
const TAPER_START = LATEST_RULES.ewni.personalAllowanceTaperStart;
const TAPER_END = LATEST_RULES.taperEnd;
const TAPER_NOTE_FROM = 90_000;

export interface TaxReservePanelProps {
  taxYear: string;
  result: TaxCalculationResult;
  /** Total income in this estimate, before pension contributions and Gift Aid. */
  totalIncome: number;
  payeSalary: number;
  onPayeSalaryChange: (value: number) => void;
  ownershipSharePct: number;
  onOwnershipShareChange: (value: number) => void;
  onSave: () => void;
  saving: boolean;
}

const Line: FC<{
  label: ReactNode;
  value: ReactNode;
  emphasis?: "none" | "subtotal" | "total";
}> = ({ label, value, emphasis = "none" }) => (
  <div className={row({ emphasis })}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const gbp = (value: number) => <Money fractionDigits={0} size="sm" value={value} />;
const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/**
 * "How the estimate is worked out": the figures the estimate uses (editable, saved only on
 * "Save details"), the workings line by line, one quiet line about the Personal Allowance taper
 * when income is near it, and the payment dates.
 */
export const TaxReservePanel: FC<TaxReservePanelProps> = ({
  taxYear,
  result,
  totalIncome,
  payeSalary,
  onPayeSalaryChange,
  ownershipSharePct,
  onOwnershipShareChange,
  onSave,
  saving,
}) => {
  const [shareText, setShareText] = useState(String(ownershipSharePct));
  useEffect(() => {
    setShareText((current) =>
      Number.parseFloat(current) === ownershipSharePct ? current : String(ownershipSharePct),
    );
  }, [ownershipSharePct]);

  const taperNote =
    totalIncome >= TAPER_START && totalIncome <= TAPER_END
      ? `Total income in this estimate is ${pounds.format(totalIncome)}, in the £100,000 to £125,140 band where the Personal Allowance reduces.`
      : totalIncome >= TAPER_NOTE_FROM && totalIncome < TAPER_START
        ? `Total income in this estimate is ${pounds.format(totalIncome)}. The Personal Allowance reduces above £100,000.`
        : null;

  return (
    <div className={root()}>
      <div className={paramsAndBreakdown()}>
        <Card padding="lg">
          <div className={cardBody()}>
            <h3 className={cardTitle()}>Your figures</h3>
            <p className={cardIntro()}>
              Change these to see the estimate change. Nothing is saved until you select "Save
              details".
            </p>
            <FormField
              label="Yearly salary before tax"
              hint="The salary your employer pays through PAYE"
            >
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  value={payeSalary > 0 ? payeSalary : null}
                  onValueChange={(v) => onPayeSalaryChange(v ?? 0)}
                />
              )}
            </FormField>
            <FormField label="Your share of the rental property (%)">
              {(field) => (
                <TextInput
                  {...controlProps(field)}
                  inputMode="decimal"
                  suffix="%"
                  type="text"
                  value={shareText}
                  onChange={(e) => {
                    setShareText(e.target.value);
                    const parsed = Number.parseFloat(e.target.value);
                    onOwnershipShareChange(
                      Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0,
                    );
                  }}
                />
              )}
            </FormField>
            <div className={saveRow()}>
              <Button
                disabled={saving}
                size="sm"
                type="button"
                variant="secondary"
                onClick={onSave}
              >
                {saving ? "Saving…" : "Save details"}
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className={cardBody()}>
            <h3 className={cardTitle()}>Workings for {taxYear}</h3>
            <dl className={list()}>
              <Line
                label="Salary through PAYE"
                value={
                  result.effectivePayeSalary > 0 ? (
                    gbp(result.effectivePayeSalary)
                  ) : (
                    <NotSet href="/app/profile" subject="salary" />
                  )
                }
              />
              <Line label="Self-employed profit" value={gbp(result.seProfit)} />
              <Line
                label="Your share of rental profit, before mortgage interest"
                value={gbp(result.rentalProfitBeforeInterestShare)}
              />
              <Line
                label="Savings interest and dividends"
                value={gbp(result.savingsInterestGross + result.dividendIncomeGross)}
              />
              <Line emphasis="subtotal" label="Total income" value={gbp(result.totalGrossIncome)} />
              <Line label="Personal Allowance" value={gbp(result.personalAllowance)} />
              <Line label="Taxable income" value={gbp(result.totalTaxableIncome)} />
              <Line label="Income Tax on self-employed profit" value={gbp(result.seTaxDue)} />
              <Line
                label="National Insurance on self-employed profit (Class 4)"
                value={gbp(result.seClass4NIDue)}
              />
              <Line
                label="Tax on rental profit"
                value={gbp(result.rentalPropertyTaxDueBeforeCredit)}
              />
              <Line
                label="Tax credit for mortgage interest (Section 24)"
                value={gbp(-result.rentalPropertyTaxCredit)}
              />
              {result.savingsTaxDue > 0 ? (
                <Line
                  label="Tax on savings interest above the Personal Savings Allowance"
                  value={gbp(result.savingsTaxDue)}
                />
              ) : null}
              {result.dividendTaxDue > 0 ? (
                <Line label="Dividend tax" value={gbp(result.dividendTaxDue)} />
              ) : null}
              <Line
                emphasis="total"
                label="Estimated tax bill"
                value={gbp(result.netAdditionalTaxToPay)}
              />
            </dl>
            {taperNote ? <p className={taperLine()}>{taperNote}</p> : null}
          </div>
        </Card>
      </div>

      <PaymentsOnAccountCard
        annualSelfAssessmentTax={result.netAdditionalTaxToPay}
        taxDeductedAtSource={result.payeTaxDue}
        taxYear={taxYear}
      />
    </div>
  );
};

export default TaxReservePanel;

import {
  getLatestSupportedUkTaxYear,
  getUkTaxYearRules,
  type TaxCalculationResult,
} from "@flump/finance-engine";
import {
  Button,
  Card,
  CurrencyInput,
  controlProps,
  FormField,
  Money,
  PercentInput,
  section24CarriedForward,
} from "@repo/ui";
import type { FC, ReactNode } from "react";
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

/** The property allowance route cannot use finance costs, including any brought forward. */
const ALLOWANCE_IGNORES_BROUGHT_FORWARD =
  "This estimate uses the £1,000 property allowance, so finance costs brought forward are not used this year.";

export interface TaxReservePanelProps {
  taxYear: string;
  /**
   * The worked estimate. Undefined while a fact it depends on is not set: then only "Your
   * figures" shows, so the salary can be added here, and no workings from a stand-in £0.
   */
  result?: TaxCalculationResult;
  /** Total income in this estimate, before pension contributions and Gift Aid. */
  totalIncome: number;
  /** Yearly salary, 0 when that is the saved figure, null when it is not known. */
  payeSalary: number | null;
  onPayeSalaryChange: (value: number | null) => void;
  /** The share typed, or null while the field is empty (not set, never 0). */
  ownershipSharePct: number | null;
  onOwnershipShareChange: (value: number | null) => void;
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
                  value={payeSalary}
                  onValueChange={onPayeSalaryChange}
                />
              )}
            </FormField>
            <FormField label="Your share of the rental property (%)">
              {(field) => (
                <PercentInput
                  {...controlProps(field)}
                  max={100}
                  min={0}
                  value={ownershipSharePct}
                  onValueChange={(next) =>
                    onOwnershipShareChange(next === null ? null : Math.min(100, Math.max(0, next)))
                  }
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

        {result ? (
          <Card padding="lg">
            <div className={cardBody()}>
              <h3 className={cardTitle()}>Workings for {taxYear}</h3>
              <dl className={list()}>
                <Line
                  label="Salary through PAYE"
                  value={
                    result.effectivePayeSalary > 0 || payeSalary !== null ? (
                      gbp(result.effectivePayeSalary)
                    ) : (
                      <NotSet href="/app/profile#settings-age-and-pay" subject="salary" />
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
                <Line
                  emphasis="subtotal"
                  label="Total income"
                  value={gbp(result.totalGrossIncome)}
                />
                <Line label="Personal Allowance" value={gbp(result.personalAllowance)} />
                <Line label="Taxable income" value={gbp(result.totalTaxableIncome)} />
                <Line label="Income Tax on self-employed profit" value={gbp(result.seTaxDue)} />
                {result.allowanceTaperTaxDue > 0 ? (
                  <Line
                    label="Income Tax from Personal Allowance lost to savings and dividends"
                    value={gbp(result.allowanceTaperTaxDue)}
                  />
                ) : null}
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
              {result.propertyAllowanceUsed > 0 && result.financeCostsBroughtForward > 0 ? (
                <p className={taperLine()}>{ALLOWANCE_IGNORES_BROUGHT_FORWARD}</p>
              ) : null}
              {result.financeCostsCarriedForward > 0 ? (
                <p className={taperLine()}>
                  {section24CarriedForward(pounds.format(result.financeCostsCarriedForward))}
                </p>
              ) : null}
              {taperNote ? <p className={taperLine()}>{taperNote}</p> : null}
            </div>
          </Card>
        ) : null}
      </div>

      {result ? (
        <PaymentsOnAccountCard
          annualSelfAssessmentTax={result.netAdditionalTaxToPay}
          taxDeductedAtSource={result.payeTaxDue}
          taxYear={taxYear}
        />
      ) : null}
    </div>
  );
};

export default TaxReservePanel;

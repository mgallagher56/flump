import type { TaxCalculationResult } from "@flump/finance-engine";
import { Button, Card, CurrencyInput, controlProps, FormField, Money, TextInput } from "@repo/ui";
import type { FC, ReactNode } from "react";
import PaymentsOnAccountCard from "~/components/tax/PaymentsOnAccountCard";
import TaxEstimateNote from "~/components/tax/TaxEstimateNote";
import TaxTrapAlertBanner, {
  type TaxTrapAlertBannerProps,
} from "~/components/tax/TaxTrapAlertBanner";
import { NotSet } from "~/features/feedback/components/NotSet";
import {
  cardBody,
  cardIntro,
  cardTitle,
  list,
  paramsAndBreakdown,
  root,
  row,
  saveRow,
  twoUp,
} from "./TaxReservePanel.styles";

export interface TaxReservePanelProps {
  taxYear: string;
  result: TaxCalculationResult;
  /** Gross income the £100k band check uses. */
  trapGrossIncome: number;
  trapRegion: TaxTrapAlertBannerProps["region"];
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

const gbp = (value: number, sign?: "always") => (
  <Money fractionDigits={2} signDisplay={sign} size="sm" value={value} />
);

/** "Payments and reserve" tab: £100k band, payments on account, inputs and the full workings. */
export const TaxReservePanel: FC<TaxReservePanelProps> = ({
  taxYear,
  result,
  trapGrossIncome,
  trapRegion,
  payeSalary,
  onPayeSalaryChange,
  ownershipSharePct,
  onOwnershipShareChange,
  onSave,
  saving,
}) => (
  <div className={root()}>
    <div className={twoUp()}>
      <TaxTrapAlertBanner grossIncome={trapGrossIncome} region={trapRegion} />
      <PaymentsOnAccountCard
        annualSelfAssessmentTax={
          result.netAdditionalTaxToPay ?? Math.max(0, result.totalTaxDue - result.payeTaxDue)
        }
      />
    </div>

    <div className={paramsAndBreakdown()}>
      <Card padding="lg">
        <div className={cardBody()}>
          <h3 className={cardTitle()}>Your inputs</h3>
          <p className={cardIntro()}>
            Change these to see the estimate move. Save them to keep them in your profile.
          </p>
          <FormField label="PAYE salary" hint="Your yearly salary before tax">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                value={payeSalary > 0 ? payeSalary : null}
                onValueChange={(v) => onPayeSalaryChange(v ?? 0)}
              />
            )}
          </FormField>
          <FormField label="Property ownership share" hint="Your share of the rental property">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                inputMode="decimal"
                max={100}
                min={0}
                suffix="%"
                type="number"
                value={ownershipSharePct}
                onChange={(e) => onOwnershipShareChange(Number.parseFloat(e.target.value) || 0)}
              />
            )}
          </FormField>
          <div className={saveRow()}>
            <Button disabled={saving} size="sm" type="button" onClick={onSave}>
              {saving ? "Saving" : "Save to profile"}
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className={cardBody()}>
          <h3 className={cardTitle()}>How the estimate is worked out for {taxYear}</h3>
          <dl className={list()}>
            <Line
              label="PAYE salary"
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
              label="Rental profit share, before interest"
              value={gbp(result.rentalProfitBeforeInterestShare)}
            />
            <Line
              label="Savings and dividend income"
              value={gbp(result.savingsInterestGross + result.dividendIncomeGross)}
            />
            <Line emphasis="subtotal" label="Total income" value={gbp(result.totalGrossIncome)} />
            <Line label="Personal Allowance" value={gbp(result.personalAllowance)} />
            <Line label="Taxable income" value={gbp(result.totalTaxableIncome)} />
            <Line label="Income tax on self-employed profit" value={gbp(result.seTaxDue)} />
            <Line label="Class 4 National Insurance" value={gbp(result.seClass4NIDue)} />
            <Line
              label="Tax on rental profit"
              value={gbp(result.rentalPropertyTaxDueBeforeCredit)}
            />
            <Line
              label="Section 24 finance cost credit"
              value={gbp(-result.rentalPropertyTaxCredit)}
            />
            {result.savingsTaxDue > 0 ? (
              <Line
                label="Savings tax above the Personal Savings Allowance"
                value={gbp(result.savingsTaxDue)}
              />
            ) : null}
            {result.dividendTaxDue > 0 ? (
              <Line label="Dividend tax" value={gbp(result.dividendTaxDue)} />
            ) : null}
            <Line
              emphasis="total"
              label="Estimated Self Assessment due"
              value={gbp(result.netAdditionalTaxToPay)}
            />
          </dl>
          <TaxEstimateNote taxYear={taxYear} />
        </div>
      </Card>
    </div>
  </div>
);

export default TaxReservePanel;

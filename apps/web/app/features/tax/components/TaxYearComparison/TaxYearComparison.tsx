import type { TaxCalculationResult } from "@flump/finance-engine";
import { Card, Money, Table, TBody, Td, THead, Th } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, Fragment, type ReactNode } from "react";
import { NotSet } from "~/features/feedback/components/NotSet";
import {
  groupRow,
  indent,
  intro,
  root,
  selectedCol,
  title,
  totalRow,
} from "./TaxYearComparison.styles";

type Key = keyof TaxCalculationResult;

interface Line {
  label: string;
  value: (r: TaxCalculationResult | undefined) => ReactNode;
  total?: boolean;
}

const gbp = (value: number | undefined, negate = false) => (
  <Money fractionDigits={0} size="sm" value={negate ? -(value ?? 0) : (value ?? 0)} />
);
const field =
  (key: Key, negate = false) =>
  (r: TaxCalculationResult | undefined) =>
    gbp(r?.[key] as number | undefined, negate);

const GROUPS: Array<{ heading: string; lines: Line[] }> = [
  {
    heading: "Rental property (whole property)",
    lines: [
      { label: "Rental income", value: field("rentalIncomeGross") },
      { label: "Costs, excluding interest", value: field("rentalExpensesExclInterest") },
      { label: "Mortgage interest", value: field("rentalMortgageInterest") },
      { label: "Profit after interest", value: field("rentalProfitPostInterest"), total: true },
    ],
  },
  {
    heading: "Self-employed",
    lines: [
      { label: "Turnover", value: field("seIncomeGross") },
      { label: "Allowable costs", value: field("seExpenses") },
      { label: "Profit", value: field("seProfit"), total: true },
    ],
  },
  {
    heading: "Savings and investments",
    lines: [
      { label: "Taxable savings interest", value: field("savingsInterestGross") },
      { label: "Dividends", value: field("dividendIncomeGross") },
    ],
  },
  {
    heading: "Tax",
    lines: [
      {
        label: "Salary through PAYE",
        value: (r) =>
          r?.effectivePayeSalary && r.effectivePayeSalary > 0 ? (
            gbp(r.effectivePayeSalary)
          ) : (
            <NotSet href="/app/profile" subject="salary" />
          ),
      },
      { label: "Total income", value: field("totalGrossIncome") },
      { label: "Personal Allowance", value: field("personalAllowance") },
      {
        label: "Tax credit for mortgage interest (Section 24)",
        value: field("rentalPropertyTaxCredit", true),
      },
      {
        label: "Estimated tax bill",
        value: field("netAdditionalTaxToPay"),
        total: true,
      },
    ],
  },
];

export interface TaxYearComparisonProps {
  years: string[];
  selectedYear: string;
  results: Record<string, TaxCalculationResult>;
}

/** "Year by year" tab: the main lines of the calculation side by side for every tax year. */
export const TaxYearComparison: FC<TaxYearComparisonProps> = ({ years, selectedYear, results }) => {
  const col = (year: string) => (year === selectedYear ? selectedCol() : undefined);
  return (
    <Card padding="lg">
      <div className={root()}>
        <div>
          <h3 className={title()}>Year by year</h3>
          <p className={intro()}>
            Each tax year side by side, from the records you have entered. The highlighted column is
            the year selected above.
          </p>
        </div>
        <Table caption="Income and tax by tax year">
          <THead>
            <tr>
              <Th>Line</Th>
              {years.map((year) => (
                <Th key={year} numeric className={col(year)}>
                  {year}
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {GROUPS.map((group) => (
              <Fragment key={group.heading}>
                <tr className={groupRow()}>
                  <Th scope="colgroup" colSpan={years.length + 1}>
                    {group.heading}
                  </Th>
                </tr>
                {group.lines.map((line) => (
                  <tr key={line.label} className={line.total ? totalRow() : undefined}>
                    <Th scope="row" className={indent()}>
                      {line.label}
                    </Th>
                    {years.map((year) => (
                      <Td key={year} numeric className={cx(col(year))}>
                        {line.value(results[year])}
                      </Td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
};

export default TaxYearComparison;

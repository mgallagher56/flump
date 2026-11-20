import type { TaxCalculationResult } from "@flump/finance-engine";
import {
  Card,
  Money,
  Table,
  TableFilterSelect,
  TableToolbar,
  TBody,
  Td,
  THead,
  Th,
  useTableFilter,
} from "@repo/ui";
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
  value: (r: TaxCalculationResult | undefined, salaryKnown: boolean) => ReactNode;
  total?: boolean;
}

const gbp = (value: number | undefined, negate = false) => (
  <Money fractionDigits={0} size="sm" value={negate ? -(value ?? 0) : (value ?? 0)} />
);
/** A year with no result is one whose estimate depends on a fact not set: "Not set", never £0. */
const field =
  (key: Key, negate = false) =>
  (r: TaxCalculationResult | undefined) =>
    r ? gbp(r[key] as number | undefined, negate) : "Not set";

const GROUPS: Array<{ heading: string; lines: Line[] }> = [
  {
    heading: "Rental property (whole property)",
    lines: [
      { label: "Rental income", value: field("rentalIncomeGross") },
      { label: "Expenses, excluding interest", value: field("rentalExpensesExclInterest") },
      { label: "Mortgage interest", value: field("rentalMortgageInterest") },
      { label: "Profit after interest", value: field("rentalProfitPostInterest"), total: true },
    ],
  },
  {
    heading: "Self-employed",
    lines: [
      { label: "Turnover", value: field("seIncomeGross") },
      { label: "Allowable expenses", value: field("seExpenses") },
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
        // The prompt only when the salary is not known; a saved salary of 0 shows £0.
        value: (r, salaryKnown) =>
          r && (r.effectivePayeSalary > 0 || salaryKnown) ? (
            gbp(r.effectivePayeSalary)
          ) : (
            <NotSet href="/app/profile#settings-age-and-pay" subject="salary" />
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
  /** False when no salary is saved, so the salary line shows the "add your salary" prompt. */
  salaryKnown?: boolean;
}

const SECTION_OPTIONS = GROUPS.map((g) => ({ value: g.heading, label: g.heading }));

/**
 * "Year by year" tab: the main lines of the calculation side by side for every tax year. A filter
 * narrows it to one section. The rows do not sort: each total follows the lines it adds up, and
 * the columns are already the tax years in order.
 */
export const TaxYearComparison: FC<TaxYearComparisonProps> = ({
  years,
  selectedYear,
  results,
  salaryKnown = true,
}) => {
  const col = (year: string) => (year === selectedYear ? selectedCol() : undefined);
  const {
    filteredRows: groups,
    filterValues,
    setFilter,
  } = useTableFilter({
    rows: GROUPS,
    filters: { section: (g) => g.heading },
  });
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
        <TableToolbar>
          <TableFilterSelect
            allLabel="All sections"
            label="Section"
            options={SECTION_OPTIONS}
            value={filterValues.section}
            onChange={(v) => setFilter("section", v)}
          />
        </TableToolbar>
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
            {groups.map((group) => (
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
                        {line.value(results[year], salaryKnown)}
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

import {
  Card,
  ChartFigure,
  chartColor,
  DONUT_GEOMETRY,
  Money,
  Num,
  Table,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import { type FC, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { TakeHomeResult } from "../../calculateUKTax";
import {
  cardBody,
  cardSubtitle,
  cardTitle,
  chartRow,
  compactTable,
  donutCentre,
  donutCentreLabel,
  donutFrame,
  legend,
  legendRow,
  legendShare,
  totalCell,
} from "./TakeHomeBreakdown.styles";

export interface TakeHomeBreakdownProps {
  grossSalary: number;
  results: TakeHomeResult;
  isSalarySacrifice: boolean;
}

const Swatch: FC<{ fill: string }> = ({ fill }) => (
  <svg aria-hidden="true" focusable="false" height="10" viewBox="0 0 10 10" width="10">
    <circle cx="5" cy="5" fill={fill} r="5" />
  </svg>
);

/** Donut, legend and the annual and monthly deductions table for one salary. */
export const TakeHomeBreakdown: FC<TakeHomeBreakdownProps> = ({
  grossSalary,
  results,
  isSalarySacrifice,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const slices = useMemo(() => {
    const data = [
      { name: "Take-home pay", value: Math.round(results.netPay), fill: chartColor("wealth") },
      { name: "Income tax", value: Math.round(results.incomeTax), fill: chartColor("warning") },
      { name: "National Insurance", value: Math.round(results.ni), fill: chartColor("debt") },
    ];
    if (results.pension > 0) {
      data.push({
        name: "Pension contribution",
        value: Math.round(results.pension),
        fill: chartColor("accentPurple"),
      });
    }
    if (results.studentLoan > 0) {
      data.push({
        name: "Student loan repayment",
        value: Math.round(results.studentLoan),
        fill: chartColor("primary"),
      });
    }
    return data.filter((d) => d.value > 0);
  }, [results]);

  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const summary = `Where your ${formatCurrency(grossSalary)} gross salary goes: ${slices
    .map((d) => `${d.name} ${formatCurrency(d.value)}`)
    .join(", ")}.`;

  return (
    <Card padding="lg">
      <div className={cardBody()}>
        <div>
          <h2 className={cardTitle()}>Where your salary goes</h2>
          <p className={cardSubtitle()}>Your gross pay, split by what it is spent on</p>
        </div>

        <div className={chartRow()}>
          <ChartFigure hideTitle summary={summary} title="Salary allocation">
            <div className={donutFrame()}>
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    {...DONUT_GEOMETRY}
                    cx="50%"
                    cy="50%"
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {slices.map((s) => (
                      <Cell key={s.name} fill={s.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={donutCentre()}>
                <span className={donutCentreLabel()}>Gross pay</span>
                <Money size="lg" value={grossSalary} />
              </div>
            </div>
          </ChartFigure>

          <ul className={legend()}>
            {slices.map((s) => (
              <li key={s.name} className={legendRow()}>
                <Swatch fill={s.fill} />
                <span>{s.name}</span>
                <Money size="sm" value={s.value} />
                <span className={legendShare()}>
                  <Num
                    fractionDigits={0}
                    kind="percent"
                    size="sm"
                    tone="muted"
                    value={total > 0 ? (s.value / total) * 100 : 0}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Table caption="Salary deductions breakdown" className={compactTable()}>
          <THead>
            <tr>
              <Th>Item</Th>
              <Th numeric>A year</Th>
              <Th numeric>A month</Th>
            </tr>
          </THead>
          <TBody>
            <tr>
              <Td>Gross income</Td>
              <Td numeric>
                <Money size="sm" value={grossSalary} />
              </Td>
              <Td numeric>
                <Money size="sm" value={grossSalary / 12} />
              </Td>
            </tr>
            {results.pension > 0 && (
              <tr>
                <Td>Pension {isSalarySacrifice ? "(salary sacrifice)" : "(relief at source)"}</Td>
                <Td numeric>
                  <Money size="sm" value={-results.pension} />
                </Td>
                <Td numeric>
                  <Money size="sm" value={-results.pension / 12} />
                </Td>
              </tr>
            )}
            {results.employerNiSaving > 0 && (
              <tr>
                <Td>Employer NI paid into your pension</Td>
                <Td numeric>
                  <Money signDisplay="always" size="sm" value={results.employerNiSaving} />
                </Td>
                <Td numeric>
                  <Money signDisplay="always" size="sm" value={results.employerNiSaving / 12} />
                </Td>
              </tr>
            )}
            {results.incomeTax > 0 && (
              <tr>
                <Td>Income tax</Td>
                <Td numeric>
                  <Money size="sm" value={-results.incomeTax} />
                </Td>
                <Td numeric>
                  <Money size="sm" value={-results.incomeTax / 12} />
                </Td>
              </tr>
            )}
            {results.ni > 0 && (
              <tr>
                <Td>National Insurance</Td>
                <Td numeric>
                  <Money size="sm" value={-results.ni} />
                </Td>
                <Td numeric>
                  <Money size="sm" value={-results.ni / 12} />
                </Td>
              </tr>
            )}
            {results.studentLoan > 0 && (
              <tr>
                <Td>Student loan</Td>
                <Td numeric>
                  <Money size="sm" value={-results.studentLoan} />
                </Td>
                <Td numeric>
                  <Money size="sm" value={-results.studentLoan / 12} />
                </Td>
              </tr>
            )}
            <tr>
              <Td className={totalCell()}>Estimated take-home</Td>
              <Td className={totalCell()} numeric>
                <Money size="sm" value={results.netPay} />
              </Td>
              <Td className={totalCell()} numeric>
                <Money size="sm" value={results.netPay / 12} />
              </Td>
            </tr>
          </TBody>
        </Table>
      </div>
    </Card>
  );
};

export default TakeHomeBreakdown;

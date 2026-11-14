import { ChartFigure, Table, TBody, Td, THead, Th } from "@repo/ui";
import { type FC, useMemo } from "react";
import { ChartDataRow } from "~/components/charts/ChartDataRow";
import { MonthLinePlot } from "~/components/charts/MonthLinePlot";
import { changeSinceSentence, formatMonth, toLinePoints } from "~/features/snapshot/snapshotModel";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { chartStack } from "./AccountDetailChart.styles";

/** One month of an account's balance, oldest first. */
export interface AccountChartRow {
  month: number;
  year: number;
  /** The balance as shown (a debt is the amount owed). */
  value: number;
  /** How a recorded figure was given: "calculated", "confirmed", or typed (anything else). */
  source?: unknown;
  /** This month's saved balance, not recorded yet: the dashed end of the line. */
  carried?: boolean;
}

interface AccountDetailChartProps {
  accountDetails: readonly AccountChartRow[];
  /** Accessible name for the chart (for example "Mortgage balance history"). */
  title?: string;
}

/** Fewest months worth a line on the account page. */
const MIN_ACCOUNT_POINTS = 2;

const monthKey = (r: AccountChartRow): string => `${r.year}-${String(r.month).padStart(2, "0")}`;

/** How the figure was given, for the "Show data" table's Source column. */
export const accountSourceLabel = (row: AccountChartRow): string => {
  if (row.carried) return "Saved balance";
  if (row.source === "calculated") return "Calculated";
  if (row.source === "confirmed") return "Confirmed";
  return "Recorded";
};

/**
 * The summary under the account chart: the change since the first month and, when this month is
 * not recorded, one clause for the dashed end. Matches the net worth history summary.
 */
export const accountChartSummary = (
  rows: readonly AccountChartRow[],
  format: (value: number) => string,
): string => {
  const takeaway = changeSinceSentence(
    rows.map((r) => ({ month: monthKey(r), value: r.value })),
    format,
  );
  const endCarried = rows.at(-1)?.carried === true;
  return [
    takeaway,
    endCarried ? "The dashed end is this month's saved balance, not yet recorded." : "",
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * One account's balance over time, drawn exactly like net worth history (the shared
 * `MonthLinePlot`): evenly spaced month ticks, round £k ticks, the end point labelled with the
 * current figure, and a dashed last segment when this month is not recorded. The visible summary
 * carries the takeaway; "Show data" lists every month with how it was given.
 */
const AccountDetailChart: FC<AccountDetailChartProps> = ({
  accountDetails,
  title = "Account balance history",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const points = useMemo(
    () =>
      toLinePoints(
        accountDetails.map((r) => ({
          month: monthKey(r),
          value: r.value,
          carried: r.carried === true,
        })),
      ),
    [accountDetails],
  );
  const last = points.at(-1);
  const whole = (v: number) => formatCurrency(v, { maximumFractionDigits: 0 });

  return (
    <div className={chartStack()}>
      <ChartFigure
        annotation={last ? { x: last.label, label: formatCurrency(last.netWorth) } : undefined}
        directLabels
        headingLevel="h2"
        hideTitle
        minPoints={MIN_ACCOUNT_POINTS}
        notEnoughDataText="The chart appears once this account has more monthly balances."
        pointCount={points.length}
        summary={accountChartSummary(accountDetails, whole)}
        title={title}
      >
        <MonthLinePlot id="account-detail-chart" points={points} valueName="Balance" />
      </ChartFigure>
      <ChartDataRow
        table={
          accountDetails.length > 0 ? (
            <Table caption={`${title} by month`}>
              <THead>
                <tr>
                  <Th>Month</Th>
                  <Th numeric>Balance</Th>
                  <Th>Source</Th>
                </tr>
              </THead>
              <TBody>
                {accountDetails.map((r) => (
                  <tr key={monthKey(r)}>
                    <Th scope="row">{formatMonth(monthKey(r))}</Th>
                    <Td numeric>{formatCurrency(r.value)}</Td>
                    <Td>{accountSourceLabel(r)}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : undefined
        }
      />
    </div>
  );
};

export default AccountDetailChart;

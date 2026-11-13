import { Card, CollapsibleDrawer, Table, TBody, Td, THead, Th, VisuallyHidden } from "@repo/ui";
import { type FC, type ReactNode, useId } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatSignedChange, spokenChange } from "../../snapshotCopy";
import {
  type AccountChange,
  formatMonth,
  type MonthChangeRow,
  type MonthKey,
} from "../../snapshotModel";
import { changeCell, tableCard, tableHeading, tableNote } from "./MonthlyChangeTable.styles";

/** Tables longer than this go inside a CollapsibleDrawer (AGENTS.md section 3). */
export const MAX_OPEN_ROWS = 8;

export type MonthlyChangeTableProps =
  | {
      variant: "accounts";
      rows: readonly AccountChange[];
      month: MonthKey;
      previousMonth: MonthKey;
    }
  | { variant: "months"; rows: readonly MonthChangeRow[] };

const Change: FC<{ value: number }> = ({ value }) => (
  <span className={changeCell()}>
    <span aria-hidden="true">{formatSignedChange(value)}</span>
    <VisuallyHidden>{spokenChange(value)}</VisuallyHidden>
  </span>
);

/**
 * Month-on-month change, current minus previous, worded the same either way (advice policy R1).
 * `accounts` lists each account between the last two months; `months` lists the total per month.
 * Debts show the amount owed, so a smaller balance is a negative change.
 */
export const MonthlyChangeTable: FC<MonthlyChangeTableProps> = (props) => {
  const { formatCurrency } = useFormatCurrency();
  const headingId = useId();

  let title: string;
  let note: string;
  let table: ReactNode;
  if (props.variant === "accounts") {
    title = "Change by account";
    note = `${formatMonth(props.previousMonth)} to ${formatMonth(props.month)}. Debts show the amount owed.`;
    table = (
      <Table
        caption={`Change by account, ${formatMonth(props.previousMonth)} to ${formatMonth(props.month)}`}
      >
        <THead>
          <tr>
            <Th>Account</Th>
            <Th numeric>{formatMonth(props.previousMonth)}</Th>
            <Th numeric>{formatMonth(props.month)}</Th>
            <Th numeric>Change</Th>
          </tr>
        </THead>
        <TBody>
          {props.rows.map((r) => (
            <tr key={r.accountId}>
              <Th scope="row">
                {r.name}
                {r.isLiability ? " (owed)" : ""}
              </Th>
              <Td numeric>{formatCurrency(r.previous)}</Td>
              <Td numeric secondary={r.carried ? "Carried forward" : undefined}>
                {formatCurrency(r.current)}
              </Td>
              <Td numeric>
                <Change value={r.change} />
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
    );
  } else {
    title = "Change by month";
    note = "Net worth at each month, and the change from the month before.";
    table = (
      <Table caption="Net worth change by month">
        <THead>
          <tr>
            <Th>Month</Th>
            <Th numeric>Net worth</Th>
            <Th numeric>Change</Th>
          </tr>
        </THead>
        <TBody>
          {props.rows.map((r) => (
            <tr key={r.month}>
              <Th scope="row">{formatMonth(r.month)}</Th>
              <Td
                numeric
                secondary={
                  r.allCarried
                    ? "Carried forward"
                    : r.addedAccounts > 0
                      ? `Includes ${r.addedAccounts} new ${r.addedAccounts === 1 ? "account" : "accounts"}`
                      : undefined
                }
              >
                {formatCurrency(r.netWorth)}
              </Td>
              <Td numeric>
                <Change value={r.change} />
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
    );
  }

  if (props.rows.length > MAX_OPEN_ROWS) {
    return (
      <CollapsibleDrawer
        closedLabel="Show table"
        itemCount={props.rows.length}
        itemNoun={
          props.variant === "accounts"
            ? { one: "account", other: "accounts" }
            : { one: "month", other: "months" }
        }
        openLabel="Hide table"
        subtitle={note}
        title={title}
      >
        {table}
      </CollapsibleDrawer>
    );
  }

  return (
    <Card aria-labelledby={headingId} as="section" className={tableCard()} padding="md">
      <h3 className={tableHeading()} id={headingId}>
        {title}
      </h3>
      <p className={tableNote()}>{note}</p>
      {table}
    </Card>
  );
};

export default MonthlyChangeTable;

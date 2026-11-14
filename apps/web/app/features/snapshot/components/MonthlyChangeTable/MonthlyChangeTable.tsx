import { Table, TBody, Td, THead, Th, Tr, VisuallyHidden } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatSignedChange, spokenChange } from "../../snapshotCopy";
import {
  type AccountChange,
  formatMonth,
  type MonthChangeRow,
  type MonthKey,
} from "../../snapshotModel";
import { changeCell, tableBlock, tableNote, wideOnly } from "./MonthlyChangeTable.styles";

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
 * Debts show the amount owed, so a smaller balance is a negative change. The table has no heading
 * or drawer of its own: the page shows it inside one quiet drawer, under a tab that names it
 * (AGENTS.md section 3). Neither table stacks into labelled cards on phones: the month table fits
 * in three columns, and the account table hides its earlier-month column under `md`.
 */
export const MonthlyChangeTable: FC<MonthlyChangeTableProps> = (props) => {
  const { formatCurrency } = useFormatCurrency();

  let note: string;
  let table: ReactNode;
  if (props.variant === "accounts") {
    // The column headers name both months, so the note does not repeat them.
    note = "Debts show the amount owed.";
    table = (
      <Table
        caption={`Change by account, ${formatMonth(props.previousMonth)} to ${formatMonth(props.month)}`}
      >
        <THead>
          <Tr>
            <Th>Account</Th>
            <Th className={wideOnly()} numeric>
              {formatMonth(props.previousMonth)}
            </Th>
            <Th numeric>{formatMonth(props.month)}</Th>
            <Th numeric>Change</Th>
          </Tr>
        </THead>
        <TBody>
          {props.rows.map((r) => (
            <Tr data-list-row="" key={r.accountId}>
              <Th scope="row">
                {r.name}
                {r.isLiability ? " (owed)" : ""}
              </Th>
              <Td className={wideOnly()} numeric>
                {formatCurrency(r.previous)}
              </Td>
              <Td numeric secondary={r.carried ? "Carried forward" : undefined}>
                {formatCurrency(r.current)}
              </Td>
              <Td numeric>
                <Change value={r.change} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    );
  } else {
    note = "Net worth at each month, and the change from the month before.";
    table = (
      <Table caption="Net worth change by month">
        <THead>
          <Tr>
            <Th>Month</Th>
            <Th numeric>Net worth</Th>
            <Th numeric>Change</Th>
          </Tr>
        </THead>
        <TBody>
          {props.rows.map((r) => (
            <Tr data-list-row="" key={r.month}>
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
            </Tr>
          ))}
        </TBody>
      </Table>
    );
  }

  return (
    <div
      className={tableBlock()}
      data-testid={`snapshot-change-${props.variant}`}
      id={`snapshot-change-${props.variant}`}
    >
      <p className={tableNote()}>{note}</p>
      {table}
    </div>
  );
};

export default MonthlyChangeTable;

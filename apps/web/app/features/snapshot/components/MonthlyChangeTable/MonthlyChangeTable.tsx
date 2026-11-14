import { Card, CollapsibleDrawer, Table, TBody, Td, THead, Th, Tr, VisuallyHidden } from "@repo/ui";
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
    // The column headers name both months, so the note does not repeat them.
    note = "Debts show the amount owed.";
    table = (
      <Table
        stacked
        caption={`Change by account, ${formatMonth(props.previousMonth)} to ${formatMonth(props.month)}`}
      >
        <THead>
          <Tr>
            <Th>Account</Th>
            <Th numeric>{formatMonth(props.previousMonth)}</Th>
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
              <Td label={formatMonth(props.previousMonth)} numeric>
                {formatCurrency(r.previous)}
              </Td>
              <Td
                label={formatMonth(props.month)}
                numeric
                secondary={r.carried ? "Carried forward" : undefined}
              >
                {formatCurrency(r.current)}
              </Td>
              <Td label="Change" numeric>
                <Change value={r.change} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    );
  } else {
    title = "Change by month";
    note = "Net worth at each month, and the change from the month before.";
    table = (
      <Table caption="Net worth change by month" stacked>
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
                label="Net worth"
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
              <Td label="Change" numeric>
                <Change value={r.change} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    );
  }

  if (props.rows.length > MAX_OPEN_ROWS) {
    return (
      <CollapsibleDrawer
        className={tableCard()}
        itemCount={props.rows.length}
        itemNoun={
          props.variant === "accounts"
            ? { one: "account", other: "accounts" }
            : { one: "month", other: "months" }
        }
        openLabel={`Hide ${title.toLowerCase()}`}
        title={title}
        variant="quiet"
      >
        <p className={tableNote()}>{note}</p>
        {table}
      </CollapsibleDrawer>
    );
  }

  return (
    <Card
      aria-labelledby={headingId}
      as="section"
      className={tableCard()}
      data-testid={`snapshot-change-${props.variant}`}
      id={`snapshot-change-${props.variant}`}
      padding="md"
    >
      <h3 className={tableHeading()} id={headingId}>
        {title}
      </h3>
      <p className={tableNote()}>{note}</p>
      {table}
    </Card>
  );
};

export default MonthlyChangeTable;

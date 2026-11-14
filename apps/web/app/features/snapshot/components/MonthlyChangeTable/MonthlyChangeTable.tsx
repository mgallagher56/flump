import { Table, TBody, Td, THead, Th, Tr, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatSignedChange, spokenChange } from "../../snapshotCopy";
import {
  type AccountChange,
  formatMonth,
  historySourceLabel,
  type MonthKey,
} from "../../snapshotModel";
import { changeCell, changeTable, tableBlock, wideOnly } from "./MonthlyChangeTable.styles";

export interface MonthlyChangeTableProps {
  rows: readonly AccountChange[];
  month: MonthKey;
  previousMonth: MonthKey;
}

const Change: FC<{ value: number }> = ({ value }) => (
  <span className={changeCell()}>
    <span aria-hidden="true">{formatSignedChange(value)}</span>
    <VisuallyHidden>{spokenChange(value)}</VisuallyHidden>
  </span>
);

/**
 * Each account between the last two recorded months, and its effect on net worth: what you own
 * that grows and a debt that falls both read as a positive effect, worded the same either way
 * (advice policy R1). Balances show as they are saved, so debts carry "(owed)" after the name.
 * The table has no heading or drawer of its own: the page shows it inside one quiet drawer
 * (AGENTS.md section 3). It never stacks into labelled cards on phones: the earlier month's
 * column hides under `md`, leaving three columns.
 */
export const MonthlyChangeTable: FC<MonthlyChangeTableProps> = ({ rows, month, previousMonth }) => {
  const { formatCurrency } = useFormatCurrency();

  return (
    <div
      className={tableBlock()}
      data-testid="snapshot-change-accounts"
      id="snapshot-change-accounts"
    >
      <Table
        className={changeTable()}
        caption={`Change by account, ${formatMonth(previousMonth)} to ${formatMonth(month)}`}
      >
        <THead>
          <Tr>
            <Th>Account</Th>
            <Th className={wideOnly()} numeric>
              {formatMonth(previousMonth)}
            </Th>
            <Th numeric>{formatMonth(month)}</Th>
            <Th numeric>Effect on net worth</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((r) => (
            <Tr data-list-row="" key={r.accountId}>
              <Th scope="row">
                {r.name}
                {r.isLiability ? " (owed)" : ""}
              </Th>
              <Td className={wideOnly()} numeric>
                {formatCurrency(r.previous)}
              </Td>
              <Td
                numeric
                secondary={r.carried ? "Carried forward" : historySourceLabel(r.currentSource)}
              >
                {formatCurrency(r.current)}
              </Td>
              <Td numeric>
                <Change value={r.effect} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
};

export default MonthlyChangeTable;

import {
  Card,
  Checkbox,
  CollapsibleDrawer,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from "@repo/ui";
import { type FC, type ReactNode, useId } from "react";
import { formatMonth } from "~/features/snapshot/snapshotModel";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { FLAGGED_HELP, replaceLabel, rowStatusLabel } from "../../importCopy";
import { groupByMonth, type PreviewAccount, type PreviewRow } from "../../importModel";
import { flaggedList, heading, note, section, tableCard } from "./ImportDiffTable.styles";

/** Tables longer than this go inside a CollapsibleDrawer (AGENTS.md section 3). */
export const MAX_OPEN_ROWS = 8;

export interface ImportDiffTableProps {
  accounts: readonly PreviewAccount[];
  rows: readonly PreviewRow[];
  /** Keys of flagged rows the user has ticked to replace. */
  ticked: ReadonlySet<string>;
  onToggle: (key: string, checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Step two of the review: the diff by month and account. Rows that would replace a value already
 * saved in Flump are listed first, each with its own tick, unticked by default; the full table
 * follows, in a drawer when it is long.
 */
export const ImportDiffTable: FC<ImportDiffTableProps> = ({
  accounts,
  rows,
  ticked,
  onToggle,
  disabled = false,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const headingId = useId();
  const names = new Map(accounts.map((a) => [a.ref, a.name]));
  const flagged = rows.filter((r) => r.needsTick);
  const groups = groupByMonth(rows, accounts);

  const statusCell = (r: PreviewRow): ReactNode => {
    if (r.needsTick) {
      return (
        <StatusBadge size="sm" variant={ticked.has(r.key) ? "warning" : "neutral"}>
          {ticked.has(r.key) ? "Will be saved" : "Skipped unless ticked"}
        </StatusBadge>
      );
    }
    return (
      <StatusBadge size="sm" variant={r.status === "unchanged" ? "neutral" : "info"}>
        {rowStatusLabel(r)}
      </StatusBadge>
    );
  };

  const table = (
    <Table caption="Changes by month and account" stacked>
      <THead>
        <Tr>
          <Th>Month</Th>
          <Th>Account</Th>
          <Th numeric>In the import</Th>
          <Th numeric>Saved now</Th>
          <Th>What happens</Th>
        </Tr>
      </THead>
      <TBody>
        {groups.flatMap((g) =>
          g.rows.map((r) => (
            <Tr key={r.key}>
              <Th scope="row">{formatMonth(g.month)}</Th>
              <Td label="Account">{names.get(r.ref) ?? r.ref}</Td>
              <Td label="In the import" numeric>
                {formatCurrency(r.value)}
              </Td>
              <Td label="Saved now" numeric>
                {r.prior === null ? "None" : formatCurrency(r.prior)}
              </Td>
              <Td label="What happens">{statusCell(r)}</Td>
            </Tr>
          )),
        )}
      </TBody>
    </Table>
  );

  return (
    <section aria-labelledby={headingId} className={section()}>
      <h2 className={heading()} id={headingId}>
        Review changes
      </h2>

      {flagged.length > 0 ? (
        <Card
          as="section"
          aria-label="Rows to review"
          padding="md"
          data-testid="import-flagged"
          id="import-flagged"
        >
          <p className={note()}>{FLAGGED_HELP}</p>
          <ul className={flaggedList()}>
            {flagged.map((r) => (
              <li key={r.key}>
                <Checkbox
                  checked={ticked.has(r.key)}
                  data-testid={`import-tick-${r.key}`}
                  id={`import-tick-${r.key}`}
                  disabled={disabled}
                  hint={`${formatMonth(r.month)}, ${names.get(r.ref) ?? r.ref}: ${formatCurrency(r.value)} in the import`}
                  label={replaceLabel(r, r.prior === null ? null : formatCurrency(r.prior))}
                  onChange={(e) => onToggle(r.key, e.target.checked)}
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {rows.length > MAX_OPEN_ROWS ? (
        <CollapsibleDrawer
          className={tableCard()}
          closedLabel="Show table"
          itemCount={rows.length}
          itemNoun={{ one: "balance", other: "balances" }}
          openLabel="Hide table"
          subtitle="Every monthly balance in the import, newest month first. Debts show as negative."
          title="All changes"
        >
          {table}
        </CollapsibleDrawer>
      ) : (
        <Card as="section" aria-label="All changes" className={tableCard()} padding="md">
          <p className={note()}>Newest month first. Debts show as negative.</p>
          {table}
        </Card>
      )}
    </section>
  );
};

export default ImportDiffTable;

import {
  Card,
  Checkbox,
  CollapsibleDrawer,
  StatusBadge,
  Table,
  TableFilterSelect,
  TableToolbar,
  TBody,
  Td,
  THead,
  Th,
  Tr,
  useTableFilter,
  useTableSort,
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
  const ordered = groups.flatMap((g) => g.rows);
  const { filteredRows, filterValues, setFilter } = useTableFilter({
    rows: ordered,
    filters: { account: (r) => r.ref, status: (r) => r.status },
  });
  const { sortedRows, getSortProps } = useTableSort({
    rows: filteredRows,
    columns: {
      month: { value: (r) => r.month, firstDirection: "desc" },
      account: { value: (r) => names.get(r.ref) ?? r.ref },
      value: { value: (r) => r.value, firstDirection: "desc" },
      // No saved value yet ("None") sorts last.
      prior: { value: (r) => r.prior, firstDirection: "desc" },
      status: { value: (r) => rowStatusLabel(r) },
    },
  });

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
    <>
      <TableToolbar>
        <TableFilterSelect
          allLabel="All accounts"
          label="Account"
          options={accounts.map((a) => ({ value: a.ref, label: a.name }))}
          value={filterValues.account}
          onChange={(v) => setFilter("account", v)}
        />
        <TableFilterSelect
          allLabel="All rows"
          label="What happens"
          options={[
            { value: "new", label: "New" },
            { value: "overwrite", label: "Replaces" },
            { value: "unchanged", label: "No change" },
          ]}
          value={filterValues.status}
          onChange={(v) => setFilter("status", v)}
        />
      </TableToolbar>
      <Table caption="Changes by month and account" stacked>
        <THead>
          <Tr>
            <Th {...getSortProps("month")}>Month</Th>
            <Th text {...getSortProps("account")}>
              Account
            </Th>
            <Th numeric {...getSortProps("value")}>
              In the import
            </Th>
            <Th numeric {...getSortProps("prior")}>
              Saved now
            </Th>
            <Th text {...getSortProps("status")}>
              What happens
            </Th>
          </Tr>
        </THead>
        <TBody>
          {sortedRows.map((r) => (
            <Tr key={r.key}>
              <Th scope="row">{formatMonth(r.month)}</Th>
              <Td label="Account" text>
                {names.get(r.ref) ?? r.ref}
              </Td>
              <Td label="In the import" numeric>
                {formatCurrency(r.value)}
              </Td>
              <Td label="Saved now" numeric>
                {r.prior === null ? "None" : formatCurrency(r.prior)}
              </Td>
              <Td label="What happens">{statusCell(r)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </>
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

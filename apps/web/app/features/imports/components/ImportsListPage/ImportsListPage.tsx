import {
  Button,
  Card,
  CollapsibleDrawer,
  EmptyState,
  PageBody,
  PageHeader,
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
import type { FC } from "react";
import { Link } from "react-router";
import {
  balancesLabel,
  formatDate,
  LIST_DESCRIPTION,
  LIST_EMPTY_BODY,
  LIST_EMPTY_TITLE,
  STATUS_LABEL,
  STATUS_TONE,
} from "../../importCopy";
import type { ImportBatch } from "../../importModel";
import { MAX_OPEN_ROWS } from "../ImportDiffTable";
import { tableCard } from "./ImportsListPage.styles";

export interface ImportsListPageProps {
  batches: readonly ImportBatch[];
}

function outcome(b: ImportBatch): string {
  if (b.status === "staged") return `${balancesLabel(b.counts.staged)} to review`;
  if (b.status === "committed") {
    return `${(b.counts.new ?? 0) + (b.counts.overwrite ?? 0)} saved`;
  }
  if (b.status === "reverted") return "Undone";
  return "Cleared without saving";
}

/** The user's imports, newest first, with a link to review or revisit each one. */
const STATUS_FILTER_OPTIONS = (Object.keys(STATUS_LABEL) as ImportBatch["status"][]).map(
  (value) => ({ value, label: STATUS_LABEL[value] }),
);

export const ImportsListPage: FC<ImportsListPageProps> = ({ batches }) => {
  const { filteredRows, filterValues, setFilter } = useTableFilter({
    rows: batches,
    filters: { status: (b) => b.status },
  });
  const { sortedRows, getSortProps } = useTableSort({
    rows: filteredRows,
    columns: {
      received: { value: (b) => new Date(b.createdAt), firstDirection: "desc" },
      status: { value: (b) => STATUS_LABEL[b.status] },
      outcome: { value: outcome },
    },
  });
  const table = (
    <>
      <TableToolbar>
        <TableFilterSelect
          allLabel="All statuses"
          label="Status"
          options={STATUS_FILTER_OPTIONS}
          value={filterValues.status}
          onChange={(v) => setFilter("status", v)}
        />
      </TableToolbar>
      <Table caption="Your imports" stacked>
        <THead>
          <Tr>
            <Th {...getSortProps("received")}>Received</Th>
            <Th text {...getSortProps("status")}>
              Status
            </Th>
            <Th text {...getSortProps("outcome")}>
              Outcome
            </Th>
            <Th align="end">Action</Th>
          </Tr>
        </THead>
        <TBody>
          {sortedRows.map((b) => (
            <Tr key={b.batchId}>
              <Th scope="row">{formatDate(b.createdAt)}</Th>
              <Td label="Status">
                <StatusBadge size="sm" variant={STATUS_TONE[b.status]}>
                  {STATUS_LABEL[b.status]}
                </StatusBadge>
              </Td>
              <Td label="Outcome">{outcome(b)}</Td>
              <Td align="end" label="Action">
                <Button asChild size="sm" variant={b.status === "staged" ? "primary" : "ghost"}>
                  <Link
                    aria-label={`${b.status === "staged" ? "Review" : "View"} import received ${formatDate(b.createdAt)}`}
                    data-testid={`import-open-${b.batchId}`}
                    id={`import-open-${b.batchId}`}
                    to={`/app/imports/${b.batchId}`}
                  >
                    {b.status === "staged" ? "Review" : "View"}
                  </Link>
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </>
  );

  return (
    <PageBody data-testid="imports-list" id="imports-list">
      <PageHeader description={LIST_DESCRIPTION} title="Imports" />
      {batches.length === 0 ? (
        <EmptyState description={LIST_EMPTY_BODY} id="imports-empty" title={LIST_EMPTY_TITLE} />
      ) : batches.length > MAX_OPEN_ROWS ? (
        <CollapsibleDrawer
          className={tableCard()}
          closedLabel="Show imports"
          defaultOpen
          itemCount={batches.length}
          itemNoun={{ one: "import", other: "imports" }}
          openLabel="Hide imports"
          title="All imports"
        >
          {table}
        </CollapsibleDrawer>
      ) : (
        <Card as="section" aria-label="All imports" className={tableCard()} padding="md">
          {table}
        </Card>
      )}
    </PageBody>
  );
};

export default ImportsListPage;

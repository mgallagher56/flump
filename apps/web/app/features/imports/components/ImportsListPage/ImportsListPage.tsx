import {
  Button,
  Card,
  CollapsibleDrawer,
  EmptyState,
  PageHeader,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
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
import { page, tableCard } from "./ImportsListPage.styles";

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
export const ImportsListPage: FC<ImportsListPageProps> = ({ batches }) => {
  const table = (
    <Table caption="Your imports, newest first" stacked>
      <THead>
        <Tr>
          <Th>Received</Th>
          <Th>Status</Th>
          <Th>Outcome</Th>
          <Th align="end">Action</Th>
        </Tr>
      </THead>
      <TBody>
        {batches.map((b) => (
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
  );

  return (
    <div className={page()} data-testid="imports-list" id="imports-list">
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
    </div>
  );
};

export default ImportsListPage;

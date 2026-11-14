import {
  getCategoriesForSource,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  EmptyState,
  FormField,
  Icon,
  Illustration,
  Money,
  Select,
  Table,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import { Paperclip, Trash2 } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { FREQUENCY_LABEL, recordAmount, SOURCE_LABEL, SOURCE_OPTIONS } from "../../tax-labels";
import {
  actions,
  cellMuted,
  filters,
  iconButton,
  nameButton,
  pager,
  pagerButtons,
  root,
  secondaryLine,
  summary,
} from "./TaxRecordsTable.styles";

export const TAX_RECORDS_PAGE_SIZE = 10;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
};
const countFormat = new Intl.NumberFormat("en-GB");

const categoryName = (catId: string, source: TaxSource) =>
  getCategoriesForSource(source).find((c) => c.id === catId)?.name ?? catId;

export interface TaxRecordsTableProps {
  records: TaxRecord[];
  availableYears: string[];
  onEdit: (record: TaxRecord) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (record: TaxRecord) => void;
  onAdd: () => void;
}

/**
 * Every tax record, filterable by year, source and type, ten to a page. Each record's name is a
 * button that opens it for editing, so the table works from the keyboard (E8 J-03).
 */
export const TaxRecordsTable: FC<TaxRecordsTableProps> = ({
  records,
  availableYears,
  onEdit,
  onDelete,
  onViewReceipt,
  onAdd,
}) => {
  const [year, setYear] = useState("all");
  const [source, setSource] = useState<"all" | TaxSource>("all");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      records
        .filter((r) => year === "all" || isRecordActiveInTaxYear(r, year))
        .filter((r) => source === "all" || r.source === source)
        .filter((r) => type === "all" || r.type === type)
        .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)),
    [records, year, source, type],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / TAX_RECORDS_PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * TAX_RECORDS_PAGE_SIZE;
  const rows = filtered.slice(start, start + TAX_RECORDS_PAGE_SIZE);

  const onFilter =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(0);
    };

  if (records.length === 0) {
    return (
      <EmptyState
        headingLevel="h3"
        illustration={<Illustration scene="empty-accounts" size="sm" />}
        title="No records added"
        description="Add income or a cost and it will appear here, with every tax year it counts towards."
        action={
          <Button type="button" onClick={onAdd}>
            Add record
          </Button>
        }
      />
    );
  }

  return (
    <div className={root()}>
      <div className={filters()}>
        <FormField label="Tax year">
          {(field) => (
            <Select id={field.id} value={year} onChange={(e) => onFilter(setYear)(e.target.value)}>
              <option value="all">All tax years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Income source">
          {(field) => (
            <Select
              id={field.id}
              value={source}
              onChange={(e) => onFilter(setSource)(e.target.value as "all" | TaxSource)}
            >
              <option value="all">All sources</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Type">
          {(field) => (
            <Select
              id={field.id}
              value={type}
              onChange={(e) => onFilter(setType)(e.target.value as "all" | "income" | "expense")}
            >
              <option value="all">Income and costs</option>
              <option value="income">Income</option>
              <option value="expense">Costs</option>
            </Select>
          )}
        </FormField>
      </div>

      <p aria-live="polite" className={summary()}>
        {filtered.length === 0
          ? "No records match these filters."
          : `Showing ${countFormat.format(start + 1)} to ${countFormat.format(
              start + rows.length,
            )} of ${countFormat.format(filtered.length)} records`}
      </p>

      {rows.length > 0 ? (
        <Table caption="Tax records">
          <THead>
            <tr>
              <Th>Record</Th>
              <Th>Source</Th>
              <Th>Date</Th>
              <Th>How often</Th>
              <Th numeric>Amount</Th>
              <Th numeric>
                <span>Actions</span>
              </Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((record) => {
              const amount = recordAmount(record);
              const isIncome = record.type === "income";
              return (
                <tr key={record.id}>
                  <Td>
                    <button className={nameButton()} type="button" onClick={() => onEdit(record)}>
                      {record.name}
                    </button>
                    <span className={secondaryLine()}>
                      {categoryName(record.category, record.source)}
                      {record.endDate ? `, until ${formatDate(record.endDate)}` : ""}
                    </span>
                  </Td>
                  <Td className={cellMuted()}>{SOURCE_LABEL[record.source]}</Td>
                  <Td className={cellMuted()}>{formatDate(record.date)}</Td>
                  <Td className={cellMuted()}>{FREQUENCY_LABEL[record.frequency]}</Td>
                  <Td numeric>
                    <Money
                      fractionDigits={Number.isInteger(amount) ? 0 : 2}
                      size="sm"
                      signDisplay="always"
                      value={isIncome ? amount : -amount}
                    />
                  </Td>
                  <Td numeric>
                    <span className={actions()}>
                      {record.hasReceipt ? (
                        <button
                          aria-label={`View receipt for ${record.name}`}
                          className={iconButton()}
                          title="View receipt"
                          type="button"
                          onClick={() => onViewReceipt(record)}
                        >
                          <Icon icon={Paperclip} size="sm" />
                        </button>
                      ) : null}
                      <button
                        aria-label={`Delete ${record.name}`}
                        className={iconButton()}
                        title={`Delete ${record.name}`}
                        type="button"
                        onClick={() => onDelete(record.id)}
                      >
                        <Icon icon={Trash2} size="sm" />
                      </button>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      ) : null}

      {pageCount > 1 ? (
        <nav aria-label="Tax records pages" className={pager()}>
          <span className={summary()}>
            Page {countFormat.format(current + 1)} of {countFormat.format(pageCount)}
          </span>
          <span className={pagerButtons()}>
            <Button
              disabled={current === 0}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage(current - 1)}
            >
              Previous page
            </Button>
            <Button
              disabled={current >= pageCount - 1}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage(current + 1)}
            >
              Next page
            </Button>
          </span>
        </nav>
      ) : null}
    </div>
  );
};

export default TaxRecordsTable;

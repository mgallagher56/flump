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
  formatDate,
  Icon,
  IconButton,
  Menu,
  type MenuEntry,
  Money,
  Select,
  Table,
  TableToolbar,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { MoreHorizontal } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { categoryShortLabel, recordAmount, SOURCE_LABEL, SOURCE_OPTIONS } from "../../tax-labels";
import {
  amountCell,
  amountUnit,
  cellMuted,
  dateFigures,
  filters,
  nameButton,
  pager,
  pagerButtons,
  root,
  secondaryLine,
  summary,
  visuallyHidden,
  wideOnly,
} from "./TaxRecordsTable.styles";

export const TAX_RECORDS_PAGE_SIZE = 10;
/** The source and type filters show only past this many records in the year. */
export const TAX_RECORDS_FILTER_FROM = 8;

/** "6 Apr 2026" from `@repo/ui`'s short date (three-letter months); an unreadable date shows as is. */
const shortDate = (iso: string) => formatDate(iso, { placeholder: iso });
const countFormat = new Intl.NumberFormat("en-GB");

const categoryName = (catId: string, source: TaxSource) => {
  const category = getCategoriesForSource(source).find((c) => c.id === catId);
  return category ? categoryShortLabel(category) : catId;
};

/** How often an amount is paid, after the amount: "£1,500 a month". A one-off has none. */
const PER: Record<TaxRecord["frequency"], string> = {
  "one-off": "",
  monthly: "a month",
  annual: "a year",
};

export interface TaxRecordsTableProps {
  records: TaxRecord[];
  /** The page's tax year: the table lists the records that count towards it. */
  taxYear: string;
  onEdit: (record: TaxRecord) => void;
  onDelete: (id: string) => void;
  onViewReceipt: (record: TaxRecord) => void;
  onAdd: () => void;
  /** Which records to list. By default, the ones that count towards `taxYear`. */
  include?: (record: TaxRecord) => boolean;
  /** The table's caption. By default, "Records for 2026/27". */
  caption?: string;
}

/**
 * The records that count towards the page's tax year, ten to a page. Each record's name is a
 * button that opens it for editing, so the table works from the keyboard (E8 J-03); its other
 * actions are in one menu at the end of the row. Under `md` the row is the name, its category,
 * the amount and the menu; the date and source columns join from `md`. The source column shows
 * only when the year has more than one source, and the filters only past eight records.
 */
export const TaxRecordsTable: FC<TaxRecordsTableProps> = ({
  records,
  taxYear,
  onEdit,
  onDelete,
  onViewReceipt,
  onAdd,
  include,
  caption,
}) => {
  const [source, setSource] = useState<"all" | TaxSource>("all");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "source" | "date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const inYear = useMemo(
    () => records.filter(include ?? ((r) => isRecordActiveInTaxYear(r, taxYear))),
    [records, taxYear, include],
  );
  const showFilters = inYear.length > TAX_RECORDS_FILTER_FROM;
  const sources = new Set(inYear.map((r) => r.source));
  const showSource = sources.size > 1;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const factor = sortDir === "asc" ? 1 : -1;
    return inYear
      .filter((r) => !showFilters || source === "all" || r.source === source)
      .filter((r) => !showFilters || type === "all" || r.type === type)
      .filter(
        (r) =>
          !showFilters ||
          !query ||
          r.name.toLowerCase().includes(query) ||
          categoryName(r.category, r.source).toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name) * factor;
        if (sortBy === "source")
          return SOURCE_LABEL[a.source].localeCompare(SOURCE_LABEL[b.source]) * factor;
        if (sortBy === "amount") {
          const av = a.type === "income" ? recordAmount(a) : -recordAmount(a);
          const bv = b.type === "income" ? recordAmount(b) : -recordAmount(b);
          return (av - bv) * factor;
        }
        return a.date.localeCompare(b.date) * factor || a.name.localeCompare(b.name);
      });
  }, [inYear, showFilters, source, type, search, sortBy, sortDir]);

  const toggleSort = (col: "name" | "source" | "date" | "amount") => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "date" || col === "amount" ? "desc" : "asc");
    }
    setPage(0);
  };

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

  if (inYear.length === 0) {
    return (
      <EmptyState
        headingLevel="h3"
        title={`No records for ${taxYear}`}
        description="Add income or an expense and it will appear here."
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
      {showFilters ? (
        <TableToolbar
          className={filters()}
          searchLabel="Search records"
          searchPlaceholder="Filter by name or category"
          searchValue={search}
          onSearchChange={onFilter(setSearch)}
        >
          <FormField label="Income source">
            {(field) => (
              <Select
                id={field.id}
                value={source}
                onChange={(e) => onFilter(setSource)(e.target.value as "all" | TaxSource)}
              >
                <option value="all">All sources</option>
                {SOURCE_OPTIONS.filter((o) => sources.has(o.value)).map((o) => (
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
                <option value="all">Income and expenses</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </Select>
            )}
          </FormField>
        </TableToolbar>
      ) : null}

      {showFilters || pageCount > 1 ? (
        <p aria-live="polite" className={summary()}>
          {filtered.length === 0
            ? "No records match these filters."
            : `Showing ${countFormat.format(start + 1)} to ${countFormat.format(
                start + rows.length,
              )} of ${countFormat.format(filtered.length)} records`}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <Table caption={caption ?? `Records for ${taxYear}`}>
          <THead>
            <tr>
              <Th
                sortDirection={sortBy === "name" ? sortDir : "none"}
                text
                onSort={() => toggleSort("name")}
              >
                Record
              </Th>
              {showSource ? (
                <Th
                  className={wideOnly()}
                  sortDirection={sortBy === "source" ? sortDir : "none"}
                  text
                  onSort={() => toggleSort("source")}
                >
                  Source
                </Th>
              ) : null}
              <Th
                className={wideOnly()}
                sortDirection={sortBy === "date" ? sortDir : "none"}
                onSort={() => toggleSort("date")}
              >
                Date
              </Th>
              <Th
                numeric
                sortDirection={sortBy === "amount" ? sortDir : "none"}
                onSort={() => toggleSort("amount")}
              >
                Amount
              </Th>
              <Th numeric>
                <span className={visuallyHidden()}>Actions</span>
              </Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((record) => {
              const amount = recordAmount(record);
              const per = PER[record.frequency];
              const items: MenuEntry[] = [
                ...(record.hasReceipt
                  ? [
                      {
                        id: `receipt-${record.id}`,
                        label: "View receipt",
                        onSelect: () => onViewReceipt(record),
                      },
                    ]
                  : []),
                {
                  id: `delete-${record.id}`,
                  label: "Delete",
                  tone: "danger" as const,
                  onSelect: () => onDelete(record.id),
                },
              ];
              return (
                <tr key={record.id}>
                  <Td text>
                    <button className={nameButton()} type="button" onClick={() => onEdit(record)}>
                      {record.name}
                    </button>
                    <span className={secondaryLine()}>
                      {categoryName(record.category, record.source)}
                      {record.endDate ? (
                        <>
                          , until <span className={dateFigures()}>{shortDate(record.endDate)}</span>
                        </>
                      ) : null}
                    </span>
                  </Td>
                  {showSource ? (
                    <Td className={cx(cellMuted(), wideOnly())} text>
                      {SOURCE_LABEL[record.source]}
                    </Td>
                  ) : null}
                  <Td className={cx(cellMuted(), wideOnly())}>{shortDate(record.date)}</Td>
                  <Td numeric>
                    <span className={amountCell()}>
                      <Money
                        fractionDigits={Number.isInteger(amount) ? 0 : 2}
                        size="sm"
                        value={record.type === "income" ? amount : -amount}
                      />
                      {per ? <span className={amountUnit()}>{per}</span> : null}
                    </span>
                  </Td>
                  <Td numeric>
                    <Menu
                      align="end"
                      aria-label={`Actions for ${record.name}`}
                      items={items}
                      trigger={
                        <IconButton label={`Actions for ${record.name}`} size="sm">
                          <Icon icon={MoreHorizontal} size="sm" />
                        </IconButton>
                      }
                    />
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

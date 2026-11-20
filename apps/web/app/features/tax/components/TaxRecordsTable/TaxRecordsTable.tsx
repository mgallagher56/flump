import {
  getCategoriesForSource,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  EmptyState,
  formatDate,
  Icon,
  IconButton,
  Menu,
  type MenuEntry,
  Money,
  Table,
  TableFilterSelect,
  TableToolbar,
  TBody,
  Td,
  THead,
  Th,
  useTableFilter,
  useTableSort,
} from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { MoreHorizontal } from "lucide-react";
import { type FC, type MouseEvent, useMemo, useState } from "react";
import { categoryShortLabel, recordAmount, SOURCE_LABEL, SOURCE_OPTIONS } from "../../tax-labels";
import {
  amountCell,
  amountUnit,
  cellMuted,
  clickableRow,
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

/** "6 Apr 2026" from `@repo/ui`'s short date (three-letter months); an unreadable date shows as is. */
const shortDate = (iso: string) => formatDate(iso, { placeholder: iso });
const countFormat = new Intl.NumberFormat("en-GB");

const categoryName = (catId: string, source: TaxSource) => {
  const category = getCategoriesForSource(source).find((c) => c.id === catId);
  return category ? categoryShortLabel(category) : catId;
};

/** Income counts up, an expense down, so sorting by amount puts the biggest income first. */
const signedAmount = (r: TaxRecord) => (r.type === "income" ? recordAmount(r) : -recordAmount(r));

/**
 * A click on the row opens the record, unless it landed on a control inside the row (the name
 * button, the actions menu) or came from the menu's portal, which is not inside the row.
 */
const isRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
  const target = e.target as HTMLElement;
  if (!e.currentTarget.contains(target)) return false;
  if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return false;
  // Selecting text in a cell is not a click on the row.
  return !window.getSelection()?.toString();
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
 * button that opens it for editing, so the table works from the keyboard (E8 J-03); a click
 * anywhere else on the row does the same with a mouse. The row's menu holds Edit, View receipt
 * and Delete. Under `md` the row is the name, its category, the amount and the menu; the date and
 * source columns join from `md`. The source column and filter show only when the list has more
 * than one source. The search and type filter are always shown, and every column sorts.
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
  const [page, setPage] = useState(0);

  const inYear = useMemo(
    () =>
      records
        .filter(include ?? ((r) => isRecordActiveInTaxYear(r, taxYear)))
        // By name first, so records on the same date (or of the same amount) read A to Z.
        .sort((a, b) => a.name.localeCompare(b.name, "en-GB")),
    [records, taxYear, include],
  );
  const sources = new Set(inYear.map((r) => r.source));
  const showSource = sources.size > 1;

  const { filteredRows, query, setQuery, filterValues, setFilter, isFiltered } = useTableFilter({
    rows: inYear,
    searchText: (r) => [r.name, categoryName(r.category, r.source)],
    filters: { source: (r) => r.source, type: (r) => r.type },
  });

  const { sortedRows: filtered, getSortProps } = useTableSort({
    rows: filteredRows,
    columns: {
      name: { value: (r) => r.name },
      source: { value: (r) => SOURCE_LABEL[r.source] },
      date: { value: (r) => r.date, firstDirection: "desc" },
      amount: { value: signedAmount, firstDirection: "desc" },
    },
    initial: { key: "date", direction: "desc" },
  });

  /** A header's sort props that also go back to page 1. */
  const sortProps = (key: "name" | "source" | "date" | "amount") => {
    const props = getSortProps(key);
    return {
      ...props,
      onSort: () => {
        props.onSort();
        setPage(0);
      },
    };
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / TAX_RECORDS_PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * TAX_RECORDS_PAGE_SIZE;
  const rows = filtered.slice(start, start + TAX_RECORDS_PAGE_SIZE);

  const onFilter = (name: "source" | "type") => (value: string) => {
    setFilter(name, value);
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
      <TableToolbar
        className={filters()}
        searchLabel="Search records"
        searchPlaceholder="Filter by name or category"
        searchValue={query}
        onSearchChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
      >
        {showSource ? (
          <TableFilterSelect
            allLabel="All sources"
            label="Income source"
            options={SOURCE_OPTIONS.filter((o) => sources.has(o.value))}
            value={filterValues.source}
            onChange={onFilter("source")}
          />
        ) : null}
        <TableFilterSelect
          allLabel="Income and expenses"
          label="Type"
          options={[
            { value: "income", label: "Income" },
            { value: "expense", label: "Expenses" },
          ]}
          value={filterValues.type}
          onChange={onFilter("type")}
        />
      </TableToolbar>

      {isFiltered || pageCount > 1 ? (
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
              <Th text {...sortProps("name")}>
                Record
              </Th>
              {showSource ? (
                <Th className={wideOnly()} text {...sortProps("source")}>
                  Source
                </Th>
              ) : null}
              <Th className={wideOnly()} {...sortProps("date")}>
                Date
              </Th>
              <Th numeric {...sortProps("amount")}>
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
                {
                  id: `edit-${record.id}`,
                  label: "Edit",
                  onSelect: () => onEdit(record),
                },
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
                <tr
                  className={clickableRow()}
                  key={record.id}
                  onClick={(e) => {
                    if (isRowClick(e)) onEdit(record);
                  }}
                >
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

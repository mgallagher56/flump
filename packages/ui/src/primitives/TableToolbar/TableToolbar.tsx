import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { controlProps, FormField } from "../FormField";
import { Select } from "../Select";
import { TextInput } from "../TextInput";
import { tableSearchField, tableToolbar } from "./TableToolbar.styles";

export interface TableToolbarProps {
  /** The search text (controlled). */
  searchValue?: string;
  /** Called with the new search text. Without it, no search field is drawn. */
  onSearchChange?: (value: string) => void;
  /** The search field's visible label, naming what it searches ("Search records"). */
  searchLabel?: string;
  /** Example text inside the empty field. The label, not this, names the field. */
  searchPlaceholder?: string;
  /** Filter controls drawn after the search field (for example `Select`s in `FormField`s). */
  children?: ReactNode;
  className?: string;
}

/** The search and filter bar paired above a `<Table>`. */
export const TableToolbar: FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchLabel = "Search",
  searchPlaceholder,
  children,
  className,
}) => (
  <div className={cx(tableToolbar(), className)} data-testid="table-toolbar">
    {onSearchChange ? (
      <div className={tableSearchField()}>
        <FormField label={searchLabel}>
          {(field) => (
            <TextInput
              id={field.id}
              placeholder={searchPlaceholder}
              type="search"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </FormField>
      </div>
    ) : null}
    {children}
  </div>
);

export interface TableFilterOption {
  value: string;
  label: string;
}

export interface TableFilterSelectProps {
  /** The select's visible label, naming the category ("Type", "Account"). */
  label: string;
  /** The chosen value; "all" (`TABLE_FILTER_ALL`) for every row. */
  value: string;
  onChange: (value: string) => void;
  /** The first option, which shows every row ("All accounts"). */
  allLabel: string;
  options: readonly TableFilterOption[];
  /** A short line under the select, linked to it with `aria-describedby`. */
  hint?: string;
}

/** A category filter for a `TableToolbar`: a labelled select whose first option shows every row. */
export const TableFilterSelect: FC<TableFilterSelectProps> = ({
  label,
  value,
  onChange,
  allLabel,
  options,
  hint,
}) => (
  <FormField hint={hint} label={label}>
    {(field) => (
      <Select
        {...controlProps(field)}
        data-testid={field.id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    )}
  </FormField>
);

export default TableToolbar;

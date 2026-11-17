import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { FormField } from "../FormField";
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

export default TableToolbar;

import {
  createContext,
  type FC,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useContext,
} from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  captionRecipe,
  cellPrimary,
  cellSecondary,
  tableElement,
  tableWrapper,
  tbodyRecipe,
  tdRecipe,
  theadRecipe,
  thRecipe,
} from "./Table.styles";

/** Default `scope` for a `Th`; THead provides "col", elsewhere headers stay unscoped. */
const ThScopeContext = createContext<"col" | undefined>(undefined);

export type CellAlign = "start" | "center" | "end";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Accessible name for the table, rendered as a <caption> (visually hidden unless `showCaption`). */
  caption?: string;
  /** Draw the caption above the table instead of only exposing it to assistive tech. */
  showCaption?: boolean;
  /** Keep the header row in view while the body scrolls (the table then scrolls at 480px high). */
  stickyHeader?: boolean;
  /**
   * Under `md` each row stacks into a list of label and value pairs, labelled by the `label` prop
   * on each `Td`. Defaults to true; pass false for tables that should scroll sideways instead.
   */
  stacked?: boolean;
}

export const Table: FC<TableProps> = ({
  children,
  className,
  caption,
  showCaption = false,
  stickyHeader = false,
  stacked = true,
  ...props
}) => (
  <div
    {...(stickyHeader || !stacked
      ? // A scrollable region must be reachable by keyboard.
        { role: "region", "aria-label": caption ?? "Table", tabIndex: 0 }
      : {})}
    className={tableWrapper({ sticky: stickyHeader })}
  >
    <table className={cx(tableElement({ stacked, sticky: stickyHeader }), className)} {...props}>
      {caption ? (
        showCaption ? (
          <caption className={captionRecipe()}>{caption}</caption>
        ) : (
          <VisuallyHidden as="caption">{caption}</VisuallyHidden>
        )
      ) : null}
      {children}
    </table>
  </div>
);

export const THead: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => (
  <thead className={cx(theadRecipe(), className)} {...props}>
    <ThScopeContext.Provider value="col">{children}</ThScopeContext.Provider>
  </thead>
);

export const TBody: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => (
  <tbody className={cx(tbodyRecipe(), className)} {...props}>
    {children}
  </tbody>
);

export interface ThProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> {
  /** Right-aligns the column (shorthand for `align="end"`). */
  numeric?: boolean;
  align?: CellAlign;
}

export const Th: FC<ThProps> = ({
  children,
  numeric = false,
  align,
  className,
  scope,
  ...props
}) => {
  const defaultScope = useContext(ThScopeContext);
  return (
    <th
      className={cx(thRecipe({ align: align ?? (numeric ? "end" : "start") }), className)}
      scope={scope ?? defaultScope}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TdProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  /** Right-aligns the cell with tabular figures (shorthand for `align="end"`). Use for money, counts, dates. */
  numeric?: boolean;
  align?: CellAlign;
  /** Muted second line under the cell content, for example an account type. */
  secondary?: ReactNode;
  /** Shown beside the value when the table stacks under `md`. Match the column header text. */
  label?: string;
}

export const Td: FC<TdProps> = ({
  children,
  numeric = false,
  align,
  secondary,
  label,
  className,
  ...props
}) => (
  <td
    className={cx(tdRecipe({ align: align ?? (numeric ? "end" : "start"), numeric }), className)}
    data-label={label}
    {...props}
  >
    {secondary ? (
      <>
        <span className={cellPrimary()}>{children}</span>
        <span className={cellSecondary()}>{secondary}</span>
      </>
    ) : (
      children
    )}
  </td>
);

export default Table;

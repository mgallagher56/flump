import {
  createContext,
  type FC,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useContext,
} from "react";
import { css, cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import { tableElement, tableWrapper, tdRecipe, theadRecipe, thRecipe } from "./Table.styles";

/** Default `scope` for a `Th`; THead provides "col", elsewhere headers stay unscoped. */
const ThScopeContext = createContext<"col" | undefined>(undefined);

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Accessible name for the table, rendered as a visually hidden <caption>. */
  caption?: string;
}

export const Table: FC<TableProps> = ({ children, className, caption, ...props }) => (
  <div className={tableWrapper()}>
    <table className={cx(tableElement(), className)} {...props}>
      {caption ? <VisuallyHidden as="caption">{caption}</VisuallyHidden> : null}
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
  <tbody
    className={cx(
      css({
        "& tr:last-child td": { borderBottom: "none" },
        "& tr:hover": { backgroundColor: "surface.subtle" },
      }),
      className,
    )}
    {...props}
  >
    {children}
  </tbody>
);

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export const Th: FC<ThProps> = ({ children, numeric = false, className, scope, ...props }) => {
  const defaultScope = useContext(ThScopeContext);
  return (
    <th
      className={cx(thRecipe(), className)}
      style={{ textAlign: numeric ? "right" : "left" }}
      scope={scope ?? defaultScope}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export const Td: FC<TdProps> = ({ children, numeric = false, className, ...props }) => (
  <td
    className={cx(tdRecipe(), className)}
    style={{
      textAlign: numeric ? "right" : "left",
      fontVariantNumeric: numeric ? "tabular-nums" : undefined,
    }}
    {...props}
  >
    {children}
  </td>
);

export default Table;

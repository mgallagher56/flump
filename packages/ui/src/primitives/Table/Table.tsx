import type { FC, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { css, cx } from "../../../styled-system/css";
import { tableElement, tableWrapper, tdRecipe, theadRecipe, thRecipe } from "./Table.styles";

export const Table: FC<HTMLAttributes<HTMLTableElement>> = ({ children, className, ...props }) => (
  <div className={tableWrapper()}>
    <table className={cx(tableElement(), className)} {...props}>
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
    {children}
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

export const Th: FC<ThProps> = ({ children, numeric = false, className, ...props }) => (
  <th
    className={cx(thRecipe(), className)}
    style={{ textAlign: numeric ? "right" : "left" }}
    {...props}
  >
    {children}
  </th>
);

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

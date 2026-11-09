import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

export interface FLPTableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  stickyHeader?: boolean;
}

export const FLPTable: FC<FLPTableProps> = ({
  children,
  stickyHeader = false,
  className,
  ...props
}) => {
  const wrapperStyle = css({
    width: "100%",
    overflowX: "auto",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface",
  });

  const tableStyle = css({
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "sm",
    color: "text.primary",
  });

  return (
    <div className={wrapperStyle}>
      <table className={`${tableStyle} ${className || ""}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
};

export const FLPTHead: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  const theadStyle = css({
    backgroundColor: "surface.subtle",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  });

  return (
    <thead className={`${theadStyle} ${className || ""}`.trim()} {...props}>
      {children}
    </thead>
  );
};

export interface FLPThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  numeric?: boolean;
}

export const FLPTh: FC<FLPThProps> = ({
  children,
  align,
  numeric = false,
  className,
  ...props
}) => {
  const resolvedAlign = align ?? (numeric ? "right" : "left");
  const thStyle = css({
    padding: "12px 16px",
    fontSize: "xs",
    fontWeight: "semibold",
    color: "text.muted",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  });

  return (
    <th
      className={`${thStyle} ${className || ""}`.trim()}
      style={{ textAlign: resolvedAlign }}
      {...props}
    >
      {children}
    </th>
  );
};

export const FLPTBody: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  const tbodyStyle = css({
    "& tr": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
      transition: "background-color 0.15s ease",
      "&:last-child": {
        borderBottom: "none",
      },
      "&:hover": {
        backgroundColor: "surface.subtle",
      },
    },
  });

  return (
    <tbody className={`${tbodyStyle} ${className || ""}`.trim()} {...props}>
      {children}
    </tbody>
  );
};

export interface FLPTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  numeric?: boolean;
}

export const FLPTd: FC<FLPTdProps> = ({
  children,
  align,
  numeric = false,
  className,
  ...props
}) => {
  const resolvedAlign = align ?? (numeric ? "right" : "left");
  const tdStyle = css({
    padding: "14px 16px",
    fontSize: "sm",
    color: "text.primary",
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  });

  return (
    <td
      className={`${tdStyle} ${className || ""}`.trim()}
      style={{ textAlign: resolvedAlign }}
      {...props}
    >
      {children}
    </td>
  );
};

export default FLPTable;

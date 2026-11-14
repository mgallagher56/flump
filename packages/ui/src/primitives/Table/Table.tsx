import {
  createContext,
  type FC,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
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

// Replaced statically by the bundler (Vite, Storybook); declared here to avoid a node types dependency.
declare const process: { env: { NODE_ENV?: string } };

export type CellAlign = "start" | "center" | "end";
export type TableAppearance = "classic" | "soft";

interface TableContextValue {
  stacked: boolean;
  appearance: TableAppearance;
}

const TableContext = createContext<TableContextValue>({ stacked: false, appearance: "classic" });

/** Default `scope` for a `Th`; THead provides "col", elsewhere headers stay unscoped. */
const ThScopeContext = createContext<"col" | undefined>(undefined);
/** True inside a TBody, so a `Td` knows whether it is a body cell. */
const InBodyContext = createContext(false);

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Accessible name for the table, rendered as a <caption> (visually hidden unless `showCaption`). */
  caption?: string;
  /** Draw the caption above the table instead of only exposing it to assistive tech. */
  showCaption?: boolean;
  /**
   * `classic` (default) keeps the original bordered card with compact cells. `soft` is the
   * Direction C look: sunken rounded header row, soft dividers and roomy rows, drawn on whatever
   * panel the table sits in.
   */
  appearance?: TableAppearance;
  /** Keep the header row in view while the body scrolls (the table then scrolls at 480px high). */
  stickyHeader?: boolean;
  /**
   * Opt in to a stacked layout under `md`: each row becomes a list of label and value pairs,
   * labelled by the `label` prop on every body `Td` after the first. Use `Tr` for rows when
   * stacked, so explicit ARIA roles keep the table semantics that `display: block` can drop.
   * Default false (the table scrolls sideways instead).
   */
  stacked?: boolean;
}

/**
 * True while the element is wider than its box (the table scrolls sideways). Measured after
 * mount and on resize, so server render and first paint stay unchanged.
 */
const useOverflowsX = (ref: { current: HTMLElement | null }): boolean => {
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return overflows;
};

export const Table: FC<TableProps> = ({
  children,
  className,
  caption,
  showCaption = false,
  appearance = "classic",
  stickyHeader = false,
  stacked = false,
  ...props
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overflowsX = useOverflowsX(wrapperRef);
  // A scrollable region must be reachable by keyboard (WCAG 2.1.1, axe scrollable-region-focusable).
  const scrollable = stickyHeader || overflowsX;
  return (
    <TableContext.Provider value={{ stacked, appearance }}>
      <div
        ref={wrapperRef}
        {...(scrollable ? { role: "region", "aria-label": caption ?? "Table", tabIndex: 0 } : {})}
        className={tableWrapper({ appearance, sticky: stickyHeader })}
      >
        <table
          className={cx(tableElement({ appearance, stacked, sticky: stickyHeader }), className)}
          role={stacked ? "table" : undefined}
          {...props}
        >
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
    </TableContext.Provider>
  );
};

export const THead: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  const { stacked } = useContext(TableContext);
  return (
    <thead
      className={cx(theadRecipe(), className)}
      role={stacked ? "rowgroup" : undefined}
      {...props}
    >
      <ThScopeContext.Provider value="col">{children}</ThScopeContext.Provider>
    </thead>
  );
};

export const TBody: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  const { stacked } = useContext(TableContext);
  return (
    <tbody
      className={cx(tbodyRecipe(), className)}
      role={stacked ? "rowgroup" : undefined}
      {...props}
    >
      <InBodyContext.Provider value={true}>{children}</InBodyContext.Provider>
    </tbody>
  );
};

/** A table row. Prefer it over a bare `<tr>` in stacked tables: it adds `role="row"` there. */
export const Tr: FC<HTMLAttributes<HTMLTableRowElement>> = ({ children, ...props }) => {
  const { stacked } = useContext(TableContext);
  return (
    <tr role={stacked ? "row" : undefined} {...props}>
      {children}
    </tr>
  );
};

export interface ThProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> {
  /** Right-aligns the column (shorthand for `align="end"`). */
  numeric?: boolean;
  /** Logical alignment. Native `left`/`right` are not accepted: use `start`/`end`. */
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
  const { stacked, appearance } = useContext(TableContext);
  const resolvedScope = scope ?? defaultScope;
  return (
    <th
      className={cx(
        thRecipe({ align: align ?? (numeric ? "end" : "start"), appearance }),
        className,
      )}
      role={stacked ? (resolvedScope === "row" ? "rowheader" : "columnheader") : undefined}
      scope={resolvedScope}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TdProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> {
  /** Right-aligns the cell with tabular figures (shorthand for `align="end"`). Use for money, counts, dates. */
  numeric?: boolean;
  /** Logical alignment. Native `left`/`right` are not accepted: use `start`/`end`. */
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
}) => {
  const { stacked, appearance } = useContext(TableContext);
  const inBody = useContext(InBodyContext);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      stacked &&
      inBody &&
      !label &&
      ref.current?.previousElementSibling
    ) {
      console.warn(
        "Table: a body Td other than the first has no `label`, so it will have no name when the table stacks under md.",
      );
    }
  }, [stacked, inBody, label]);

  return (
    <td
      className={cx(
        tdRecipe({ align: align ?? (numeric ? "end" : "start"), appearance, numeric }),
        className,
      )}
      data-label={label}
      ref={ref}
      role={stacked ? "cell" : undefined}
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
};

export default Table;

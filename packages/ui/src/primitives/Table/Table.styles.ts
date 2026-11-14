import { cva } from "../../../styled-system/css";

/**
 * Scroll container. `classic` is the original bordered card; `soft` is the Direction C look and
 * leaves the surface to the parent panel. With `sticky` it gets a height cap so the header row
 * has something to stick to.
 */
export const tableWrapper = cva({
  base: {
    width: "100%",
    overflowX: "auto",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    appearance: {
      classic: {
        borderRadius: "xl",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "border",
        backgroundColor: "surface.card",
      },
      soft: {},
    },
    sticky: {
      true: { overflowY: "auto", maxHeight: "480px" },
      false: {},
    },
  },
  defaultVariants: { appearance: "classic", sticky: false },
});

/** Stacked below `md`: every row becomes a card-like list of label and value pairs. */
const stackedBelowMd = {
  "& thead": {
    // Kept for assistive tech, hidden visually while stacked (each cell carries its own label).
    position: { base: "absolute", md: "static" },
    width: { base: "1px", md: "auto" },
    height: { base: "1px", md: "auto" },
    overflow: { base: "hidden", md: "visible" },
    clipPath: { base: "inset(50%)", md: "none" },
  },
  "& tbody tr": {
    display: { base: "block", md: "table-row" },
    paddingBlock: { base: "12px", md: "0" },
    paddingInline: { base: "14px", md: "0" },
    borderBottomWidth: { base: "1px", md: "0" },
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
  "& tbody tr:last-child": { borderBottomWidth: "0" },
  "& tbody td, & tbody th": {
    display: { base: "flex", md: "table-cell" },
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: { base: "16px", md: "0" },
    borderBottomWidth: { base: "0", md: "1px" },
    paddingBlock: { base: "6px", md: "var(--table-cell-py)" },
    paddingInline: { base: "0", md: "var(--table-cell-px)" },
    whiteSpace: { base: "normal", md: "nowrap" },
  },
  "& tbody td[data-label]::before": {
    content: "attr(data-label)",
    flex: "none",
    color: "text.muted",
    fontWeight: "medium",
    textAlign: "start",
    display: { base: "block", md: "none" },
  },
  // The first, unlabelled cell of a stacked row acts as the row title.
  "& tbody td:not([data-label]), & tbody th": {
    display: { base: "block", md: "table-cell" },
    paddingBlockEnd: { base: "8px", md: "var(--table-cell-py)" },
  },
} as const;

export const tableElement = cva({
  base: {
    width: "100%",
    textAlign: "start",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
  variants: {
    appearance: {
      classic: {
        borderCollapse: "collapse",
        fontSize: "xs",
        "--table-cell-py": "12px",
        "--table-cell-px": "14px",
        "& thead": {
          backgroundColor: "surface.subtle",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: "border.subtle",
        },
        "& thead th": { color: "text.muted" },
      },
      soft: {
        borderCollapse: "separate",
        borderSpacing: "0",
        fontSize: "sm",
        "--table-cell-py": "16px",
        "--table-cell-px": "16px",
        "& thead th": {
          backgroundColor: "surface.sunken",
          color: "text.secondary",
        },
        "& thead th:first-of-type": { borderStartStartRadius: "lg", borderEndStartRadius: "lg" },
        "& thead th:last-of-type": { borderStartEndRadius: "lg", borderEndEndRadius: "lg" },
      },
    },
    stacked: {
      true: stackedBelowMd,
      false: {},
    },
    sticky: {
      true: {
        "& thead th": { position: "sticky", top: "0", zIndex: "1" },
      },
      false: {},
    },
  },
  defaultVariants: { appearance: "classic", stacked: false, sticky: false },
});

/** A caption that is read out by default and drawn only when asked for. */
export const captionRecipe = cva({
  base: {
    textAlign: "start",
    paddingBlockEnd: "12px",
    color: "text.secondary",
    fontSize: "sm",
    fontWeight: "medium",
  },
});

export const theadRecipe = cva({
  base: {},
});

export const tbodyRecipe = cva({
  base: {
    "& tr:hover": { backgroundColor: "surface.subtle" },
    // Row headers (`<Th scope="row">`) carry the same divider as `Td`, so it spans the whole row.
    "& th": {
      borderBottomWidth: "1px",
      borderBottomStyle: "solid",
      borderBottomColor: "border.subtle",
    },
    "& tr:last-child td, & tr:last-child th": { borderBottomWidth: "0" },
  },
});

const alignVariants = {
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
} as const;

export const thRecipe = cva({
  base: {
    paddingInline: "var(--table-cell-px)",
    fontWeight: "semibold",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
  },
  variants: {
    align: alignVariants,
    appearance: {
      classic: { paddingBlock: "10px" },
      soft: { paddingBlock: "12px" },
    },
  },
  defaultVariants: { align: "start", appearance: "classic" },
});

export const tdRecipe = cva({
  base: {
    paddingBlock: "var(--table-cell-py)",
    paddingInline: "var(--table-cell-px)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    verticalAlign: "middle",
  },
  variants: {
    align: alignVariants,
    appearance: {
      classic: { whiteSpace: "nowrap" },
      soft: {},
    },
    numeric: { true: { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }, false: {} },
  },
  defaultVariants: { align: "start", appearance: "classic", numeric: false },
});

export const cellPrimary = cva({
  base: { color: "text.primary", fontWeight: "medium" },
});

/** The muted second line of a two-line cell. */
export const cellSecondary = cva({
  base: { display: "block", marginBlockStart: "2px", color: "text.muted", fontWeight: "normal" },
});

import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const filters = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(3, minmax(0, 1fr))",
    },
    gap: "3",
    alignItems: "end",
  },
});

export const summary = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const nameButton = cva({
  base: {
    display: "inline",
    padding: 0,
    border: "none",
    background: "none",
    color: "text.primary",
    textStyle: "body.md",
    fontWeight: "medium",
    textAlign: "left",
    cursor: "pointer",
    textDecoration: "underline",
    textDecorationColor: "border.strong",
    textUnderlineOffset: "3px",
    _hover: { color: "primary", textDecorationColor: "primary" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
      borderRadius: "sm",
    },
  },
});

export const secondaryLine = cva({
  base: {
    display: "block",
    textStyle: "body.sm",
    color: "text.muted",
  },
});

/** A date inside a word cell (the `text` cell sets plain figures), so it keeps tabular ones. */
export const dateFigures = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

/** Muted cells take figures from the table: tabular by default, plain on a `text` cell. */
export const cellMuted = cva({
  base: { color: "text.secondary", whiteSpace: "nowrap" },
});

/** Columns that join the row from `md`: under it a row is the name, the amount and the menu. */
export const wideOnly = cva({
  base: { display: { base: "none", md: "table-cell" } },
});

/** The amount, then how often it is paid ("£1,500 a month"). */
export const amountCell = cva({
  base: {
    display: "inline-flex",
    // Under `md` "a month" goes under the amount, so the row keeps room for its menu.
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "flex-end", md: "baseline" },
    gap: { base: "0", md: "1" },
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
});

export const amountUnit = cva({
  base: { textStyle: "body.sm", color: "text.muted" },
});

/** A row a mouse can click anywhere to open the record; the name button is the keyboard way in. */
export const clickableRow = cva({
  base: {
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle" },
  },
});

export const pager = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const pagerButtons = cva({
  base: { display: "inline-flex", gap: "2" },
});

/** The actions column's heading is for screen readers: the menu button names itself. */
export const visuallyHidden = cva({
  base: { srOnly: true },
});

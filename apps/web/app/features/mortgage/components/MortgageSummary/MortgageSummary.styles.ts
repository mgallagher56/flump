import { cva } from "@repo/ui/styled-system/css";

export const summaryCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const summaryActions = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const saveMessage = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const savedLine = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    margin: 0,
  },
});

export const detailsList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
    gap: "12px 24px",
    margin: 0,
  },
});

export const detailRow = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const detailLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const detailValue = cva({
  base: {
    textStyle: "body.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
    overflowWrap: "anywhere",
  },
});

export const detailSubline = cva({
  base: {
    display: "block",
    textStyle: "label.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * RC-11 (P62): below `sm` the header's Edit action goes on its own line under the title and
 * description, so the description keeps the row's width instead of three words a line. The
 * header is the section's first child (tile, text, action); from `sm` it is one row again.
 */
export const stackedHeaderSection = cva({
  base: {
    "& > [id$='-header']": { flexWrap: { base: "wrap", sm: "nowrap" } },
    "& > [id$='-header'] > :nth-child(2)": { flexBasis: { base: "0", sm: "auto" } },
    "& > [id$='-header'] > :nth-child(3)": {
      flexBasis: { base: "100%", sm: "auto" },
      alignSelf: { base: "flex-start", sm: "center" },
    },
  },
});

import { cva } from "@repo/ui/styled-system/css";

/** Saved facts sit on the plain card with the default border, never on the hero. */
export const detailsCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    borderColor: "border",
  },
});

export const detailsHeader = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const detailsTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const stateLine = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    margin: "4px 0 0",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const factList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "16px",
    margin: "20px 0 0",
  },
});

export const fact = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const factLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const factValue = cva({
  base: {
    textStyle: "body.md",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
    overflowWrap: "anywhere",
  },
});

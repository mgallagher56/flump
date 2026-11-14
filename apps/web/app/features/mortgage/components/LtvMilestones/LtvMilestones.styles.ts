import { cva } from "@repo/ui/styled-system/css";

/** Drawer content: no card chrome of its own (E16 PR 6). */
export const ltvBody = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const ltvHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: "8px",
  },
});

export const ltvEyebrow = cva({
  base: { textStyle: "label.sm", color: "text.muted", margin: 0 },
});

export const ltvHeading = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    marginTop: "2px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const ltvShare = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const tierGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    gap: "12px",
  },
});

export const tierCard = cva({
  base: {
    py: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const tierTop = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    flexWrap: "wrap",
  },
});

export const tierTitle = cva({
  base: { textStyle: "label.md", color: "text.primary" },
});

export const tierState = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const tierBody = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});
